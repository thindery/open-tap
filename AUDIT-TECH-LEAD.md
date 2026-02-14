# aitap Code Audit & Architecture Proposal

**Tech Lead Review** | 2026-02-13  
**Scope:** Security, simplification, desktop architecture, testing

---

## 🔴 1. CODE AUDIT FINDINGS

### Security Issues

| Severity | Issue | Location | Impact |
|----------|-------|----------|--------|
| **HIGH** | No message encryption | All transports | Messages in plaintext over network |
| **HIGH** | GUID-derived auth only | auth.js | SHA256(challenge) is replayable, no PKI |
| **MEDIUM** | CORS wildcard | meetingpoint/server.js | Any site can connect to meeting point |
| **MEDIUM** | No rate limiting | minirelay.js, meetingpoint/server.js | DoS via connection spam |
| **MEDIUM** | Identity file permissions | identity.js | ~/.aitap-id created without mode restrictions |
| **LOW** | Timing attack vector | auth.js | SHA256 comparison not timing-safe |
| **LOW** | No message size limits | All message handlers | Memory exhaustion possible |

**Auth Vulnerability Detail:**
```javascript
// auth.js L65 - Vulnerable pattern
const expected = this._generateResponse(pending.challenge, peerGuid);
if (response !== expected) { ... }  // === is timing-safe BUT...
// _generateResponse uses SHA256 without HMAC, no replay protection
```

### Error Handling Gaps

| Component | Gap | Risk |
|-----------|-----|------|
| `p2p-client.js` | Silent try/catch swallow parse errors | Silent message loss |
| `discovery.js` | mDNS failure falls back silently | User thinks discovery works |
| `index.js` | SIGINT handler duplicates cleanup | Double-close exceptions |
| `minirelay.js` | EADDRINUSE not auto-retry | User confusion on restart |
| `guid.js` | Dual-stack (IPv6) not handled | Connection failures on modern networks |

### Race Conditions

```javascript
// p2p-client.js L180-200 - CRITICAL
// Both peers can auth simultaneously causing:
// 1. Challenge/response collision
// 2. Duplicate connections map entries
// 3. Auth timeout leaks

// Race scenario:
// Peer A                    | Peer B
// --------------------------|--------------------------
// send auth:challenge       |
//                         | send auth:challenge
//                         | receive A's challenge
// receives B's challenge  | (confusion: which is response?)
// handler collision!      |
```

**Fix:** Add `initiator` boolean to auth handshake; only responder processes challenge.

### Memory Leaks

```javascript
// rendezvous-client.js L84 - Timer leak
scheduleReconnect() {
  if (this.reconnectTimer) return;  // Guard exists...
  this.reconnectTimer = setTimeout(...);  // But no clear on manual disconnect()
}

// p2p-client.js - Map growth
this.connections = new Map();  // Only deleted on explicit close, not on natural close

// discovery.js - Stale peer accumulation
this.discoveredPeers = new Map();  // cleanupStalePeers called but never prunes old entries properly
```

### Confusing Abstractions

| Problem | Current State | Issue |
|---------|---------------|-------|
| **Dual identity systems** | identity.js (UUID) vs guid.js (composite) | Incompatible formats, identity.js unused in P2P |
| **Connection duality** | P2PClient.connections + MiniRelay.peers | Incoming vs outgoing tracked separately |
| **Three CLIs** | index.js, p2p.js, host.js | Divergent code paths, host.js doesn't use P2PClient |
| **Auth split** | AuthManager (outgoing) vs MiniRelay (incoming) | Same protocol, two implementations |
| **Discovery vs Connection** | discoverPeer() doesn't auto-connect | Manual step required |
| **MeetingPoint naming** | meetingpoint/ but RendezvousClient | Inconsistent terminology |

---

## 🟢 2. SIMPLIFICATION PROPOSAL

### Target: True 1-Command Flow

```bash
# After: npm install -g @thindery/aitap
aitap
```

**Behavior:**
1. **First run:** Generate Badge, show welcome, save to `~/.aitap/`
2. **Start P2P node** (auto-port selection)
3. **Wait 5s for mDNS** peers
4. **If no peers:** Interactive prompt → "Connect to meeting point?"
5. **Drop to chat UI** with peer list visible

### Proposed Simplified Architecture

```
aitap
├── index.js (single entry)
│   ├── config.js (Badge, prefs in ~/.aitap/)
│   ├── daemon.js (background P2P node - always runs)
│   ├── discovery.js (mDNS + Meeting Point)
│   ├── shell.js (interactive command interface)
│   └── commands/
│       ├── chat.js
│       ├── peers.js
│       └── quit.js
```

### Can Meeting Point be Embedded?

**YES** - Proposed unified entry:

```javascript
// New: src/daemon.js
class AitapDaemon {
  constructor() {
    this.p2p = new P2PService();      // P2P node (always)
    this.meetingpoint = null;         // Embedded MP (optional)
    this.rendezvous = null;           // Client to external MP (optional)
  }

  async start() {
    await this.p2p.start();  // Always
    
    // Auto-discover via mDNS
    const localPeers = await this.p2p.discoverLocal({ timeout: 5000 });
    
    if (localPeers.length === 0) {
      // No local peers - suggest options
      return { mode: 'lonely', myBadge: this.p2p.badge };
    }
    
    return { mode: 'connected', peers: localPeers };
  }
  
  async enableMeetingPoint(port = 0) {
    // Start embedded meeting point
    const MeetingPoint = require('./meetingpoint');
    this.meetingpoint = new MeetingPoint(port);
    return this.meetingpoint.start();
  }
  
  async connectToMeetingPoint(url) {
    // Connect to external meeting point
    this.rendezvous = new RendezvousClient(url, this.p2p.badge);
    return this.rendezvous.connect();
  }
}
```

### Minimal API Surface

```javascript
// Public API (for CLI and Desktop app)
class Aitap {
  // Lifecycle
  static async create(configPath?): Aitap
  async start(): Promise<void>
  async stop(): Promise<void>
  
  // Identity
  get badge(): string
  
  // Discovery (automatic)
  get peers(): Peer[]
  
  // Messaging
  async chat(peerBadge: string): Promise<ChatSession>
  send(message: string): void
  
  // Events
  on(event: 'message' | 'peer:online' | 'peer:offline', handler: Function): void
}

interface Peer {
  badge: string
  endpoint: string
  status: 'discovered' | 'connecting' | 'ready'
  lastSeen: Date
}

interface ChatSession {
  peer: Peer
  send(text: string): void
  onMessage(handler: (msg: Message) => void): void
  close(): void
}
```

### Suggested File Consolidation

| Current | New | Reason |
|---------|-----|--------|
| index.js + p2p.js + host.js | src/cli.js | Single CLI entry |
| client.js | src/transports/relay.js | Relay transport only |
| p2p-client.js + discovery.js | src/daemon.js | Unified P2P service |
| minirelay.js | src/transports/p2p-server.js | Clear naming |
| meetingpoint/server.js | src/meetingpoint/index.js | Embeddable |
| auth.js | src/crypto/auth.js | Consolidate crypto |
| guid.js + identity.js | src/identity/index.js | Single identity system |

---

## 🖥️ 3. DESKTOP APP DESIGN

### Comparison: Electron vs Tauri

| Factor | Electron | Tauri | Recommendation |
|--------|----------|-------|----------------|
| **Bundle size** | ~150MB | ~5MB | Tauri (15x smaller) |
| **Memory** | ~150MB base | ~15MB base | Tauri (10x lighter) |
| **Security** | Large attack surface (Chromium) | Rust + minimal webview | Tauri |
| **Native API** | Node.js full access | Rust bridges | Electron (simpler for TS team) |
| **Build time** | Slow | Fast | Tauri |
| **Installer** | 150MB DMG/EXE | 5MB DMG/EXE | Tauri |

**Decision: Tauri** - The size difference is compelling for a simple menu bar app. Rust bridge overhead is manageable.

### Recommended Architecture: Tauri + React

```
desktop/
├── src-tauri/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs          # Tauri entry, tray
│   │   └── daemon_bridge.rs # Spawns Node.js daemon
│   └── icons/
├── src/
│   ├── components/
│   │   ├── PeerList.tsx     # Online peers with status
│   │   ├── ChatView.tsx     # Message history
│   │   └── BadgeDisplay.tsx # My badge + QR
│   └── App.tsx
└── package.json
```

### Tray Menu Structure

```
🦞 [Badge icon with status dot]
├── My Badge: [short-id]...
├── Online Peers
│   ├── [🟢] alice@home
│   ├── [🟡] bob@office (away)
│   └── [🔘] No more peers... [Search option]
├── Recent Chats
│   ├── [🟢] alice@home (2)
│   └── [⚪️] bob@office
├── ─────────────
├── [💬] Open Terminal
└── [⏏️] Quit aitap
```

### Desktop + CLI Compatibility

```javascript
// daemon.js - Both modes share this
const singleInstance = require('single-instance');

class AitapDaemon {
  async start() {
    // Check if daemon already running
    const lock = singleInstance('aitap-daemon');
    if (!await lock.lock()) {
      // Connect to existing daemon via IPC
      return this.connectToExisting();
    }
    
    // Start new daemon (shared between CLI and Desktop)
    this.p2p = new P2PService();
    this.ipcServer = new IPCServer(); // For CLI connections
    await this.p2p.start();
  }
}

// CLI mode: aitap command connects to daemon if running
// Desktop mode: Tray spawns daemon on launch
```

### Bundling Strategy

**macOS DMG:**
```bash
# Tauri builds
yarn tauri build
# Output: src-tauri/target/release/bundle/dmg/aitap_0.0.1.dmg (5MB)

# Contains:
# - aitap.app (Tauri + WebView)
# - Embedded Node.js runtime (via napi-rs for daemon)
```

**Windows EXE:**
```bash
# Same build produces .msi
# Output: src-tauri/target/release/bundle/msi/aitap_0.0.1.msi
```

**Linux:**
```bash
# .AppImage and .deb
```

### Ollama Comparison Table

| Feature | Ollama | Target aitap |
|---------|--------|--------------|
| Install | Download .dmg/.exe | Same |
| First launch | Menu bar icon with status | Same |
| CLI | `ollama run model` | `aitap` |
| UI | None (CLI only) | `aitap --ui` |
| Background | Daemon auto-starts | Same |
| Peers | N/A | Auto-discover |
| Chat | Terminal output | Terminal + Desktop |

---

## 🧪 4. TESTING STRATEGY

### Test Pyramid for aitap

```
    /\
   /  \     E2E (1 test)
  /____\    Full network, real mDNS
  /    \
 / E2E  \   Integration (5 tests)
/________\   Multi-node, loopback only
  /    \
 / Unit \    Unit tests (20+ tests)
/________\   Core logic, mocked I/O
```

### Test Framework: Vitest

**Why:** Fast, TypeScript-native, excellent WebSocket mocking.

```bash
npm install -D vitest @vitest/coverage-v8
```

### Unit Test Examples

```javascript
// tests/unit/guid.test.js
import { describe, it, expect } from 'vitest';
import { createGUID, parseGUID } from '../../src/identity/guid.js';

describe('GUID', () => {
  it('creates valid GUID with all components', () => {
    const guid = createGUID(3000, '192.168.1.5');
    const parsed = parseGUID(guid);
    
    expect(parsed.valid).toBe(true);
    expect(parsed.port).toBe(3000);
    expect(parsed.ip).toBe('192.168.1.5');
  });
  
  it('rejects malformed GUIDs', () => {
    const result = parseGUID('not-a-guid');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
  
  it('handles IPv4 edge cases', () => {
    // IP with dashes (rare but possible in hostname context)
    const tricky = 'abc-def-ghi-192-168-1-5-8080-pubkey123';
    const parsed = parseGUID(tricky);
    // Should reconstruct IP properly
  });
});

// tests/unit/auth.test.js
import { AuthManager } from '../../src/crypto/auth.js';

describe('AuthManager', () => {
  it('completes handshake successfully', async () => {
    const alice = new AuthManager('alice-badge');
    const bob = new AuthManager('bob-badge');
    
    // Mock WebSocket pair
    const { ws1, ws2 } = createMockWebSocketPair();
    
    const [aliceResult, bobResult] = await Promise.all([
      alice.authenticate(ws1, 'bob-badge'),
      bob.handleIncomingAuth(ws2, 'alice-badge')
    ]);
    
    expect(aliceResult.success).toBe(true);
    expect(bobResult.success).toBe(true);
    expect(alice.isAuthenticated('bob-badge')).toBe(true);
  });
  
  it('rejects invalid challenge response', async () => {
    const alice = new AuthManager('alice-badge');
    const bob = new AuthManager('bob-badge');
    
    // Tamper with response
    const { ws1, ws2 } = createMockWebSocketPair();
    bob._generateResponse = () => 'wrong-response';
    
    await expect(alice.authenticate(ws1, 'bob-badge'))
      .rejects.toThrow('Invalid response');
  });
});
```

### Integration Test Example

```javascript
// tests/integration/p2p-messaging.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnNode } from './helpers/node-spawner.js';

describe('P2P Message Flow', () => {
  let nodeA, nodeB;
  
  beforeAll(async () => {
    // Spin up two nodes on loopback
    nodeA = await spawnNode({ port: 0 }); // auto-assign
    nodeB = await spawnNode({ port: 0 });
    
    // Manually connect B to A
    await nodeB.addPeer(nodeA.getBadge(), `127.0.0.1:${nodeA.port}`);
    await nodeB.authenticate(nodeA.getBadge());
  }, 10000);
  
  afterAll(() => {
    nodeA.stop();
    nodeB.stop();
  });
  
  it('delivers messages between connected peers', async () => {
    const received = new Promise((resolve) => {
      nodeA.on('message', resolve);
    });
    
    nodeB.send(nodeA.getBadge(), 'Hello from B');
    
    const msg = await received;
    expect(msg.from).toBe(nodeB.getBadge());
    expect(msg.payload).toBe('Hello from B');
  });
  
  it('supports reply after initial message', async () => {
    // B sends to A
    nodeB.send(nodeA.getBadge(), 'First message');
    await new Promise(r => setTimeout(r, 100));
    
    // A replies
    const reply = new Promise((resolve) => {
      nodeB.on('message', resolve);
    });
    
    nodeA.reply('Reply from A');
    
    const msg = await reply;
    expect(msg.payload).toBe('Reply from A');
  });
  
  it('handles disconnection gracefully', async () => {
    nodeA.stop();
    
    // B should detect disconnect
    await new Promise((resolve) => {
      nodeB.on('peer:disconnected', resolve);
    });
    
    const peers = nodeB.getPeers();
    expect(peers.every(p => p.status === 'offline')).toBe(true);
  });
});
```

### E2E Test Example

```javascript
// tests/e2e/network-discovery.test.js
import { describe, it, expect } from 'vitest';
import execa from 'execa';

describe('Network Discovery', () => {
  it('discovers peers on same WiFi via mDNS', async () => {
    // This test requires two actual processes
    // Skip in CI, run locally only
    if (process.env.CI) return;
    
    const proc1 = execa('node', ['./src/cli.js', '--p2p'], { env: { ...process.env, DEBUG: '1' } });
    const proc2 = execa('node', ['./src/cli.js', '--p2p'], { env: { ...process.env, DEBUG: '1' } });
    
    // Wait for startup
    await new Promise(r => setTimeout(r, 3000));
    
    // Send /peers command to both
    proc1.stdin.write('/peers\n');
    proc2.stdin.write('/peers\n');
    
    // Capture output
    let output1 = '';
    proc1.stdout.on('data', d => output1 += d);
    
    // Wait for discovery
    await new Promise(r => setTimeout(r, 10000));
    
    // Each should see the other
    expect(output1).toContain('discovered');
    
    proc1.kill();
    proc2.kill();
  }, 20000);
});
```

### Test Commands

```json
// package.json additions
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=basic"
  }
}
```

### CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:ci
      # E2E tests excluded from CI (requires network)
      - run: npm run test:unit
      - run: npm run test:integration
```

---

## 📋 PRIORITY RECOMMENDATIONS

### Immediate (Before Alpha)

1. **Fix auth race condition** - Add initiator flag (2 hours)
2. **Consolidate identity** - Remove identity.js, use guid.js everywhere (4 hours)
3. **Add message size limits** - 1MB max payload (1 hour)
4. **Fix CORS** - Restrict meeting point origins (1 hour)
5. **Add rate limiting** - 10 auth/minute per IP (2 hours)

### Short-term (Before Beta)

1. **Implement unified daemon** - Single entry point (16 hours)
2. **Add encryption** - Noise protocol or libsodium (24 hours)
3. **Build test suite** - Unit + Integration (16 hours)
4. **Tauri Desktop PoC** - Menu bar + daemon bridge (8 hours)

### Long-term (Before 1.0)

1. **Full desktop app** - Tauri + React (40 hours)
2. **Mobile app** - React Native sharing daemon (80 hours)
3. **Audit by third-party** - Security review (external)

---

## 🎯 SUCCESS CRITERIA

**For Ollama-level simplicity:**

- [ ] `npm install -g @thindery/aitap && aitap` Just Works™
- [ ] No config files for basic usage
- [ ] Auto-discovers peers on same WiFi in < 10s
- [ ] Falls back to guided meeting point connection
- [ ] Desktop app shows status in menu bar
- [ ] CLI and Desktop app share same daemon
- [ ] 100% test coverage on crypto/auth
- [ ] Integration tests run in CI

---

*Review by: Tech Lead*  
*Date: 2026-02-13*  
*Status: Ready for implementation planning*
