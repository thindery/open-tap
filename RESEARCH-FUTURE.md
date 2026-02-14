# aitap Future Research & Continuous Improvement Roadmap

> _Generated for v0.0.2 — Aim: 1% better every day_

---

## 1. Competitive Analysis

### Comparison Table

| Project | Primary Use Case | Discovery | Message Reliability | Node Identity | Mobile Support | Ease of Use |
|---------|------------------|-----------|---------------------|---------------|----------------|-------------|
| **aitap** | AI agent messaging | mDNS + Meeting Point | Basic (best-effort) | Ed25519 keys | Planned | ⭐⭐⭐⭐⭐ Simple JS |
| **libp2p** | General P2P networking | Multiple (DHT, mDNS, etc.) | PubSub (gossipsub) | PeerID (multihash) | Yes (JS, Go, Rust) | ⭐⭐⭐ Complex API |
| **NKN** | Decentralized networking | Public key based | Relayed, reliable | Wallet addresses | Yes (SDKs) | ⭐⭐⭐⭐ Wallet required |
| **gun.js** | Decentralized database | WebRTC + DHT | Eventual consistency | User.accounts | Yes | ⭐⭐⭐⭐ Graph API learning curve |
| **simple-peer** | WebRTC wrapper | Manual signaling | WebRTC data channels | None (manual) | Yes (browser) | ⭐⭐⭐⭐ Simple but low-level |

### Detailed Analysis

#### 1.1 libp2p (IPFS Networking Layer)

**Strengths:**
- Battle-tested in production (IPFS has 100k+ nodes)
- Pluggable transport (TCP, WebSocket, WebRTC, QUIC)
- Multiple discovery mechanisms (DHT, mDNS, bootstrap nodes)
- Content addressing via CIDs
- Excellent Go/Rust/JS ecosystem
- GossipSub for scalable pub/sub

**Weaknesses:**
- Complex API surface — "do anything" means "learn everything"
- Heavy bundle size for browser use (~500KB+)
- Overkill for simple agent-to-agent messaging
- NAT traversal requires relay servers

**What aitap can learn:**
- Adopt their modular transport approach
- Consider DHT for global discovery
- Study their gossip protocol for group chats

#### 1.2 NKN (New Kind of Network)

**Strengths:**
- True decentralization with economic incentives
- NAT traversal "just works" via relay nodes
- Focus on "decentralized communication"
- Good mobile SDK support
- Wallet-based identity (familiar to crypto users)

**Weaknesses:**
- Token/NFT requirements alienate pure devs
- Slower than direct P2P for local networks
- Wallet management overhead
- "Blockchain" perception deters some users

**What aitap can learn:**
- NAT hole punching strategies
- Incentivized relay network design
- Clean SDK patterns

#### 1.3 gun.js

**Strengths:**
- Graph database approach (queries, relations)
- Automatic data sync between peers
- Offline-first by design
- Small bundle size (~10KB)
- No blockchain or tokens

**Weaknesses:**
- Eventually consistent (hard for "inbox" semantics)
- Graph API unfamiliar to many developers
- Security model requires understanding
- Query performance at scale unclear

**What aitap can learn:**
- Offline-first message queuing
- Graph data model for agent relationships
- Simple browser inclusion (<script> tag)

#### 1.4 simple-peer

**Strengths:**
- Minimal abstraction over WebRTC
- Clean Promise-based API
- Good documentation
- Handles the worst of WebRTC signaling

**Weaknesses:**
- No built-in discovery — bring your own signaling
- Just WebRTC — no other transports
- Manual peer management
- No higher-level protocols

**What aitap can learn:**
- WebRTC integration patterns
- Clean API design principles

### Competitive Position

aitap's **advantages**:
- AI-native design (message format, agent identity)
- Multi-transport from day one (not just WebRTC)
- No blockchain/token complexity
- Simpler than libp2p, more complete than simple-peer
- Zero-config local network (mDNS)

aitap's **gaps**:
- No global discovery (libp2p DHT, NKN network)
- No message reliability guarantees
- No mobile SDK
- Single developer vs established ecosystems
- No economic incentives for relay nodes

---

## 2. Gap Analysis: Missing Features

### Table Stakes (Must Have)

| Feature | Impact | Effort | Priority | Notes |
|---------|--------|--------|----------|-------|
| **Group Chat / Rooms** | 🔥🔥🔥 High | Medium | P1 | Multicast messages to N peers. Core value prop. |
| **Message Persistence** | 🔥🔥🔥 High | Medium | P1 | Offline queue + replay. Essential for reliability. |
| **Message Acknowledgments** | 🔥🔥🔥 High | Low | P1 | Delivery receipts. Low-effort, high-trust. |
| **Encrypted Group Keys** | 🔥🔥 Medium | Medium | P1 | Forward secrecy for groups. |

### Differentiation (Should Have)

| Feature | Impact | Effort | Priority | Notes |
|---------|--------|--------|----------|-------|
| **Browser Support / WebRTC** | 🔥🔥🔥 High | High | P2 | Enables browser-based agents. Big unlock. |
| **File Transfer** | 🔥🔥 Medium | Medium | P2 | Binary payload support. Expected feature. |
| **Relay Network Discovery** | 🔥🔥 Medium | Medium | P2 | DHT or similar for finding peers globally. |
| **Agent Directory / Registry** | 🔥🔥 Medium | High | P2 | Public agent discovery like npm for bots. |
| **Reply Threads** | 🔥🔥 Medium | Low | P2 | Message threading. UX improvement. |

### Nice to Have (Could Have)

| Feature | Impact | Effort | Priority | Notes |
|---------|--------|--------|----------|-------|
| **Voice/Audio Messages** | 🔥 Low | Medium | P3 | TTS → audio messages. Fun but not core. |
| **Plugin System** | 🔥 Low | High | P3 | Extensible message handlers. |
| **Metrics Dashboard** | 🔥 Low | Low | P3 | P2P network health visualization. |
| **Message Reactions** | 🔥 Low | Low | P3 | Emoji reactions. Social feature. |
| **Scheduled Messages** | 🔥 Low | Low | P3 | Send later functionality. |
| **Message Search** | 🔥 Low | Medium | P3 | Indexed search across history. |

---

## 3. 30-Day Improvement Roadmap

### Philosophy
- **1% better every day** ≈ 1 small meaningful change per day
- Ship daily when possible, weekly sprints when needed
- Each item should be <4 hours of focused work

### Week 1: Foundations

| Day | Task | Result | Effort |
|-----|------|--------|--------|
| 1 | Add message acknowledgment (ACK) frame type | Delivery receipts work | 2h |
| 2 | Implement message retry with exponential backoff | Failed sends auto-retry | 3h |
| 3 | Add message timestamps (sent/received) | Temporal ordering | 1h |
| 4 | Create message ID format (UUIDv7 for time-sortable) | Unique IDs with ordering | 2h |
| 5 | Add message deduplication (by ID) | No duplicate messages | 2h |
| 6 | Implement offline message queue | Messages sent when peer back online | 4h |
| 7 | **Ship v0.0.3** — "Reliable Messaging" | Release notes, tag | 2h |

### Week 2: Developer Experience

| Day | Task | Result | Effort |
|-----|------|--------|--------|
| 8 | Add TypeScript declarations | Full type support | 3h |
| 9 | Create example: chat-bot.js | Working example | 2h |
| 10 | Create example: bridge-bot.js (Discord integration) | Cross-platform demo | 3h |
| 11 | Add debug logging toggle | `DEBUG=aitap:*` works | 1h |
| 12 | Improve error messages | Clear failure reasons | 2h |
| 13 | Add connection state events (`connected`, `disconnected`) | Better lifecycle hooks | 2h |
| 14 | **Ship v0.0.4** — "Developer Friendly" | Release notes, tag | 2h |

### Week 3: Group Chat MVP

| Day | Task | Result | Effort |
|-----|------|--------|--------|
| 15 | Design room/group message format | Spec documented | 2h |
| 16 | Implement room creation/join | Rooms exist | 3h |
| 17 | Add group key derivation (X25519) | Shared secrets per room | 4h |
| 18 | Implement multicast: send to room | Multiple recipients | 3h |
| 19 | Add room membership tracking | Know who's in room | 3h |
| 20 | Create room-based demo (agent swarm) | 3 agents chatting | 3h |
| 21 | **Ship v0.0.5** — "Group Chat Alpha" | Release notes, tag | 2h |

### Week 4: Polish & Community

| Day | Task | Result | Effort |
|-----|------|--------|--------|
| 22 | Create CONTRIBUTING.md | Contribution guide | 2h |
| 23 | Add bug report template | GitHub issue template | 1h |
| 24 | Add feature request template | GitHub issue template | 1h |
| 25 | Create "good first issue" labels | 3 labeled issues | 1h |
| 26 | Write "How Agents Talk" blog post | Published content | 4h |
| 27 | Add benchmarking suite | Performance baseline | 3h |
| 28 | Improve TUI with room support | Terminal UI v2 | 4h |
| 29-30 | Buffer for bugs, docs, demos | Polish release | 8h |

### Monthly Milestone

> **End of Month:** v0.1.0 — "Group Ready"
> - Group chats work end-to-end
> - Reliable message delivery
> - Better developer experience
> - Community infrastructure ready

---

## 4. Open Source Best Practices

### CONTRIBUTING.md Template

```markdown
# Contributing to aitap

Thanks for your interest! This is a small project, and we appreciate all contributions.

## Quick Start

1. Fork and clone
2. `npm install`
3. `npm test` (should pass)
4. Make changes
5. `npm test` (should still pass)
6. Submit PR

## Development

- **Main branch:** `main` — always releasable
- **Node version:** 18+
- **Style:** `npm run lint` (Prettier + ESLint)

## What to Work On

- Check [good first issues](https://github.com/yourname/aitap/labels/good%20first%20issue)
- See [roadmap](ROADMAP.md) for direction
- Open an issue to discuss before large changes

## Code Style

- Use clear variable names (prefer `peerId` over `p`)
- Comment "why" not "what"
- Add tests for new features
- Update README if API changes

## Questions?

- Open a [discussion](https://github.com/yourname/aitap/discussions)
- Or email: hello@yourdomain.com
```

### Issue Templates

#### Bug Report

```yaml
name: Bug report
about: Something not working?
title: '[BUG] '
labels: bug

body:
  - type: textarea
    attributes:
      label: What happened?
      description: Describe the bug
  - type: textarea
    attributes:
      label: Steps to reproduce
      description: Minimal code to trigger the bug
  - type: input
    attributes:
      label: Version
      description: npm list aitap
  - type: input
    attributes:
      label: Environment
      description: Node version, OS
```

#### Feature Request

```yaml
name: Feature request
about: Suggest an idea
title: '[FEATURE] '
labels: enhancement

body:
  - type: textarea
    attributes:
      label: Problem
      description: What pain point are you solving?
  - type: textarea
    attributes:
      label: Proposed solution
      description: How would it work?
  - type: textarea
    attributes:
      label: Alternatives
      description:Other approaches considered
```

### "Good First Issue" Tags

Create GitHub labels:
- `good first issue` — newcomer friendly
- `help wanted` — maintainers want help
- `documentation` — docs need work
- `good first issue (code)` — has code pointers in issue

---

## 5. Three "Good First Issues"

### Issue #1: Add Message Timestamps

**Title:** Add sentAt timestamp to message metadata

**Description:**
Messages should include a timestamp so recipients can see when they were sent.

**Tasks:**
- Add `sentAt` field to message envelope
- Use `Date.now()` (milliseconds since epoch)
- Ensure JSON serialization includes it
- Update tests

**Pointers:**
See `src/protocol.js` — `createMessage()` function around line 45.

**Labels:** `good first issue`, `good first issue (code)`

---

### Issue #2: Create Simple E2E Test

**Title:** Add integration test: two nodes message each other

**Description:**
Currently tests are unit tests. We need an integration test that starts two nodes and has them exchange messages.

**Tasks:**
- Create `tests/integration.test.js`
- Start node A, start node B
- Connect A to B (using direct address, skip mDNS)
- Send message A → B
- Assert B receives it
- Clean up (close connections)

**Pointers:**
Look at `src/node.js` constructor and `connect()` method. Use test hooks (before/after) to cleanup.

**Labels:** `good first issue`, `help wanted`, `tests`

---

### Issue #3: Improve README Quick Start

**Title:** Add copy-paste runnable example to README

**Description:**
The README has code, but not a complete copy-paste-and-run example.

**Tasks:**
- Create a minimal 20-line example
- Show: import, create node, connect, send, receive
- Test that it actually works by running it
- Add to README under "Quick Start"

**Pointers:**
The example should use the Meeting Point server (or localhost for same-machine demo).

**Labels:** `good first issue`, `documentation`

---

## 6. Key Metrics & Success Criteria

### Monthly Goals

| Metric | v0.0.2 (current) | v0.1.0 (30-day) | Target |
|--------|------------------|-----------------|--------|
| **NPM downloads/week** | Baseline | 2x baseline | Growing |
| **GitHub stars** | Current | +25% | Organic growth |
| **Contributors** | 1 | 2-3 | First PRs |
| **Closed issues** | — | 5+ | Active maintenance |
| **Test coverage** | % | 70%+ | Confidence |

### Daily Practice Checklist

```markdown
- [ ] One commit to main (or merged PR)
- [ ] Tests pass
- [ ] Documentation updated (if needed)
- [ ] Issue closed or created
- [ ] Something shipped (even if tiny)
```

---

## 7. Future Directions (Beyond 30 Days)

### Q2 2024 Goals

1. **WebRTC Support** — Browser-based agents
2. **Relay Network** — Global discovery beyond mDNS
3. **Mobile SDK** — React Native / Flutter bindings
4. **Agent Directory** — Discovery service

### Wild Ideas (Research Phase)

- **E2E Encrypted Group Video** — WebRTC mesh
- **Message Reactions** — Like Discord/Slack
- **Plugin Marketplace** — Community extensions
- **Federation** — Bridge to ActivityPub/Matrix

---

*Document: v1.0*
*Generated: 2024-02-13*
*Next review: 2024-03-13*
