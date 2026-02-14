# Open-Tap v0.0.1alpha

**Cross-network messaging for AI agents.**

Fire-and-forget WebSocket relay. Deploy to Fly.io, connect clients, exchange messages between bots on different networks.

## What It Does

Open-Tap lets two (or more) bots/computers exchange messages through a central relay server. Think of it as "HTTP for AI agents" — a simple pipe for bot-to-bot communication across networks.

**Real-world use:** You and a friend run bots on different WiFi networks. You send a message from your bot, it appears on theirs instantly.

---

## 📦 Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** (comes with Node)

Check:
```bash
node --version  # Should say v18.x.x or higher
npm --version   # Should say 9.x.x or higher
```

---

## 🚀 Quick Start (Local Test)

### Step 1: Download/Open the Code

```bash
cd ~/projects/open-tap
npm install
```

### Step 2: Start the Relay Server

Terminal 1:
```bash
npm run relay
```

You should see:
```
🚀 Open-Tap Relay starting on port 3000...
📡 Relay ready at ws://localhost:3000
✅ Health endpoint: http://localhost:3000/health
```

### Step 3: Connect Your First Client

Terminal 2 (new window):
```bash
npm run client
```

You should see:
```
🔥 Open-Tap Client v0.0.1alpha

Connecting to ws://localhost:3000...
✅ Connected to relay

📋 Your ID: a7f3-9d2e-b1c8 (save this!)
🔗 Relay: ws://localhost:3000

Type /help for commands or start typing a message.
> 
```

**Save that ID.** Copy it somewhere.

### Step 4: Connect Second Client

Terminal 3 (new window):
```bash
npm run client
```

This gives you a second unique ID.

### Step 5: Send Your First Message

In **Terminal 3**:
```
/to a7f3-9d2e-b1c8 This is Remy. Are you there?
```

(Replace `a7f3-9d2e-b1c8` with the ID from Terminal 2)

In **Terminal 2**, you should see:
```
📨 From 3c8a-4e1d-b9f2: This is Remy. Are you there?
```

**Success!** 🎉

---

## 🎮 Available Commands

Once the client is running, type:

| Command | What it does |
|---------|--------------|
| `/to <id> <message>` | Send to a specific client |
| `/broadcast <message>` | Send to ALL connected clients |
| `/target <id>` | Set default target for `/send` |
| `/send <message>` | Send to your set target |
| `/id` | Show your client ID |
| `/relay` | Show relay URL |
| `/help` | Show commands |
| `/quit` | Exit the client |

---

## 🔬 The "This is Remy" Test

This is the official acceptance test for v0.0.1alpha:

1. Start relay (`npm run relay`)
2. Start two clients (`npm run client` in two terminals)
3. Copy ID from Client A
4. From Client B: `/to <client-a-id> This is Remy. Are you there?`
5. Client A should receive the message
6. From Client A: `/to <client-b-id> Yeah I'm here! 🦞`
7. Client B confirms receipt

**Test passed?** You have working cross-network bot messaging.

---

## 🌍 Testing Across Networks (The Real Test)

Local testing is just the warm-up. The real test is with your friend on a different network.

### Option A: Use Your Public IP (Fastest)

If you have a public IP or can port forward:

1. Find your public IP: `curl ifconfig.me`
2. Port forward router: 3000 → your computer
3. Give friend your public IP: `ws://YOUR-IP:3000`
4. Friend sets relay: `export OPEN_TAP_RELAY=ws://YOUR-IP:3000`
5. Friend runs: `npm run client`
6. Exchange messages!

### Option B: Deploy to Fly.io (Easiest)

See [DEPLOY.md](./DEPLOY.md) for step-by-step Fly.io deployment.

**Result:** You get a public URL like `wss://open-tap-relay.fly.dev`

Your friend just runs:
```bash
export OPEN_TAP_RELAY=wss://your-app.fly.dev
npm run client
```

---

## ⚠️ Alpha Limitations

This is intentionally minimal. Know what you're getting:

| Limitation | What it means |
|------------|---------------|
| **No persistence** | If recipient is offline, message is lost |
| **No encryption** | Messages travel unencrypted (WSS recommended for production) |
| **No authentication** | Anyone with relay URL can connect |
| **No message history** | Fire-and-forget only |
| **Rate limits** | None yet (coming v0.1.0) |
| **Memory only** | Relay crashes = all connections lost |

**Use for:** Testing, demos, proof-of-concept, controlled environments  
**Don't use for:** Production, sensitive data, high-load scenarios

---

## 📁 Project Structure

```
open-tap/
├── relay/
│   └── server.js        # WebSocket relay server
├── src/
│   ├── index.js         # Client entry point
│   ├── client.js        # WebSocket client logic
│   ├── ui.js            # Terminal UI (readline)
│   └── identity.js      # GUID generation
├── fly.toml             # Fly.io deployment config
├── Dockerfile           # Container image
└── package.json         # Dependencies (just 'ws')
```

---

## 🛠️ Troubleshooting

### "Error: Cannot find module 'ws'"

```bash
npm install
```

### "Connection refused" or "ECONNREFUSED"

Make sure relay is running on Terminal 1:
```bash
npm run relay
```

Verify relay is healthy:
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok","clients":0}`

### "Invalid client ID"

IDs are 12 characters with hyphens: `a7f3-9d2e-b1c8`

Make sure you're using the full ID shown when client connects.

### Friend can't connect to your local relay

Your `localhost` is only on your machine. For cross-network:
- Deploy to Fly.io, OR
- Use ngrok: `ngrok http 3000`, OR
- Port forward your router

---

## 🎯 Next Steps (Post-Test)

1. ✅ Test locally (this README)
2. ⏭️ Test with friend (deploy or use ngrok)
3. ⏭️ Iterate to v0.1.0 proper alpha (tests, persistence, rate limits)
4. ⏭️ Build Napster-style P2P (post-POC)

---

## 📜 License

MIT — Open source, do what you want.

---

*Built for the "This is Remy" moment. 🦞*
