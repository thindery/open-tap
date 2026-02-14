/**
 * Open-Tap Terminal UI
 * Simple readline interface for bot interaction
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
   * Print incoming message
   */
  receive(from, payload) {
    this.print(`\n╔═══ Message from ${from} ═══╗`);
    this.print(`║ ${payload}`);
    this.print(`╚══════════════════════════╝\n`);
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
