# Open-Tap Testing Guide

**How to test Open-Tap with a friend on a different network.**

---

## 🎯 The Goal

You and a friend exchange this exact message:

```
You:  "This is Remy. Are you there?"
Friend: "Yeah I'm here! 🦞"
```

Across different WiFi networks. No SSH, no port forwarding, no VPN.

---

## 📋 Pre-Test Checklist

### You Need

- [ ] Node.js 18+ installed
- [ ] This code downloaded (`~/projects/open-tap`)
- [ ] Dependencies installed (`npm install`)
- [ ] A way to send your relay URL to friend (Discord, text, etc.)

### Your Friend Needs

- [ ] Node.js 18+ installed ([nodejs.org](https://nodejs.org))
- [ ] This code (you'll send them the zip or repo link)
- [ ] Your relay URL (you'll give them this)

---

## 🚀 Test Method 1: ngrok (5 minutes, no deploy)

ngrok gives you a public URL that tunnels to your local relay. Free tier works.

### Step 1: Install ngrok

**You:**
```bash
brew install ngrok
# OR download from https://ngrok.com/download
```

**Friend:** (doesn't need ngrok, just needs to connect)

### Step 2: Start Your Relay

Terminal 1:
```bash
cd ~/projects/open-tap
npm run relay
```

### Step 3: Expose to Internet

Terminal 2:
```bash
ngrok http 3000
```

You'll see:
```
Session Status                online
Account                       your@email.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

**Copy the HTTPS URL:** `https://abc123-def456.ngrok-free.app`

### Step 4: Get Your Client ID

Terminal 3:
```bash
export OPEN_TAP_RELAY=wss://abc123-def456.ngrok-free.app
npm run client
```

You'll see:
```
📋 Your ID: a7f3-9d2e-b1c8
```

**Save this ID.**

### Step 5: Send Details to Friend

Message your friend:

```
Hey! Test Open-Tap with me.

1. Download: [send them the code]
2. Run: npm install
3. Run: export OPEN_TAP_RELAY=wss://abc123-def456.ngrok-free.app
4. Run: npm run client
5. When you connect, tell me your client ID
6. I'll send you a message!
```

### Step 6: Exchange Messages

When friend is connected and tells you their ID:

```
/to <friend-id> This is Remy. Are you there?
```

Friend should see it appear!

**Victory.** 🎉

---

## 🚀 Test Method 2: Deploy to Fly.io (15 minutes, permanent)

ngrok URL changes every restart. Deploy to Fly.io for a permanent URL.

### Prerequisites

- Fly.io account: [fly.io](https://fly.io) (free tier)
- Fly CLI: `brew install flyctl`

### Deploy

```bash
cd ~/projects/open-tap
fly launch --no-deploy
fly deploy
```

You'll get: `wss://your-app-name.fly.dev`

### Test

**Both of you:**
```bash
export OPEN_TAP_RELAY=wss://your-app-name.fly.dev
npm run client
```

Exchange IDs and send messages.

**Permanent, free, running 24/7.**

---

## 🚀 Test Method 3: Your Public IP + Port Forward

If you have admin access to your router and a public IP:

### Step 1: Find Public IP

```bash
curl ifconfig.me
```

### Step 2: Port Forward

Router admin → Port Forwarding → Add rule:
- External port: 3000
- Internal IP: [your computer's local IP]
- Internal port: 3000

### Step 3: Test

```bash
export OPEN_TAP_RELAY=ws://YOUR-PUBLIC-IP:3000
npm run client
```

**Note:** Some ISPs block port 3000. May need to use a different external port mapped to internal 3000.

---

## 🔧 Sending Code to Friend

### Option A: GitHub (Recommended)

Push to GitHub:
```bash
cd ~/projects/open-tap
git init
git add .
git commit -m "v0.0.1alpha"
git remote add origin https://github.com/YOURNAME/open-tap.git
git push -u origin main
```

Tell friend:
```bash
git clone https://github.com/YOURNAME/open-tap.git
cd open-tap
npm install
```

### Option B: ZIP File

```bash
cd ~/projects
zip -r open-tap.zip open-tap
```

Send `open-tap.zip` via Discord/Dropbox/etc.

Friend:
```bash
unzip open-tap.zip
cd open-tap
npm install
```

---

## 📝 The Test Script

**You:**
1. Start relay: `npm run relay`
2. Start ngrok or deploy
3. Connect client: `export OPEN_TAP_RELAY=<url> && npm run client`
4. Send friend the relay URL and your ID

**Friend:**
1. Download code
2. Run: `npm install`
3. Connect: `export OPEN_TAP_RELAY=<your-url> && npm run client`
4. Tell you their client ID

**Both:**
5. Exchange messages:
   - You: `/to <friend-id> This is Remy. Are you there?`
   - Friend: `/to <your-id> Yeah I'm here! 🦞`

---

## ✅ Success Criteria

- [ ] Both clients connect to relay
- [ ] Message appears on recipient's terminal within 1 second
- [ ] Reply appears on sender's terminal
- [ ] No errors in relay logs
- [ ] You can exchange 10 messages without issues

**v0.0.1alpha is validated.** Ready to iterate to proper alpha.

---

## ❌ Common Failures

### "Cannot connect to relay"

- Check relay is running
- Check URL is correct (https:// not http:// for ngrok)
- Check firewall isn't blocking

### "Invalid client ID"

- IDs are 12 chars with hyphens
- Use full ID exactly as shown on connect
- IDs are case-sensitive

### "ECONNREFUSED"

- Friend's connection can't reach your relay
- Try ngrok instead of public IP
- Check if ISP blocks the port

### Messages not appearing

- Verify both clients show "Connected to relay"
- Check IDs are correct
- Look at relay logs for errors

---

## 🎉 Post-Test

Screenshot the exchange and save it. This is the proof v0.0.1alpha works.

Then we iterate to v0.1.0 proper alpha.

---

*Built for moments like this. 🦞*
