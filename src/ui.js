/**
 * Open-Tap Terminal UI
 * Simple readline interface for bot interaction with reliability indicators
 * v0.0.3 - Message status display
 */

const readline = require('readline');

class TerminalUI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.running = false;
    this.commands = new Map();
    this.promptText = '> ';
    
    // Track message statuses for display
    this.messageStatuses = new Map(); // msgId -> { status, peerGuid }
    
    // Color codes
    this.colors = {
      reset: '\x1b[0m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m'
    };
  }

  /**
   * Register a command handler
   */
  command(name, description, handler) {
    this.commands.set(name, { description, handler });
  }

  /**
   * Print message to console (no prompt interference)
   */
  print(text) {
    // Clear current line and move cursor up
    process.stdout.write('\r\x1b[K');
    console.log(text);
  }

  /**
   * Print system message
   */
  system(msg) {
    this.print(`[${new Date().toLocaleTimeString()}] ${msg}`);
  }

  /**
   * Get status indicator
   */
  getStatusIndicator(status) {
    const { green, yellow, red, cyan, dim, reset } = this.colors;
    
    switch (status) {
      case 'acked':
        return `${green}[ACK]${reset}`;
      case 'queued':
        return `${yellow}[QUEUED]${reset}`;
      case 'failed':
        return `${red}[FAILED]${reset}`;
      case 'pending':
        return `${cyan}[PENDING]${reset}`;
      case 'retry':
        return `${yellow}[RETRY]${reset}`;
      default:
        return `${dim}[SENT]${reset}`;
    }
  }

  /**
   * Track message status
   */
  trackMessage(messageId, peerGuid, status = 'pending') {
    if (!messageId) return;
    this.messageStatuses.set(messageId, { status, peerGuid, timestamp: Date.now() });
  }

  /**
   * Update message status
   */
  updateMessageStatus(messageId, status) {
    if (!messageId || !this.messageStatuses.has(messageId)) return;
    
    const current = this.messageStatuses.get(messageId);
    current.status = status;
    current.timestamp = Date.now();
    
    // Show status update inline
    const statusIndicator = this.getStatusIndicator(status);
    const shortId = messageId.split('-').pop() || messageId.slice(0, 8);
    this.print(`  ${statusIndicator} Message ${shortId}... ${status}`);
  }

  /**
   * Print incoming message
   */
  receive(from, payload, messageId = null) {
    const { cyan, reset, gray } = this.colors;
    const msgIdStr = messageId ? ` [${messageId.slice(-8)}]` : '';
    
    this.print(`\n${cyan}╔═══ Message from ${from}${msgIdStr} ═══${reset}`);
    this.print(`║ ${payload}`);
    this.print(`╚══════════════════════════╝\n`);
  }

  /**
   * Print sent message with status
   */
  sent(peerGuid, payload, result) {
    const { gray, reset } = this.colors;
    const shortGuid = peerGuid.slice(0, 12);
    
    if (result?.messageId) {
      this.trackMessage(result.messageId, peerGuid, result.status);
    }
    
    const status = result?.status || 'sent';
    const indicator = this.getStatusIndicator(status);
    
    this.print(`\n${gray}→ To ${shortGuid}...${reset} ${indicator}`);
    this.print(`  ${payload}`);
  }

  /**
   * Show reliability stats
   */
  showReliabilityStats(stats) {
    const { green, yellow, red, cyan, gray, reset } = this.colors;
    
    this.print(`${gray}─ Reliability Status ─${reset}`);
    
    if (stats) {
      this.print(`  ${green}●${reset} Connected: ${stats.incoming + stats.outgoing}`);
      if (stats.reliability) {
        const rel = stats.reliability;
        if (rel.pending > 0) this.print(`  ${cyan}${rel.pending}${reset} pending`);
        if (rel.queued > 0) this.print(`  ${yellow}${rel.queued}${reset} queued`);
        if (rel.failed > 0) this.print(`  ${red}${rel.failed}${reset} failed`);
        this.print(`  ${gray}${rel.dedupWindow}${reset} dedup window`);
      }
    }
    
    this.print(`${gray}  ACK timeout: 5s | Max retries: 3${reset}`);
    this.print(`${gray}  Backoff: 1s, 2s, 4s | Queue: in-memory${reset}`);
  }

  /**
   * Show help
   */
  showHelp() {
    this.print('\n╔═══ Open-Tap Commands ═══╗');
    this.print('  KEY COMMAND: /reply <msg>  → Reply to last peer (no ID needed!)');
    this.print('');
    for (const [name, { description }] of this.commands) {
      this.print(`  /${name.padEnd(12)} ${description}`);
    }
    this.print('╚═════════════════════════╝\n');
    
    this.showReliabilityStats();
    this.print('');
  }

  /**
   * Start the UI loop
   */
  start() {
    this.running = true;
    this.showHelp();
    this.loop();
  }

  /**
   * Main input loop
   */
  loop() {
    if (!this.running) return;

    this.rl.question(this.promptText, (input) => {
      const trimmed = input.trim();

      // Empty input
      if (!trimmed) {
        this.loop();
        return;
      }

      // Command
      if (trimmed.startsWith('/')) {
        const parts = trimmed.slice(1).split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        if (this.commands.has(cmd)) {
          const { handler } = this.commands.get(cmd);
          try {
            handler(args, trimmed.slice(cmd.length + 2));
          } catch (err) {
            this.system(`Error: ${err.message}`);
          }
        } else if (cmd === 'help' || cmd === 'h') {
          this.showHelp();
        } else {
          this.system(`Unknown command: /${cmd}. Type /help for available commands.`);
        }
      } else {
        // Default: message to send
        this.system(`Use /to <clientId> <message> to send`);
      }

      this.loop();
    });
  }

  /**
   * Stop the UI
   */
  stop() {
    this.running = false;
    this.rl.close();
  }

  /**
   * Ask a question and return answer
   */
  ask(question) {
    return new Promise((resolve) => {
      this.rl.question(`${question} `, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

module.exports = { TerminalUI };
