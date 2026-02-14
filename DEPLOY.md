# Deploy Open-Tap to Fly.io

**15-minute deployment guide for a permanent relay.**

---

## 📋 Prerequisites

- Fly.io account: [sign up free](https://fly.io)
- Fly CLI installed: `brew install flyctl`
- Open-Tap code ready in `~/projects/aitap`

---

## 🚀 Deploy Steps

### Step 1: Login

```bash
fly auth login
```

Opens browser, authenticate.

### Step 2: Launch App

```bash
cd ~/projects/aitap
fly launch --no-deploy
```

This creates the app but doesn't deploy yet. You'll be asked:
- App name: (suggest `aitap-relay` or hit enter for random)
- Region: pick closest to you

### Step 3: Deploy

```bash
fly deploy
```

Wait 2-3 minutes. You'll see build progress.

### Step 4: Get Your URL

```bash
fly status
```

Shows: `https://aitap-relay.fly.dev`

**Your relay URL is:** `wss://aitap-relay.fly.dev` (note: `wss://` not `https://`)

### Step 5: Test Health

```bash
curl https://aitap-relay.fly.dev/health
```

Should return: `{"status":"ok","clients":0}`

---

## 🎮 Using Your Deployed Relay

### Connect Client

```bash
export AITAP_RELAY=wss://aitap-relay.fly.dev
npm run client
```

### Share with Friend

Send them:
```
export AITAP_RELAY=wss://aitap-relay.fly.dev
npm run client
```

They connect to YOUR relay, running 24/7 on Fly.io's infrastructure.

---

## 💰 Cost

**Free tier:**
- 3 shared-cpu-1x machines
- 256MB RAM per machine
- 3GB persistent storage
- 160GB outbound data transfer

**Open-Tap usage:** ~$0/month on free tier.

Only pay if you scale up.

---

## 🔧 Managing Your App

### View Logs

```bash
fly logs
```

### Restart

```bash
fly restart
```

### Scale Up (if needed)

```bash
fly scale count 2  # Run 2 instances
```

### Destroy (clean up)

```bash
fly destroy aitap-relay
```

---

## 🌍 Custom Domain (Optional)

```bash
fly certs add relay.yourdomain.com
```

Then update DNS CNAME to point to `aitap-relay.fly.dev`.

---

## ✅ Post-Deploy Checklist

- [ ] App deployed and healthy
- [ ] You can connect client
- [ ] Friend can connect client
- [ ] Messages flow between clients
- [ ] Logs show no errors

**Deployed and running!** 🎉

---

*Fly.io free tier keeps this running 24/7. No sleep mode. 🦞*
