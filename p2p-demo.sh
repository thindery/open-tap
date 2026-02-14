#!/bin/bash
#
# Open-Tap P2P Demo Script
# Runs two P2P nodes on different ports for testing
#

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Open-Tap P2P Demo - Two Nodes on Same Machine        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "This demo starts two P2P nodes on ports 3001 and 3002"
echo "They will communicate directly without a central relay!"
echo ""

# Check if we're in the right directory
if [ ! -f "src/p2p.js" ]; then
    echo "❌ Error: Run this script from the open-tap directory"
    exit 1
fi

# Check for node
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is required"
    exit 1
fi

echo "📦 Installing multicast-dns (optional, for auto-discovery)..."
npm install multicast-dns --silent 2>/dev/null || echo "⚠️  multicast-dns install failed, will use manual peer addition"

echo ""
echo "🚀 Starting Node A on port 3001..."
node src/p2p.js 3001 &
NODE_A_PID=$!

echo "⏳ Waiting for Node A to start..."
sleep 2

echo ""
echo "🚀 Starting Node B on port 3002..."
node src/p2p.js 3002 &
NODE_B_PID=$!

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Both P2P nodes are running!"
echo ""
echo "Node A: Check its GUID with /id command"
echo "Node B: Check its GUID with /id command"
echo ""
echo "To connect them:"
echo "  1. In Node B: Type /peers to see if auto-discovery found Node A"
echo "  2. If not found, in Node A: Run /id and copy the GUID"
echo "  3. In Node B: Run /add-peer <guid-from-node-a>"
echo "  4. In Node B: Run /auth <guid> or /to <guid> hello"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Press Ctrl+C to stop both nodes"
echo ""

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping nodes...'; kill $NODE_A_PID $NODE_B_PID 2>/dev/null; echo 'Done!'; exit 0" INT
wait
