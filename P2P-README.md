# Open-Tap TRUE P2P Mode

**No central relay. Direct peer-to-peer connections.**

## Overview

P2P mode transforms Open-Tap from a relay-based messaging system into a true peer-to-peer network where each node:
- Runs its own mini WebSocket relay server
- Discovers peers automatically via mDNS on the same WiFi
- Authenticates peers mutually using cryptographic GUIDs
- Connects directly without any central server

## Quick Start

### Same WiFi (Auto-Discovery)

On computer A:
```bash
tap --p2p
# Then type: /id (to see your GUID)
```

On computer B:
```bash
tap --p2p
# The other node should appear automatically!
# Type: /peers to see discovered peers
# Type: /auth <guid> to authenticate
# Type: /to <guid> hello there!
```

### Manual Peer Addition (Different Networks)

```bash
# On Node A - get your GUID
/id
# Output: My GUID: a7f3-9d2e-b1c8-192.168.1.5-3000-xxxx

# On Node B - add the peer manually
/add-peer a7f3-9d2e-b1c8-192.168.1.5-3000-xxxx
/auth a7f3-9d2e-b1c8-192.168.1.5-3000-xxxx
/to a7f3-9d2e-b1c8-192.168.1.5-3000-xxxx hello!
```

## Commands

| Command | Description |
|---------|-------------|
| `/id` | Show my GUID and endpoint |
| `/peers` | List discovered and connected peers |
| `/add-peer <guid>` | Add peer manually (for different LAN) |
| `/auth <guid>` | Authenticate with a peer |
| `/connect <guid>` | Connect and authenticate with peer |
| `/to <guid> <msg>` | Send message to peer (auto-connects) |
| `/reply <msg>` | Reply to last peer who messaged you |
| `/broadcast <msg>` | Send to all connected peers |
| `/stats` | Show connection statistics |
| `/quit` | Exit P2P mode |

## How It Works

### 1. mDNS Discovery
When you start `tap --p2p`, the node broadcasts its presence on the local network using mDNS (multicast DNS). Other nodes on the same WiFi will automatically discover each other within ~10 seconds.

### 2. GUID Format
```
a7f3-9d2e-b1c8-192.168.1.42-3000-a1b2c3d4
\_____  _____/  \_____  _____/   |   \____/
     uuid         ip-address   port   pubkey
```

The GUID encodes everything needed to connect: UUID (identity), IP, port, and public key fingerprint.

### 3. Mutual Authentication
When nodes connect, they perform a challenge-response handshake:
1. Node A sends random challenge + its GUID
2. Node B verifies the format and responds with its challenge + signed response
3. Both verify the response using the GUID-derived key
4. Only authenticated peers can exchange messages

### 4. Direct Connections
Each node runs a mini WebSocket server. Outgoing connections connect directly to the peer's IP:port. Messages flow peer-to-peer without any relay.

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│     P2P Node A      │         │     P2P Node B      │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │  Mini Relay   │  │◄───────►│  │  Mini Relay   │  │
│  │   (ws server) │  │  direct │  │   (ws server) │  │
│  └───────────────┘  │  conn   │  └───────────────┘  │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │   Discovery   │  │◄────────►│  │   Discovery   │  │
│  │    (mDNS)     │  │  LAN    │  │    (mDNS)     │  │
│  └───────────────┘  │         │  └───────────────┘  │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │  P2P Client   │  │         │  │  P2P Client   │  │
│  │    (auth +    │  │         │  │    (auth +    │  │
│  │    messaging) │  │         │  │    messaging) │  │
│  └───────────────┘  │         │  └───────────────┘  │
└─────────────────────┘         └─────────────────────┘
```

## Files

- `src/p2p.js` - Entry point for P2P mode
- `src/p2p-client.js` - Client logic, peer management
- `src/discovery.js` - mDNS discovery service
- `src/minirelay.js` - Mini WebSocket relay server
- `src/auth.js` - Mutual authentication
- `src/guid.js` - GUID encoding/decoding

## Demo

Run two nodes on your machine locally:

```bash
./p2p-demo.sh
```

This starts two P2P nodes on ports 3001 and 3002 for testing.

## Future: NAT Hole Punching

Currently P2P works on the same LAN (WiFi). For WAN connections (different networks), NAT hole punching will be added to allow peers behind routers to connect directly.

## Install multicast-dns (Optional)

For automatic peer discovery, install the optional dependency:

```bash
npm install multicast-dns
```

Without it, you can still use P2P mode with manual peer addition via `/add-peer`.
