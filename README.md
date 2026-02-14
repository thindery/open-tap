# Open-Tap 🦞

**Like a walkie-talkie for computer programs.**

---

## What Is This? (Simple Version)

Imagine you and your friend both have walkie-talkies.

**Old way (Open-Tap v1):**
- You both call into a radio station
- The radio station forwards your messages
- Works great, but needs the station to be running

**New way (Open-Tap P2P):**
- You both turn on your walkie-talkies
- They find each other automatically (if close by)
- Or you tell them where to find each other (if far away)
- Then you talk **directly** — no radio station needed!

That's Open-Tap. It lets two computer programs (bots, agents, whatever) send messages to each other over the internet.

---

## Two Ways To Use It

### Way 1: Same Room / Same WiFi (Easiest)

Both computers on the same WiFi? They find each other automatically.

**You:**
```bash
npm install -g thindery/open-tap
tap --p2p
```

**Your friend:**
```bash
npm install -g thindery/open-tap
tap --p2p
```

Wait 5 seconds, then type `/peers` — you'll see each other!

Send a message:
```
/to <friend-id> Hey can you hear me?
```

### Way 2: Different Places / Different WiFi

You're at home. Friend is at their house. Different internet.

You need a **phonebook** (we call it a "rendezvous server") to help you find each other.

**Step 1:** Someone runs the phonebook
```bash
tap-rendezvous
```

Or deploy to Fly.io (free):
```bash
fly launch
fly deploy
```

**Step 2:** Both connect to the phonebook
```bash
tap --p2p --rendezvous=wss://your-phonebook.fly.dev
```

**Step 3:** Find each other and chat!
```
/peers                 # See who's online
/to <their-id> hello   # Send message
/reply hey back        # Reply (no ID needed!)
```

---

## The Magic Part

Once you find each other through the phonebook, you talk **directly**.

The phonebook just says "Hey, they're at this address." Then you hang up with the phonebook and talk straight to each other.

It's like:
1. You call 411 (directory)
2. They tell you your friend's number
3. You hang up with 411
4. You call your friend directly

That's why it's called **peer-to-peer** (P2P). No middleman after the initial "where are you?"

---

## Quick Commands

Once you're running, type:

| Command | What It Does |
|---------|--------------|
| `/id` | Show your unique ID |
| `/peers` | See who's online |
| `/to <id> <msg>` | Send a message |
| `/reply <msg>` | Reply to whoever messaged you last |
| `/help` | See all commands |
| `/quit` | Exit |

---

## Why This Exists

Most chat apps go through a central server for every message. That's fine, but:
- Server goes down? No chat.
- Server owner reads your messages? They can.
- Server costs money? Someone pays.

Open-Tap is different:
- Starts your own mini-server on your computer
- Finds friends automatically or via phonebook
- Talks directly after that
- No central server needed for the actual chat

It's like having your own walkie-talkie channel.

---

## Technical Stuff (If You Care)

- **Same WiFi:** Uses mDNS (like how your printer shows up automatically)
- **Different networks:** Uses WebSocket rendezvous + direct P2P
- **Security:** GUIDs identify peers, optional authentication
- **Protocol:** WebSocket for transport, JSON for messages
- **No Blockchain:** Just simple tech that works

See the [docs folder](./docs) for detailed technical documentation.

---

## Install

```bash
npm install -g thindery/open-tap
```

That's it. No config files. No setup. Just works.

---

## Test It Now

Two terminals on your machine:

**Terminal 1:**
```bash
tap --p2p
```

**Terminal 2:**
```bash
tap --p2p
```

Wait 5 seconds. Type `/peers` in both. See each other. Chat!

---

*Built with 🦞 by thindery*