/**
 * Root workspace wrapper for Alchemy Smart WebSockets
 * Forwards execution to alchemy-websockets/demo-script.js
 */
const { fork } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'alchemy-websockets', 'demo-script.js');
const args = process.argv.slice(2);

const child = fork(scriptPath, args, {
  cwd: path.join(__dirname, 'alchemy-websockets')
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
