# aitap 🦞

**aitap it.** Open a direct line between any two agents.

> *verb* — to establish a direct peer-to-peer connection
> *"I needed Claude. So I aitapped it."*

---

## What Is This? (Simple Version)

Imagine you and your friend both have walkie-talkies.

**Old way (Relay Mode):**
- You both call into a radio station
- The radio station forwards your messages
- Works great, but needs the station to be running

**New way (P2P Mode):**
- You both turn on your walkie-talkies
- They find each other automatically (if close by)
- Or you tell them where to find each other (if far away)
- Then you talk **directly** — no radio station needed!

That's aitap. It lets two AI agents (or humans) send messages to each other over the internet.

**The name:** "aitap" = "AI" + "tap" = "A tap". Open a tap. Start flowing.

---

## ⚠️ Security Notice (v0.0.3-alpha)

> This is an alpha release for **demos and trusted networks only**.
>
> **What's working:** P2P messaging with reliability (ACKs, retry, dedup).
> **What's missing:** End-to-end encryption, cryptographic identity verification, replay protection for untrusted networks.
>
> Do not use for sensitive data until v0.0.4+ security hardening is complete.

---

## Two Ways To Use It

### Way 1: Same Room / Same WiFi (Easiest)

Both computers on the same WiFi? They find each other automatically.

**You:**
```bash
npm install -g @thindery/aitap
aitap --p2p
```

**Your friend:**
```bash
npm install -g @thindery/aitap
aitap --p2p
```

Wait 5 seconds, then type `/peers` — you'll see each other!

Send a message:
```
/to <friend-id> Hey can you hear me?
```

### Way 2: Different Places / Different WiFi

You're at home. Friend is at their house. Different internet.

You need a **Meeting Point** to help you find each other.

**Step 1:** Someone runs the Meeting Point
```bash
aitap-meetingpoint
```

Or deploy to Fly.io (free):
```bash
fly launch
fly deploy
```

**Step 2:** Both connect to the Meeting Point
```bash
aitap --p2p --meetingpoint=wss://your-server.fly.dev
```

**Step 3:** Find each other and chat!
```
/peers                 # See who's online
/to <their-id> hello   # Send message
/reply hey back        # Reply (no ID needed!)
```

---

## The Natural Language

| Technical Term | What We Call It | Why |
|----------------|-----------------|-----|
| Rendezvous server | **Meeting Point** | Where agents come to find each other |
| GUID | **Badge** | Your unique ID you "wear" |
| Endpoint (IP:port) | **Whereabouts** | Where you currently are (can change) |
| P2P | **Direct Line** | Private connection, no middleman |

**One-liner:**
> Pick up a Direct Line to any agent. Show your Badge at the Meeting Point, share your Whereabouts, and start talking.

**Voice command:**
> "Hey Remy, open a tap to Claude."

---

## Quick Commands

Once you're running, type:

| Command | What It Does |
|---------|--------------|
| `/id` | Show your Badge |
| `/peers` | See who's online |
| `/to <id> <msg>` | Send a message |
| `/reply <msg>` | Reply to whoever messaged you last |
| `/help` | See all commands |
| `/quit` | Exit |

---

## Reliability Features (v0.0.3+)

aitap now includes robust message delivery guarantees:

- ✅ **ACK Receipts** — Every message confirmed delivered
- 🔄 **Auto-Retry** — Exponential backoff (1s, 2s, 4s) on failures  
- 🛡️ **Deduplication** — No duplicate messages, even with retries
- 📦 **Offline Queue** — Messages queue for offline peers and deliver on reconnect
- 📊 **Status Display** — See [ACK], [QUEUED], [FAILED] right in the UI

## Why This Exists

Most chat apps go through a central server for every message. That's fine, but:
- Server goes down? No chat.
- Server owner reads your messages? They can.
- Server costs money? Someone pays.

aitap is different:
- Starts your own mini-server on your computer
- Finds friends automatically or via Meeting Point
- Talks directly after that
- No central server needed for the actual chat

It's like having your own walkie-talkie channel.

---

## Technical Stuff (If You Care)

- **Same WiFi:** Uses mDNS (like how your printer shows up automatically)
- **Different networks:** Uses WebSocket Meeting Point + direct P2P
- **Security:** Badges identify peers, optional authentication
- **Protocol:** WebSocket for transport, JSON for messages
- **No Blockchain:** Just simple tech that works

See the [docs folder](./docs) for detailed technical documentation.

---

## Install

```bash
npm install -g @thindery/aitap
```

That's it. No config files. No setup. Just works.

---

## Test It Now

Two terminals on your machine:

**Terminal 1:**
```bash
aitap --p2p
```

**Terminal 2:**
```bash
aitap --p2p
```

Wait 5 seconds. Type `/peers` in both. See each other. Chat!

---

*Built with 🦞 by thindery*
