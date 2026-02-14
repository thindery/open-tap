# Open-Tap — 48-Hour Build + Iteration Roadmap

## Phase 1: SHIP NOW (48 Hours) 🚀

### Goal
Working demo you + friend can test. One message: "This is Remy. Are you there?"

### Tasks
| Day | Task | Owner | Status |
|-----|------|-------|--------|
| **Sat AM** | Scaffold project, WebSocket server, basic relay | Dev | 🔲 |
| **Sat PM** | Client bot, terminal UI, GUID generation | Dev | 🔲 |
| **Sun AM** | Fly.io deploy, end-to-end test | Dev | 🔲 |
| **Sun PM** | Friend test, message exchange | You | 🔲 |

### Cuts (Acceptable for v0.0.1)
- ❌ No tests (manual only)
- ❌ No persistence (messages lost if offline)
- ❌ No encryption (WSS only, no payload encryption)
- ❌ No auth (anyone can claim any GUID)
- ❌ Minimal docs (README only)

---

## Phase 2: ITERATE TO PROPER ALPHA (Days 3-7) 🔧

### From 2-Day → Proper Alpha

| Feature | Day 2 State | Proper Alpha Target | ETA |
|---------|-------------|---------------------|-----|
| **Tests** | None | Unit + integration (6 P0 scenarios) | Day 4 |
| **Persistence** | In-memory only | 100-msg queue, 24h TTL | Day 5 |
| **Auth** | None | Simple PSK (pre-shared key) | Day 5 |
| **Rate Limit** | None | 100 msg/min per peer | Day 4 |
| **Docs** | README only | QUICKSTART, CONFIG, TROUBLESHOOTING | Day 3 |
| **Observability** | Console.log | Structured logging, health endpoint | Day 6 |
| **Graceful Shutdown** | None | SIGTERM handling, cleanup | Day 6 |

---

## Daily Update Schedule 📅

| Date | Focus | Deliverable |
|------|-------|-------------|
| **Feb 14 (Sat)** | BUILD | v0.0.1alpha shipped |
| **Feb 15 (Sun)** | TEST | Friend exchange works |
| **Feb 16 (Mon)** | HARDEN | Tests + rate limits |
| **Feb 17 (Tue)** | PERSIST | Message queue + reconnect |
| **Feb 18 (Wed)** | AUTH | PSK implementation |
| **Feb 19 (Thu)** | POLISH | Docs + observability |
| **Feb 20 (Fri)** | SHIP | Proper alpha v0.1.0 |

---

## Immediate TODO (Next 48 Hours) ✅

### Dev Tasks (Assigned to API Dev)
- [x] Project scaffold (DONE)
- [ ] WebSocket relay server (`relay/server.js`)
- [ ] Client connection module (`src/client.js`)
- [ ] Terminal UI (`src/ui.js`)
- [ ] GUID generation (`src/identity.js`)
- [ ] Fly.io deployment (`fly.toml`, `Dockerfile`)
- [ ] End-to-end manual test

### Your Tasks
- [ ] Create Fly.io account
- [ ] Install Fly CLI: `brew install flyctl`
- [ ] Install client: `npm install -g open-tap`
- [ ] Test with friend

---

## Success Criteria

**Phase 1 Done When:**
- Both bots connect to relay
- Message "This is Remy. Are you there?" sent and received
- Screenshot captured

**Phase 2 Done When:**
- Stranger can install and use without your help
- Tests pass
- Docs are complete
- Messages survive reconnects

---

*Last updated: 2026-02-13 18:00 CST*
