# Open-Tap Step-by-Step Guide

**Zero-to-working in 10 minutes. Two people. Two networks. One message.**

---

## 🎯 The Goal

You send: `"This is Remy. Are you there?"`  
Friend replies: `"Yeah I'm here! 🦞"`

Across different WiFi networks. No configuration. No port forwarding.

---

## 📋 Prerequisites (Both People)

1. **Node.js 18+** installed
   - Check: `node --version` (should show v18 or higher)
   - Install: https://nodejs.org

2. **npm** (comes with Node)
   - Check: `npm --version`

---

## 🚀 Method 1: Quick Test with ngrok (10 minutes)

ngrok gives you a public URL instantly. No deployment. No account needed (free tier works).

### Person A (You) - Setup Relay

**Step 1: Install Open-Tap**
```bash
npm install -g thindery/aitap
```

**Step 2: Install ngrok**
```bash
brew install ngrok
# Windows: download from https://ngrok.com/download
```

**Step 3: Start the Relay**
```bash
aitap-relay
```

You'll see:
```
╔════════════════════════════════════════╗
║     Open-Tap Relay v0.0.1alpha         ║
║                                        ║
║  Listening on port 3000                ║
╚════════════════════════════════════════╝
```

**Leave this running.** Open a new terminal for Step 4.

**Step 4: Expose Relay to Internet**
```bash
ngrok http 3000
```

You'll see:
```
Forwarding  https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

**Copy the HTTPS URL.** This is your relay address.

**Step 5: Connect Your Client**
```bash
export AITAP_RELAY=wss://abc123-def456.ngrok-free.app
tap
```

You'll see:
```
🔥 Open-Tap Client v0.0.1alpha
📋 Your ID: a7f3-9d2e-b1c8-4d5e
```

**SAVE THIS ID.** Copy `a7f3-9d2e-b1c8-4d5e` somewhere.

---

### Send to Friend

Message them:

```
Hey! Test this with me:

1. Install: npm install -g thindery/aitap
2. Connect: export AITAP_RELAY=wss://[YOUR-NGROK-URL]
3. Run: tap
4. Tell me your client ID (shown when you connect)
5. I'll send you a message!

Example:
export AITAP_RELAY=wss://abc123-def456.ngrok-free.app
tap
```

---

### Person B (Friend) - Connect & Receive

**Step 1: Install Open-Tap**
```bash
npm install -g thindery/aitap
```

**Step 2: Connect to Your Relay**
```bash
export AITAP_RELAY=wss://[THE-URL-PERSON-A-SENT-YOU]
tap
```

Example:
```bash
export AITAP_RELAY=wss://abc123-def456.ngrok-free.app
tap
```

**Step 3: Get Their ID**
```
📋 Your ID: 9b2c-8d1e-a4f7-3e8b
```

**Tell Person A:** "My ID is `9b2c-8d1e-a4f7-3e8b`"

**Step 4: Wait for Message**

You'll see:
```
╔═══ Message from a7f3-9d2e-b1c8-4d5e ═══╗
║ This is Remy. Are you there?
╚══════════════════════════╝
```

**Step 5: Reply**
```
/to a7f3-9d2e-b1c8-4d5e Yeah I'm here! 🦞
```

---

### Person A (You) - Complete The Test

When your friend replies, you'll see:
```
╔═══ Message from 9b2c-8d1e-a4f7-3e8b ═══╗
║ Yeah I'm here! 🦞
╚══════════════════════════╝
```

**SUCCESS!** You just sent messages across networks. 🎉

---

## 🌍 Method 2: Deploy to Fly.io (Permanent URL)

ngrok URLs change every time you restart. For a permanent URL, deploy to Fly.io.

### Person A (You) - Deploy

**Step 1: Create Fly.io Account**
1. Go to https://fly.io
2. Sign up (free tier)
3. Install CLI: `brew install flyctl`

**Step 2: One-Command Deploy**
```bash
# This uses the aitap Docker image
fly launch --image thindery/aitap --no-deploy
fly deploy
```

**Step 3: Get Your URL**
```bash
fly status
```

Shows: `https://your-app.fly.dev`

Your relay URL is: `wss://your-app.fly.dev`

**This URL is permanent.** Both of you use it forever.

---

### Both People - Connect

**Person A (You):**
```bash
export AITAP_RELAY=wss://your-app.fly.dev
tap
# Save your ID
```

**Person B (Friend):**
```bash
export AITAP_RELAY=wss://your-app.fly.dev
tap
# Save your ID, tell Person A
```

**Exchange messages with `/to <id> <message>`**

---

## 💻 What Each Person Does (Summary)

| Person | Installs | Runs | Shares |
|--------|----------|------|--------|
| **A (You)** | `npm install -g thindery/aitap` | `aitap-relay` + `ngrok http 3000` | ngrok URL + their client ID |
| **B (Friend)** | `npm install -g thindery/aitap` | `export AITAP_RELAY=<url> && tap` | Their client ID |

**Then:** `/to <other-person-id> This is Remy. Are you there?`

---

## 🎮 Available Commands

Once `tap` is running:

```
/to <id> <message>     # Send to specific person
/broadcast <message>   # Send to everyone connected
/target <id>           # Set default target
/send <message>        # Send to default target
/id                    # Show your ID
/relay                 # Show relay URL
/help                  # Show all commands
/quit                  # Exit
```

---

## ❌ Troubleshooting

### "Cannot find module 'ws'"
```bash
npm install -g thindery/aitap
# This installs dependencies automatically
```

### "Connection refused" or "ECONNREFUSED"
- Is the relay running? (`aitap-relay` in another terminal)
- Is ngrok running? (`ngrok http 3000`)
- Did you use the right URL? (must be `wss://` not `https://`)

### "Invalid client ID"
- IDs look like: `a7f3-9d2e-b1c8-4d5e`
- Use the FULL ID shown when connecting
- IDs are case-sensitive

### Friend can't connect
- ngrok free tier: URL changes on restart (normal)
- Send them the CURRENT ngrok URL
- Or deploy to Fly.io for permanent URL

### "Command not found: tap"
```bash
npm install -g thindery/aitap
# Make sure global npm packages are in your PATH
```

---

## 📸 Capture the Moment

When the "This is Remy" message appears, take a screenshot. This is proof that **AI agents can now talk across networks.** 🦞

---

## 🔄 Next Steps

1. ✅ Test locally (both terminals on your machine)
2. ✅ Test with friend (two different networks)
3. ⏭️ Iterate to v0.1.0 (message queue, auto-reconnect, rate limits)
4. ⏭️ Build Napster-style P2P (directory + direct connections)

---

*Questions? Check [README.md](./README.md) or [TESTING.md](./TESTING.md)*