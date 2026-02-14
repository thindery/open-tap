#!/usr/bin/env node
/**
 * Open-Tap Client v0.0.1alpha
 * Terminal client for relay messaging
 */

const { OpenTapClient } = require('./client');
const { TerminalUI } = require('./ui');
const { getIdentity } = require('./identity');

// Default relay (local or from env)
const RELAY_URL = process.env.OPEN_TAP_RELAY || 'ws://localhost:3000';

async function main() {
  const ui = new TerminalUI();
  const client = new OpenTapClient(RELAY_URL);

  let targetClient = null;

  ui.print('\n╔════════════════════════════════════════╗');
  ui.print('║     Open-Tap Client v0.0.1alpha        ║');
  ui.print('║                                        ║');
  ui.print(`║  Identity: ${getIdentity().slice(0, 16)}...       ║`);
  ui.print(`║  Relay: ${RELAY_URL.slice(0, 28).padEnd(28)}  ║`);
  ui.print('╚════════════════════════════════════════╝\n');

  // Setup message handler
  client.onMessage((msg) => {
    switch (msg.type) {
      case 'message':
        ui.receive(msg.from, msg.payload);
        break;
      case 'ack':
        ui.system(msg.delivered ? `Delivered to ${msg.target}` : `Target ${msg.target} not found`);
        break;
      case 'error':
        ui.system(`Relay error: ${msg.message}`);
        break;
    }
  });

  // Register commands
  ui.command('to', '<clientId> <message> - Send message', (args, full) => {
    if (args.length < 2) {
      ui.system('Usage: /to <clientId> <message>');
      return;
    }
    targetClient = args[0];
    const message = full.slice(targetClient.length + 1);
    
    try {
      client.send(targetClient, message);
    } catch (err) {
      ui.system(`Send failed: ${err.message}`);
    }
  });

  ui.command('broadcast', '<message> - Send to all', (args, full) => {
    if (!full) {
      ui.system('Usage: /broadcast <message>');
      return;
    }
    try {
      client.broadcast(full);
      ui.system('Broadcast sent');
    } catch (err) {
      ui.system(`Broadcast failed: ${err.message}`);
    }
  });

  ui.command('target', '[clientId] - Set default target', (args) => {
    if (args.length === 0) {
      ui.system(targetClient ? `Current target: ${targetClient}` : 'No target set');
      return;
    }
    targetClient = args[0];
    ui.system(`Target set to: ${targetClient}`);
  });

  ui.command('send', '<message> - Send to current target', (args, full) => {
    if (!targetClient) {
      ui.system('No target set. Use /target <clientId> or /to <clientId> <message>');
      return;
    }
    if (!full) {
      ui.system('Usage: /send <message>');
      return;
    }
    try {
      client.send(targetClient, full);
    } catch (err) {
      ui.system(`Send failed: ${err.message}`);
    }
  });

  ui.command('quit', 'Exit the client', () => {
    ui.system('Disconnecting...');
    client.disconnect();
    ui.stop();
    process.exit(0);
  });

  ui.command('id', 'Show my client ID', () => {
    ui.system(`My ID: ${getIdentity()}`);
  });

  ui.command('relay', 'Show relay URL', () => {
    ui.system(`Relay: ${RELAY_URL}`);
  });

  // Connect to relay
  ui.system('Connecting to relay...');
  try {
    await client.connect();
    ui.system('Connected! Use /to <clientId> <message> to test');
  } catch (err) {
    ui.system(`Connection failed: ${err.message}`);
    ui.system('Is the relay running? Set OPEN_TAP_RELAY to change server.');
    ui.stop();
    process.exit(1);
  }

  // Start UI
  ui.start();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
