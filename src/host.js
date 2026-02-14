#!/usr/bin/env node
/**
 * Open-Tap Host Mode
 * Relay + Tunnel + Client in one command
 */

const { spawn } = require('child_process');
const http = require('http');
const { OpenTapClient } = require('./client');
const { TerminalUI } = require('./ui');

const PORT = process.env.PORT || 3000;
const RELAY_PATH = require('path').join(__dirname, '..', 'relay', 'server.js');

async function findTunnel() {
  // Try ngrok first
  try {
    const ngrok = await import('ngrok');
    return { type: 'ngrok', module: ngrok };
  } catch {
    // ngrok not installed
  }

  // Try localtunnel
  try {
    const localtunnel = await import('localtunnel');
    return { type: 'localtunnel', module: localtunnel };
  } catch {
    // localtunnel not installed
  }

  return null;
}

async function startRelay() {
  return new Promise((resolve, reject) => {
    // Start relay as child process
    const relay = spawn('node', [RELAY_PATH], {
      stdio: 'pipe',
      env: { ...process.env, PORT: String(PORT) }
    });

    let started = false;

    relay.stdout.on('data', (data) => {
      const line = data.toString();
      if (line.includes('Listening on port')) {
        started = true;
        resolve(relay);
      }
    });

    relay.stderr.on('data', (data) => {
      console.error('[relay]', data.toString());
    });

    relay.on('error', reject);

    // Timeout if relay doesn't start
    setTimeout(() => {
      if (!started) {
        reject(new Error('Relay failed to start within 5 seconds'));
      }
    }, 5000);
  });
}

async function startTunnel() {
  const tunnelLib = await findTunnel();

  if (!tunnelLib) {
    return null;
  }

  if (tunnelLib.type === 'ngrok') {
    const url = await tunnelLib.module.connect(PORT);
    return { url: url.replace('https://', 'wss://'), type: 'ngrok' };
  }

  if (tunnelLib.type === 'localtunnel') {
    const tunnel = await tunnelLib.module({ port: PORT });
    return { url: `wss://${tunnel.url.replace('https://', '')}`, type: 'localtunnel', tunnel };
  }

  return null;
}

async function waitForRelayHealth(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${PORT}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => reject(new Error('timeout')));
      });

      if (res.status === 200) {
        const body = JSON.parse(res.data);
        return body;
      }
    } catch {
      // Retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Relay health check failed');
}

async function main() {
  const ui = new TerminalUI();

  try {
    // Step 1: Start relay
    ui.system('🚀 Starting relay server...');
    const relay = await startRelay();
    ui.system('✅ Relay running on port ' + PORT);

    // Step 2: Verify relay health
    await waitForRelayHealth();

    // Step 3: Start tunnel
    ui.system('🌍 Creating public tunnel...');
    const tunnel = await startTunnel();

    let publicUrl;
    if (tunnel) {
      publicUrl = tunnel.url;
      ui.system(`✅ Tunnel ready: ${publicUrl}`);
      ui.system('');
      ui.system('╔════════════════════════════════════════════════════╗');
      ui.system('  💬 Tell your friend to run:');
      ui.system('');
      ui.system(`     npx thindery/open-tap ${publicUrl}`);
      ui.system('');
      ui.system('  Or if they have it installed:');
      ui.system(`     export OPEN_TAP_RELAY=${publicUrl}`);
      ui.system('     tap');
      ui.system('╚════════════════════════════════════════════════════╝');
      ui.system('');
    } else {
      publicUrl = `ws://localhost:${PORT}`;
      ui.system('⚠️  No tunnel found (ngrok or localtunnel)');
      ui.system('   Install one for public access:');
      ui.system('     npm install -g ngrok');
      ui.system('   Or:');
      ui.system('     npm install -g localtunnel');
      ui.system('');
      ui.system('📝 For local testing only:');
      ui.system('   Same WiFi: Use your local IP');
      ui.system('   Find IP: ipconfig (Windows) or ifconfig (Mac/Linux)');
      ui.system('');
    }

    // Step 4: Start client
    ui.system('🔥 Connecting client to relay...');
    const client = new OpenTapClient(`ws://localhost:${PORT}`);

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
        case 'welcome':
          ui.system(`✅ Connected! Your ID: ${msg.clientId}`);
          if (tunnel) {
            ui.system(`💡 Share this ID with your friend`);
          }
          break;
      }
    });

    // Register commands
    let targetClient = null;

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
        ui.system('No target set. Use /target <clientId>');
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

    ui.command('id', 'Show my client ID', () => {
      ui.system(`My ID: ${client.clientId || 'Not connected'}`);
    });

    ui.command('quit', 'Exit', () => {
      ui.system('Shutting down...');
      client.disconnect();
      relay.kill();
      if (tunnel && tunnel.tunnel) {
        tunnel.tunnel.close();
      }
      ui.stop();
      process.exit(0);
    });

    // Connect client
    await client.connect();

    // Start UI
    ui.start();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      ui.system('Shutting down...');
      client.disconnect();
      relay.kill();
      if (tunnel && tunnel.tunnel) {
        tunnel.tunnel.close();
      }
      ui.stop();
      process.exit(0);
    });

  } catch (err) {
    ui.system(`Failed: ${err.message}`);
    process.exit(1);
  }
}

main();
