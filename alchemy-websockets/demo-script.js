/**
 * Alchemy Smart WebSockets Demo on Elysium Testnet
 * 
 * Documentation: https://docs.alchemy.com/reference/subscription-api
 * Network: Elysium Testnet (Chain ID 99801)
 * Endpoint: wss://elysium-testnet.g.alchemy.com/v2/$ALCHEMY_API_KEY
 */

const path = require('path');
const fs = require('fs');
const dns = require('dns');
const WebSocket = require('ws');

// Prefer IPv4 resolution to prevent local EAI_AGAIN DNS glitches
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// 1. Load environment variables using dotenv
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

// Fallback to reading .env directly if needed
if (!process.env.ALCHEMY_API_KEY && fs.existsSync(path.join(__dirname, '.env'))) {
  const content = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

// 2. Read ALCHEMY_API_KEY strictly from environment variable
const apiKey = process.env.ALCHEMY_API_KEY || process.env.ALCHEMY_ELYSIUM_KEY;

if (!apiKey || apiKey.trim() === '' || apiKey === 'your_alchemy_api_key_here') {
  console.error('\n❌ ERROR: ALCHEMY_API_KEY is missing in your .env file.');
  console.error('Please create a .env file in this directory with:');
  console.error('   ALCHEMY_API_KEY=your_actual_api_key\n');
  process.exit(1);
}

// Alchemy Elysium Testnet Smart WebSocket URL
const wsUrl = `wss://elysium-testnet.g.alchemy.com/v2/${apiKey.trim()}`;

console.log('====================================================');
console.log('       Alchemy Smart WebSockets — Elysium L2        ');
console.log('====================================================');
console.log(`• Network:  Elysium Testnet (Chain ID 99801)`);
console.log(`• Protocol: Smart WebSockets (wss://)`);
console.log(`• Endpoint: wss://elysium-testnet.g.alchemy.com/v2/••••••••`);
console.log('----------------------------------------------------');
// Configure resilient DNS resolver (Google 8.8.8.8 & Cloudflare 1.1.1.1)
// to prevent local ISP/Windows getaddrinfo EAI_AGAIN timeouts
const resolver = new dns.Resolver();
try {
  resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  resolver.resolve4(hostname, (err, addrs) => {
    if (!err && addrs && addrs.length > 0) {
      if (options && options.all) {
        return callback(null, addrs.map(a => ({ address: a, family: 4 })));
      }
      return callback(null, addrs[0], 4);
    }
    dns.lookup(hostname, options, callback);
  });
}

const ws = new WebSocket(wsUrl, { lookup: customLookup });

let subscriptionId = null;
let blockCount = 0;

// When the WebSocket connection opens
ws.on('open', () => {
  console.log('🟢 Connected to Alchemy Smart WebSocket successfully!');
  console.log('📡 Subscribing to real-time new block headers (newHeads)...\n');

  // Payload to subscribe to newHeads
  const subscribePayload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_subscribe',
    params: ['newHeads']
  };

  ws.send(JSON.stringify(subscribePayload));
});

// When a message is received from Alchemy
ws.on('message', (data) => {
  try {
    const response = JSON.parse(data.toString());

    // Case 1: Subscription Confirmation
    if (response.id === 1 && response.result) {
      subscriptionId = response.result;
      console.log(`✅ Subscription Confirmed!`);
      console.log(`🔑 Subscription ID: ${subscriptionId}`);
      console.log('⏳ Streaming live block updates from Elysium L2 (Press Ctrl+C to stop)...\n');
      console.log('----------------------------------------------------');
      return;
    }

    // Case 2: Real-time Event Stream (newHeads notifications)
    if (response.method === 'eth_subscription' && response.params) {
      const header = response.params.result;
      blockCount++;

      const blockNumber = parseInt(header.number, 16);
      const timestamp = new Date(parseInt(header.timestamp, 16) * 1000).toLocaleTimeString();
      const gasUsed = parseInt(header.gasUsed || '0x0', 16);
      const gasLimit = parseInt(header.gasLimit || '0x0', 16);

      console.log(`📦 [Block #${blockCount}] New Elysium Block Mined!`);
      console.log(`   • Block Number:  #${blockNumber.toLocaleString()} (${header.number})`);
      console.log(`   • Block Hash:    ${header.hash}`);
      console.log(`   • Timestamp:     ${timestamp}`);
      console.log(`   • Gas Used:      ${gasUsed.toLocaleString()} / ${gasLimit.toLocaleString()}`);
      console.log(`   • Parent Hash:   ${header.parentHash}`);
      console.log('----------------------------------------------------');
    } else {
      // General response
      console.log('📥 Received message:', JSON.stringify(response, null, 2));
    }
  } catch (err) {
    console.error('❌ Failed to parse message:', err.message);
  }
});

// Handle WebSocket Errors
ws.on('error', (error) => {
  console.error('❌ WebSocket Error:', error.message);
});

// Handle Connection Close
ws.on('close', (code, reason) => {
  console.log(`\n🔴 WebSocket Connection Closed (Code: ${code}, Reason: ${reason || 'None'})`);
});

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Disconnecting from Alchemy Smart WebSocket...');
  if (ws.readyState === WebSocket.OPEN && subscriptionId) {
    // Gracefully unsubscribe
    const unsubscribePayload = {
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_unsubscribe',
      params: [subscriptionId]
    };
    ws.send(JSON.stringify(unsubscribePayload));
    setTimeout(() => {
      ws.close();
      console.log('👋 Goodbye!\n');
      process.exit(0);
    }, 500);
  } else {
    ws.close();
    process.exit(0);
  }
});
