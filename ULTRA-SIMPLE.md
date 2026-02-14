# Ultra-Simple: Connect in 3 Steps ✅ IMPLEMENTED

**No copy-pasting IDs. Just run, scan, chat.**

---

## 🎯 The 3-Step Flow (Working Now)

| Step | Person | Action |
|------|--------|--------|
| 1 | You | `tap --host` |
| 2 | Friend | `npx thindery/aitap <url>` (or scan QR) |
| 3 | Either | `/reply <message>` |

---

## 💻 How It Works

### Step 1: You Run Host
```bash
tap --host
```

Output:
```
🚀 Starting relay server...
✅ Relay running on port 3000
🌍 Creating public tunnel...
✅ Tunnel ready: wss://abc123.ngrok-free.app

📱 Scan with phone or camera:

┌─────────────────┐
│ ▄▄▄▄▄ ▄▄▄ ▄▄▄▄▄ │
│ █   █ ▄▄▄ █   █ │
│ █▄▄▄█ █▄▀ █▄▄▄█ │
│ ▄▄▄▄▄ ▀▄▀ ▄▄▄▄▄ │
└─────────────────┘

╔════════════════════════════════════════════════════╗
  💬 Tell your friend to run:

     npx thindery/aitap wss://abc123.ngrok-free.app

  Or scan the QR code above with phone/camera
╚════════════════════════════════════════════════════╝

🔥 Connecting client to relay...
✅ Connected! Your ID: a7f3-9d2e-b1c8-4d5e
💡 Share this ID with your friend

> 
```

### Step 2: Friend Connects
```bash
npx thindery/aitap wss://abc123.ngrok-free.app
```

**No copy-paste needed if they scan the QR!**

### Step 3: Chat with /reply
When friend sends you a message, just:
```
/reply Yeah I'm here! 🦞
```

**No ID required!** `/reply` automatically targets the last person who messaged you.

---

## 🎮 Key Commands

| Command | What it does |
|---------|--------------|
| `/to <id> <msg>` | Send to specific ID (old way) |
| `/reply <msg>` | **Reply to last peer (NEW!)** |
| `/broadcast <msg>` | Send to everyone |
| `/target <id>` | Set default target for `/send` |
| `/send <msg>` | Send to default target |
| `/id` | Show your ID |
| `/help` | Show all commands |
| `/quit` | Exit |

---

## 🔄 Example Conversation

**You:**
```bash
tap --host
```

**Friend (types what you tell them):**
```bash
npx thindery/aitap wss://abc123.ngrok-free.app
```

**Friend sends first message:**
```
/to a7f3-9d2e-b1c8-4d5e This is Remy. Are you there?
```

**You reply (no ID needed!):**
```
/reply Yeah I'm here! 🦞
```

**Friend replies (no ID needed!):**
```
/reply Sweet! It works!
```

---

## 📱 QR Code Support

Install qrcode-terminal for QR display:
```bash
npm install -g qrcode-terminal
```

Then `tap --host` shows a scannable QR code. Friends can:
- Scan with phone camera
- Use QR scanner app
- Just type the URL below the QR

---

## 🎯 What We Eliminated

| Old Way | New Way |
|---------|---------|
| Copy URL, paste into Discord | QR code scan |
| Friend copies URL from Discord | Types URL once (or scans) |
| Exchange IDs back and forth | `/reply` command |
| `export AITAP_RELAY=...` | URL as argument |
| `/to <long-id> hello` | `/reply hello` |

---

## 🚀 Prerequisites

**You (host):**
```bash
npm install -g thindery/aitap
npm install -g ngrok        # Optional, for tunnel
npm install -g qrcode-terminal  # Optional, for QR codes
```

**Friend (connects):**
```bash
# Nothing! Just npx
npx thindery/aitap <url>
```

---

## 💡 Pro Tips

1. **Make alias shorter:**
   ```bash
   alias tap='npx thindery/aitap'
   # Then: tap --host
   # Friend: tap wss://abc123.ngrok-free.app
   ```

2. **Use /reply after first message:** No more IDs!

3. **QR codes save time:** Install `qrcode-terminal` once, scan forever

4. **Same WiFi?** Even simpler — no tunnel needed, just IP address

---

## 🎉 Success in 3 Steps

1. `tap --host`
2. Friend: `npx thindery/aitap <url>`
3. `/reply hello`

Done. No ID exchange. No config files. No copy-paste chain. 🦞