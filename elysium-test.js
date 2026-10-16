/**
 * Root workspace wrapper for Elysium Alchemy Test
 * Forwards execution to alchemy-quickstart/elysium-test.js
 */
const { fork } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'alchemy-quickstart', 'elysium-test.js');
const args = process.argv.slice(2);

const child = fork(scriptPath, args, {
  cwd: path.join(__dirname, 'alchemy-quickstart')
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
