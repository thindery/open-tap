# Changelog

All notable changes to this project will be documented in this file.

## [0.0.3] - 2026-02-13

### Added - Reliable Delivery System

This release introduces comprehensive message reliability features for P2P mode.

- **ACK Receipts**: Every message now receives an acknowledgment confirmation from the recipient
- **Exponential Backoff Retry**: Failed messages automatically retry with delays of 1s, 2s, and 4s
- **Message Deduplication**: Prevents duplicate message processing using a sliding window (last 100 message IDs)
- **Offline Message Queuing**: Messages to offline peers are queued and delivered when they reconnect
- **Status Indicators**: UI now shows [ACK], [QUEUED], [FAILED], [RETRY], and [PENDING] statuses
- **Message Tracking**: Track delivery status with message IDs and detailed connection stats via `/stats`

### Security Note

> **v0.0.3-alpha**: Missing end-to-end encryption, cryptographic identity, and replay protection for untrusted networks. Use for demos/trusted networks only. Security hardening targeted for v0.0.4.

### Technical Details

- ACK timeout: 5 seconds
- Max retry attempts: 3
- Backoff delays: 1s, 2s, 4s (exponential)
- Deduplication window: 100 most recent message IDs
- Offline queue: in-memory per peer

## [0.0.1] - 2026-02-10

### Added - Initial Alpha Release

- P2P WebSocket connections
- mDNS discovery (same LAN)
- Meeting Point rendezvous (cross-network)
- Mutual authentication with Badges/GUIDs
- Direct messaging between peers
- `/reply` command for no-ID responses
- `/to <id> <msg>` command for sending
- `/id`, `/peers`, `/stats`, `/broadcast` commands
