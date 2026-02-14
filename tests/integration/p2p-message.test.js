/**
 * P2P Integration Tests
 * Tests message exchange between two nodes
 */

import { describe, it, expect, afterEach } from 'vitest';
import { P2PClient } from '../../src/p2p-client.js';

describe('P2P Message Exchange', () => {
  let nodes = [];

  async function spawnTestNode() {
    const node = new P2PClient(0); // Random port
    await node.start();
    nodes.push(node);
    return node;
  }

  function waitForMessage(node) {
    return new Promise((resolve) => {
      node.once('message', (msg) => {
        resolve(msg);
      });
    });
  }

  afterEach(() => {
    for (const node of nodes) {
      node.stop();
    }
    nodes = [];
  });

  it('two nodes can exchange messages', async () => {
    const nodeA = await spawnTestNode();
    const nodeB = await spawnTestNode();
    
    const infoA = nodeA.getInfo();
    const infoB = nodeB.getInfo();

    // Connect nodeA to nodeB
    // authenticate() calls connectToPeer which handles the handshake
    await nodeA.authenticate(infoB.guid);
    
    const promise = waitForMessage(nodeB);
    
    // Send message from A to B
    nodeA.sendToPeer(infoB.guid, 'Hello from Node A');
    
    const msg = await promise;
    expect(msg.payload).toBe('Hello from Node A');
    expect(msg.from).toBe(infoA.guid);
  }, 10000);

  it('can reply to a message', async () => {
    const nodeA = await spawnTestNode();
    const nodeB = await spawnTestNode();
    
    const infoA = nodeA.getInfo();
    const infoB = nodeB.getInfo();

    await nodeA.authenticate(infoB.guid);
    
    // Send initial message
    nodeA.sendToPeer(infoB.guid, 'Ping');
    await waitForMessage(nodeB);
    
    // Reply from B to A
    const replyPromise = waitForMessage(nodeA);
    nodeB.reply('Pong');
    
    const reply = await replyPromise;
    expect(reply.payload).toBe('Pong');
    expect(reply.from).toBe(infoB.guid);
  }, 10000);
});
