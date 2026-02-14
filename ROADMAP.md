# Open-Tap — 48-Hour Build + Iteration Roadmap

## Phase 1: SHIP NOW (48 Hours) 🚀 ✅ COMPLETE

### Goal
Working demo you + friend can test. One message: "This is Remy. Are you there?"

### Status
**COMPLETE** — Relay mode working, 1-command setup, QR codes, /reply command.

---

## Phase 2: TRUE P2P (ACTIVE NOW) 🔥

### Goal
Remove central relay. Each node runs its own mini-relay, discovers peers via GUID, authenticates mutually, connects directly.

### Spec
- Each node broadcasts its GUID + endpoint (IP:port)
- Nodes discover each other (mDNS for LAN, DHT/global for WAN)
- Mutual auth via GUID exchange
- Direct TCP connection (NAT hole punch or relay fallback)
- No single point of failure

### Tasks
| Day | Task | Owner | Status |
|-----|------|-------|--------|
| **Sat PM** | Peer discovery protocol (mDNS + broadcast) | Dev | 🔲 |
| **Sat Night** | GUID = connection info encoding | Dev | 🔲 |
| **Sun AM** | Mini-relay per node ( each runs server) | Dev | 🔲 |
| **Sun PM** | Mutual auth handshake (GUID exchange) | Dev | 🔲 |
| **Mon AM** | NAT hole punching (UDP/TCP) | Dev | 🔲 |
| **Mon PM** | Fallback to relay if direct fails | Dev | 🔲 |
| **Tue** | End-to-end test, two machines, two networks | QA | 🔲 |

### New Commands
```bash
# Start as P2P node
tap --p2p

# Show my GUID (encodes IP:port + pubkey)
/id

# Add peer by GUID
/add-peer <guid>

# List discovered peers
/peers

# Auth with peer (mutual GUID exchange)
/auth <peer-guid>

# Connect and chat
/to <peer-guid> hello

# Reply (no ID needed)
/reply hello back
```

---

## Phase 3: Production Hardening (Days 8-14) 🔧

| Feature | Day 2 State | Proper Alpha Target | ETA |
|---------|-------------|---------------------|-----|
| **Tests** | None | Unit + integration (6 P0 scenarios) | Day 9 |
| **Persistence** | In-memory only | 100-msg queue, 24h TTL | Day 10 |
| **Auth** | None | Simple PSK (pre-shared key) | Day 11 |
| **Rate Limit** | None | 100 msg/min per peer | Day 12 |
| **Docs** | README only | QUICKSTART, CONFIG, TROUBLESHOOTING | Day 13 |
| **Observability** | Console.log | Structured logging, health endpoint | Day 14 |

---

## Daily Update Schedule 📅

| Date | Focus | Deliverable |
|------|-------|-------------|
| **Feb 14 (Sat PM)** | DISCOVERY | mDNS + peer discovery protocol |
| **Feb 15 (Sun)** | PROTOCOL | GUID = connection info, mini-relay per node |
| **Feb 16 (Mon)** | AUTH | Mutual auth handshake, NAT hole punch |
| **Feb 17 (Tue)** | INTEGRATION | End-to-end P2P test |
| **Feb 18 (Wed)** | HARDEN | Tests + rate limits |
| **Feb 19 (Thu)** | POLISH | Message queue, reconnect logic |
| **Feb 20 (Fri)** | SHIP | True P2P v0.2.0 |

---

## Immediate TODO (P2P Build) ✅

### Dev Tasks (Assigned to API Dev)
- [ ] mDNS service discovery (bonjour/avahi)
- [ ] Broadcast listener (UDP multicast)
- [ ] GUID encoding: uuid + IP + port + pubkey
- [ ] Mini-relay: each node runs WebSocket server
- [ ] Peer registry: discovered peers stored in ~/.open-tap/peers.json
- [ ] Mutual auth: challenge-response with GUIDs
- [ ] Direct TCP connection (try direct first)
- [ ] NAT hole punching (STUN/TURN later)
- [ ] Relay fallback (if direct fails, use relay)

### Protocol Draft
```
Peer A starts: --p2p
  ↓ Broadcast: "I'm here, GUID=X, endpoint=192.168.1.42:3000"
  
Peer B receives broadcast
  ↓ Adds to peer list
  ↓ Sends auth request: "AUTH: GUID_Y wants to connect"
  
Peer A receives auth request
  ↓ Verifies GUID_Y is expected
  ↓ Sends auth response: "AUTH_OK: GUID_X accepts"
  
Both: Direct TCP connection established
  ↓ Chat: /to GUID_Y hello
  ↓ Reply: /reply hello back
```

---

## Success Criteria

**Phase 2 Done When:**
- Two nodes discover each other automatically (same WiFi)
- Each node shows its GUID: `a7f3-9d2e-b1c8@192.168.1.42:3000`
- Mutual auth completes (challenge/response)
- Direct connection established (no relay)
- Messages flow P2P
- Screenshot captured

**Full P2P Done When:**
- Cross-network P2P (NAT hole punching)
- Fallback relay if direct fails
- Production-ready with tests

---

*Last updated: 2026-02-13 18:45 CST*
*Status: P2P Build Phase ACTIVE*
