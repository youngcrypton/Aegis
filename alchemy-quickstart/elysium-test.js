/**
 * Alchemy API Quickstart: Elysium L2 Testnet (Chain ID 99801)
 * 
 * Verifies Alchemy connection to Elysium Testnet:
 * 1. Queries eth_chainId & current block height
 * 2. Fetches native HYPE balance (eth_getBalance)
 * 3. Fetches Canonical Testnet USDC balance (0x7D29...47b2)
 * 4. Tests alchemy_getTokenBalances on Elysium L2
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const apiKey = process.env.ALCHEMY_ELYSIUM_KEY || process.env.ALCHEMY_API_KEY;

if (!apiKey || apiKey.trim() === '' || apiKey === 'your_alchemy_api_key_here') {
  console.error('\n❌ ERROR: ALCHEMY_ELYSIUM_KEY (or ALCHEMY_API_KEY) is missing in your .env file.');
  process.exit(1);
}

// Target wallet address to inspect (can pass via CLI: node elysium-test.js 0xYourAddress)
// Defaults to the verified AEGIS testnet borrower address
const targetAddress = process.argv[2] || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Alchemy Elysium Testnet JSON-RPC endpoint
const endpoint = `https://elysium-testnet.g.alchemy.com/v2/${apiKey.trim()}`;

// Canonical Elysium Testnet USDC address
const CANONICAL_USDC = '0x7D29d8047B905000459c0E80c34a26CeedcB47b2';

async function rpcCall(method, params = [], id = 1) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

async function main() {
  console.log('====================================================');
  console.log('      Alchemy API — Elysium L2 Testnet Check        ');
  console.log('====================================================');
  console.log(`• Target Address:  ${targetAddress}`);
  console.log(`• Endpoint:        https://elysium-testnet.g.alchemy.com/v2/••••••••`);
  console.log('----------------------------------------------------');
  console.log('📡 Sending requests to Alchemy Elysium Testnet...\n');

  try {
    // 1. Verify Chain ID & Block Height
    const [chainIdRes, blockRes] = await Promise.all([
      rpcCall('eth_chainId', []),
      rpcCall('eth_blockNumber', [])
    ]);

    if (chainIdRes.error) {
      console.error('❌ Chain ID Error:', chainIdRes.error.message);
      return;
    }

    const chainIdDecimal = parseInt(chainIdRes.result, 16);
    const blockNumber = parseInt(blockRes.result, 16);

    console.log(`✅ Network Connected: Elysium L2 (Chain ID: ${chainIdDecimal})`);
    console.log(`📦 Latest Block:     #${blockNumber.toLocaleString()}`);

    // 2. Fetch Native HYPE Balance
    const balanceRes = await rpcCall('eth_getBalance', [targetAddress, 'latest']);
    const rawHypeWei = BigInt(balanceRes.result || '0x0');
    // Format 18 decimals
    const hypeFormatted = (Number(rawHypeWei) / 1e18).toFixed(4);
    console.log(`⚡ Native HYPE:      ${hypeFormatted} HYPE (Gas Asset)`);

    // 3. Fetch Canonical USDC Balance via ERC-20 balanceOf(targetAddress)
    // selector for balanceOf(address) is 0x70a08231
    const cleanAddress = targetAddress.replace(/^0x/, '').toLowerCase().padStart(64, '0');
    const callData = `0x70a08231${cleanAddress}`;

    const usdcRes = await rpcCall('eth_call', [
      { to: CANONICAL_USDC, data: callData },
      'latest'
    ]);

    if (usdcRes.result && usdcRes.result !== '0x') {
      const rawUsdc = BigInt(usdcRes.result);
      // Canonical USDC has 6 decimals
      const usdcFormatted = (Number(rawUsdc) / 1e6).toFixed(2);
      console.log(`💵 Canonical USDC:   $${usdcFormatted} USDC (0x7D29...47b2)`);
    }

    // 4. Test Alchemy Enhanced API (alchemy_getTokenBalances) on Elysium
    console.log('\n----------------------------------------------------');
    console.log('Testing Alchemy Token Balances API on Elysium...');
    try {
      const tokenBalRes = await rpcCall('alchemy_getTokenBalances', [targetAddress, 'erc20']);
      if (tokenBalRes.error) {
        console.log(`ℹ️  Note: Enhanced token API returned: ${tokenBalRes.error.message}`);
        console.log('   (Standard EVM RPC methods like eth_call & eth_getBalance work 100% on Elysium!)');
      } else if (tokenBalRes.result) {
        console.log(`✅ alchemy_getTokenBalances supported! Found ${tokenBalRes.result.tokenBalances.length} tokens.`);
      }
    } catch (e) {
      console.log(`ℹ️  Enhanced token method note: ${e.message}`);
    }

    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Request failed:', err.message);
    console.error('\n💡 Tip: Check if your Alchemy API Key has Elysium Testnet enabled:');
    console.error('   1. In your Alchemy dashboard, create an app for "Elysium Testnet".');
    console.error('   2. Copy the API key from that Elysium app into your .env file.\n');
  }
}

main();
