# 1-Command Setup (Super Simple Mode)

**Goal:** Run one command, get connected, exchange messages.

Two options:
- **Option 1:** Use public relay (fastest, 30 seconds)
- **Option 2:** Your own relay with auto-tunnel (2 minutes, more private)

---

## Option 1: Public Relay (EASIEST)

**No setup. No ngrok. No deploy.** Both people use the same public relay.

### You:
```bash
npx thindery/open-tap
```

**That's it.** You'll see:
```
🔥 Open-Tap Client v0.0.1alpha
📋 Your ID: a7f3-9d2e-b1c8-4d5e
🔗 Using relay: wss://open-tap-relay.fly.dev

> Send this to your friend:
>   npx thindery/open-tap wss://open-tap-relay.fly.dev
>
> Then tell them your ID: a7f3-9d2e-b1c8-4d5e
```

### Friend:
```bash
npx thindery/open-tap wss://open-tap-relay.fly.dev
```

Friend sees their ID, tells you.

### Exchange:
```
/to <friend-id> This is Remy. Are you there?
```

**Done.** 🎉

---

## Option 2: Your Own Relay (Private)

**You run the relay + auto-tunnel. Friend just connects.**

### You (1 command):
```bash
npx thindery/open-tap --host
```

This does everything:
- Starts relay on your machine
- Auto-tunnels with ngrok (if installed) or localtunnel
- Prints shareable URL
- Connects your client
- Shows your ID

**Output:**
```
🚀 Starting your private relay...
📡 Relay running on port 3000
🌍 Public URL: wss://abc123.ngrok-free.app
🔥 Open-Tap Client v0.0.1alpha
📋 Your ID: a7f3-9d2e-b1c8-4d5e

💬 Tell your friend to run:
   npx thindery/open-tap wss://abc123.ngrok-free.app

> 
```

### Friend (1 command):
```bash
npx thindery/open-tap wss://abc123.ngrok-free.app
```

Friend sees their ID, tells you.

### Exchange:
```
/to <friend-id> This is Remy. Are you there?
```

---

## The Dream: QR Code Discovery

**Future version (v0.2.0+):**

### You:
```bash
npx thindery/open-tap
```

Terminal shows QR code:
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
```

### Friend:
Scans QR with phone → auto-connects, or types URL shown below QR.

---

## Implementation Notes

**What needs to be built:**

1. **Auto-tunnel detection:**
   ```javascript
   // Try ngrok first
   const ngrok = await import('ngrok');
   const url = await ngrok.connect(3000);
   
   // Fallback to localtunnel
   const localtunnel = await import('localtunnel');
   const tunnel = await localtunnel({ port: 3000 });
   ```

2. **npx support:** Repo needs proper `bin` entries (already done ✅)

3. **`--host` flag:** When present, start relay + tunnel + client in one process

4. **URL argument:** `npx open-tap <relay-url>` connects to specific relay

5. **QR code:** `qrcode` npm package for terminal QR codes

---

## Current Status vs Dream

| Feature | Current | 1-Command Goal |
|---------|---------|----------------|
| Install | `npm install -g` | `npx` (no install) |
| Start relay | `open-tap-relay` | `--host` flag |
| Tunnel | Manual ngrok | Auto-detect + auto-start |
| Connect | Set env var + run | URL as argument |
| Share | Copy-paste ID | QR code scan |

---

## Quick Win: npx Support Now

Already works:
```bash
# Connect to public relay
npx thindery/open-tap

# Connect to specific relay  
npx thindery/open-tap wss://your-relay.fly.dev
```

**To make Option 2 work** (relay + tunnel + client in one), need to add:
1. `--host` flag to start relay
2. Auto-tunnel integration
3. Combine relay + client in single process

**Want me to build the 1-command version?** (~1 hour) 🦞