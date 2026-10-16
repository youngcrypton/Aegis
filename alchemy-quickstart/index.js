/**
 * Alchemy API Quickstart: alchemy_getTokenBalances
 * 
 * Documentation: https://docs.alchemy.com/reference/alchemy-gettokenbalances
 * Network: Ethereum Mainnet
 */

require('dotenv').config();

const apiKey = process.env.ALCHEMY_API_KEY;

if (!apiKey || apiKey.trim() === '' || apiKey === 'your_alchemy_api_key_here') {
  console.error('\n❌ ERROR: ALCHEMY_API_KEY is missing or invalid in your .env file.');
  console.error('Please create a .env file in this directory with your Alchemy API key:');
  console.error('   ALCHEMY_API_KEY=your_actual_api_key\n');
  process.exit(1);
}

// Target wallet address to inspect (can be overridden via CLI argument: node index.js 0xYourAddress)
const targetAddress = process.argv[2] || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // vitalik.eth

// Alchemy Ethereum Mainnet JSON-RPC endpoint
const endpoint = `https://eth-mainnet.g.alchemy.com/v2/${apiKey.trim()}`;

async function main() {
  console.log('====================================================');
  console.log('       Alchemy API — alchemy_getTokenBalances       ');
  console.log('====================================================');
  console.log(`• Network:        Ethereum Mainnet`);
  console.log(`• Target Address: ${targetAddress}`);
  console.log(`• Endpoint:       https://eth-mainnet.g.alchemy.com/v2/••••••••`);
  console.log('----------------------------------------------------');
  console.log('📡 Sending JSON-RPC request to Alchemy...\n');

  const requestBody = {
    jsonrpc: '2.0',
    method: 'alchemy_getTokenBalances',
    params: [
      targetAddress,
      'erc20' // Can also be an array of specific token contract addresses: ['0xdac17f958d2ee523a2206206994597c13d831ec7']
    ],
    id: 1
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('❌ Alchemy API returned an error:');
      console.error(JSON.stringify(data.error, null, 2));
      return;
    }

    console.log('✅ Successfully received response from Alchemy:\n');
    console.log(JSON.stringify(data, null, 2));

    if (data.result && data.result.tokenBalances) {
      const balances = data.result.tokenBalances;
      console.log('\n====================================================');
      console.log(`📊 Summary: Found ${balances.length} token balances for ${targetAddress}`);

      // Filter out zero balances
      const nonZero = balances.filter(t => {
        if (!t.tokenBalance) return false;
        // Hex representation of zero
        const clean = t.tokenBalance.replace(/^0x0*/, '');
        return clean.length > 0;
      });

      console.log(`💰 Non-zero token balances: ${nonZero.length}`);
      console.log('----------------------------------------------------');

      if (nonZero.length > 0) {
        console.log('Top 10 non-zero token balances (raw hex values):');
        nonZero.slice(0, 10).forEach((item, index) => {
          console.log(`  ${(index + 1).toString().padStart(2, ' ')}. Token: ${item.contractAddress} | Balance (hex): ${item.tokenBalance}`);
        });
      }
      console.log('====================================================\n');
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

main();
