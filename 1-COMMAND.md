# 1-Command Setup (SUPER SIMPLE MODE)

**Run one command, get connected, exchange messages.**

---

## 🚀 The Easiest Way: Host Mode

You run one command that starts **everything**: relay server, public tunnel, and client.

### You (1 command):
```bash
tap --host
```

Or if using npx:
```bash
npx thindery/aitap --host
```

**This automatically:**
- ✅ Starts relay server on your machine
- ✅ Creates public tunnel (uses ngrok if installed, or localtunnel)
- ✅ Connects your client
- ✅ Shows your client ID
- ✅ Prints the exact command for your friend

**Output:**
```
🚀 Starting relay server...
✅ Relay running on port 3000
🌍 Creating public tunnel...
✅ Tunnel ready: wss://abc123.ngrok-free.app

╔════════════════════════════════════════════════════╗
  💬 Tell your friend to run:

     npx thindery/aitap wss://abc123.ngrok-free.app

  Or if they have it installed:
     export AITAP_RELAY=wss://abc123.ngrok-free.app
     tap
╚════════════════════════════════════════════════════╝

🔥 Connecting client to relay...
✅ Connected! Your ID: a7f3-9d2e-b1c8-4d5e
💡 Share this ID with your friend

> 
```

### Friend (1 command):
```bash
npx thindery/aitap wss://abc123.ngrok-free.app
```

**That's it!** Friend gets their ID, tells you, you message each other.

---

## 🌍 Alternative: Use a Public Relay

**If you don't want to host,** use a shared public relay:

### Both of you:
```bash
npx thindery/aitap wss://aitap-relay.fly.dev
```

Or set it once:
```bash
export AITAP_RELAY=wss://aitap-relay.fly.dev
tap
```

**Notes:**
- Public relay = anyone can connect
- Messages still only go to specific IDs
- Free tier, may have rate limits

---

## 📱 The Dream: QR Code (Future)

**Coming in v0.2.0:**

### You:
```bash
tap --host
```

Terminal shows:
```
🔥 Open-Tap Client v0.0.1alpha
📋 Your ID: a7f3-9d2e-b1c8-4d5e

📱 Friend scans this QR to connect:
┌─────────────────┐
│ ▄▄▄▄▄ ▄▄▄ ▄▄▄▄▄ │
│ █   █ ▄▄▄ █   █ │
│ █▄▄▄█ █▄▀ █▄▄▄█ │
│ ▄▄▄▄▄ ▀▄▀ ▄▄▄▄▄ │
└─────────────────┘

Or type: npx thindery/aitap wss://abc123.ngrok-free.app
```

---

## 🎮 Commands

Once connected, type:

| Command | Action |
|---------|--------|
| `/to <id> <msg>` | Send message to specific ID |
| `/broadcast <msg>` | Send to everyone |
| `/id` | Show your ID |
| `/help` | Show all commands |
| `/quit` | Exit |

---

## 🔧 Prerequisites

### For Host Mode (You):
```bash
# Option A: ngrok (recommended)
npm install -g ngrok

# Option B: localtunnel (pure JS, no account)
npm install -g localtunnel
```

If neither is installed, host mode still works but only for **same WiFi** testing.

### For Connecting (Friend):
**Nothing!** Just `npx thindery/aitap <url>`

---

## 📝 Quick Reference

| What you want | Command |
|---------------|---------|
| Host + tunnel + connect | `tap --host` |
| Connect to friend's relay | `npx thindery/aitap <url>` |
| Use public relay | `npx thindery/aitap wss://aitap-relay.fly.dev` |
| Old way (relay separate) | `aitap-relay` then `tap` |

---

## ❓ Troubleshooting

### "Command not found: tap"
```bash
npm install -g thindery/aitap
```

### "No tunnel found"
Install ngrok:
```bash
npm install -g ngrok
# Or: brew install ngrok
```

Or use localtunnel:
```bash
npm install -g localtunnel
```

### Tunnel URL changes on restart
ngrok free tier URLs change every restart. That's normal. Just send the new URL to your friend, or **deploy to Fly.io** for a permanent URL.

### Want a permanent URL?
```bash
fly launch --image thindery/aitap
fly deploy
```

Get `wss://your-app.fly.dev` — never changes.

---

## ✅ Success Test

1. You: `tap --host`
2. Copy the URL it prints
3. Friend: `npx thindery/aitap <that-url>`
4. Friend tells you their ID
5. You: `/to <friend-id> This is Remy. Are you there?`
6. Friend sees it, replies: `/to <your-id> Yeah I'm here! 🦞`

**Done!** Two commands total. 🎉
