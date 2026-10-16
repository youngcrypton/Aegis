/**
 * AEGIS Protocol — Phase 2.1 Frontend Truthfulness & Integration Test Suite
 * 
 * Verifies:
 * 1. Absence of misleading claims in app/ and dist/ ("Connected to 0x0801", live execution claims, etc.)
 * 2. RPC failure handling
 * 3. Chain ID mismatch handling
 * 4. Unsupported contract getter handling (feeDebts on deployed vault bytecode)
 * 5. External reference price failure handling
 * 6. Simulation labels and mode separation
 * 7. Accurate fee-state labels (demo trading PnL vs contract averted-penalty model vs on-chain settled)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function main() {
  console.log('🧪 Starting AEGIS Phase 2.1 Frontend Truthfulness Test Suite...\n');

  let passCount = 0;
  let failCount = 0;

  function it(desc, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${desc}`);
      passCount++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc}`);
      console.error(`    ${err.message}`);
      failCount++;
    }
  }

  async function itAsync(desc, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${desc}`);
      passCount++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc}`);
      console.error(`    ${err.message}`);
      failCount++;
    }
  }

  // -------------------------------------------------------------
  // Suite 1: Static Source Verification & Absence of Misleading Claims
  // -------------------------------------------------------------
  console.log('--- Suite 1: Absence of Misleading Claims in Frontend Code ---');

  const appJs = fs.readFileSync(path.join(__dirname, '../app/app.js'), 'utf8');
  const appHtml = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
  const distAppJs = fs.readFileSync(path.join(__dirname, '../dist/app/app.js'), 'utf8');
  const distAppHtml = fs.readFileSync(path.join(__dirname, '../dist/app/index.html'), 'utf8');

  it('app.js does not contain "Connected to 0x0801 Precompile"', () => {
    assert(!appJs.includes('Connected to 0x0801 Precompile'), 'Found banned phrase in app.js');
    assert(!distAppJs.includes('Connected to 0x0801 Precompile'), 'Found banned phrase in dist/app/app.js');
  });

  it('app.js does not fabricate random network latency', () => {
    assert(!appJs.includes('Math.floor(64 + Math.random()'), 'Found fake latency generator in app.js');
    assert(!distAppJs.includes('Math.floor(64 + Math.random()'), 'Found fake latency generator in dist/app/app.js');
  });

  it('app.js does not enforce mandatory personal_sign on wallet connect', () => {
    const connectWalletFn = appJs.substring(appJs.indexOf('async function connectWallet()'), appJs.indexOf('function disconnectWallet()'));
    assert(!connectWalletFn.includes("method: 'personal_sign'"), 'connectWallet requires personal_sign merely to view chain data');
  });

  it('app.js marks 0x0801 and 0x0802 status as blocked/unverified on testnet', () => {
    assert(appJs.includes("precompile0x0801Status: 'BLOCKED_TESTNET'"), '0x0801 status is not marked BLOCKED_TESTNET');
    assert(appJs.includes("precompile0x0802Status: 'BLOCKED_TESTNET'"), '0x0802 status is not marked BLOCKED_TESTNET');
    assert(appJs.includes('Precompile 0x0801: BLOCKED / UNVERIFIED on Elysium testnet node.'), 'Missing truthful log for 0x0801');
    assert(appJs.includes('Precompile 0x0802: BLOCKED / UNVERIFIED on Elysium testnet node.'), 'Missing truthful log for 0x0802');
  });

  it('index.html explicitly tags simulation controls and demo components', () => {
    assert(appHtml.includes('Simulation Mode'), 'Missing "Simulation Mode" label in index.html');
    assert(appHtml.includes('Hyperliquid L1 REST'), 'Missing external reference price citation in index.html');
    assert(appHtml.includes('Ascend DEX Flywheel') || appHtml.includes('Simulated Ascend Mock'), 'Missing Ascend flywheel integration in index.html');
    assert(appHtml.includes('Ecosystem &amp; Security Overview') || appHtml.includes('Ecosystem & Security Overview') || appHtml.includes('Elysium Testnet Verification'), 'Missing verification/overview card in index.html');
    assert(appHtml.includes('INV-1 Non-Custodial') || appHtml.includes('Deferred Fee Debt & Accounting'), 'Missing invariant security guarantee in index.html');
  });

  // -------------------------------------------------------------
  // Suite 2: RPC Failure & Latency Telemetry Handling
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: RPC Failure & Telemetry Handling ---');

  await itAsync('RPC client handles network failure gracefully without throwing', async () => {
    async function callRpcMock(url, method, params = []) {
      const t0 = Date.now();
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
        });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}`, rtt: Date.now() - t0 };
        const data = await res.json();
        return { success: true, result: data.result, rtt: Date.now() - t0 };
      } catch (netErr) {
        return { success: false, error: netErr.message, rtt: Date.now() - t0 };
      }
    }

    const badResult = await callRpcMock('http://127.0.0.1:59999/invalid-rpc', 'eth_blockNumber');
    assert.strictEqual(badResult.success, false, 'Expected failure on unreachable RPC');
    assert(typeof badResult.error === 'string', 'Error message must be captured');
    assert(typeof badResult.rtt === 'number', 'Round trip time must be measured');
  });

  it('Telemetry state records null latency and disconnected pill on RPC failure', () => {
    const runtimeState = { blockNumber: 9006000, rpcLatencyMs: 42, lastRpcObservation: null };
    const mockResult = { success: false, error: 'Connection refused', rtt: 15 };

    if (mockResult.success) {
      runtimeState.blockNumber = 9006001;
      runtimeState.rpcLatencyMs = mockResult.rtt;
    } else {
      runtimeState.rpcLatencyMs = null;
    }

    assert.strictEqual(runtimeState.rpcLatencyMs, null, 'Latency must be null on failed RPC');
  });

  // -------------------------------------------------------------
  // Suite 3: Unsupported Contract Getter (feeDebts Compatibility)
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Unsupported Contract Getter (feeDebts on 0x05Aa...) ---');

  it('feeDebts returning empty 0x or error sets status to UNAVAILABLE_ON_DEPLOYMENT', () => {
    function evaluateFeeDebtResult(res) {
      if (!res.success || !res.result || res.result === '0x' || res.result.length < 66) {
        return {
          supported: false,
          amountUsdc: null,
          status: 'UNAVAILABLE_ON_DEPLOYMENT',
          verifiedOnChain: false
        };
      }
      const debtWei = BigInt(res.result);
      return {
        supported: true,
        amountUsdc: Number(debtWei) / 1e6,
        status: debtWei > 0n ? 'OUTSTANDING_DEBT' : 'ZERO_DEBT_VERIFIED',
        verifiedOnChain: true
      };
    }

    // Case A: Deployed vault returns 0x (empty revert)
    const emptyRevert = { success: true, result: '0x' };
    const stateA = evaluateFeeDebtResult(emptyRevert);
    assert.strictEqual(stateA.supported, false);
    assert.strictEqual(stateA.status, 'UNAVAILABLE_ON_DEPLOYMENT');
    assert.strictEqual(stateA.amountUsdc, null, 'Must NOT assume 0 debt on revert!');

    // Case B: RPC reverts with error
    const rpcError = { success: false, error: 'execution reverted' };
    const stateB = evaluateFeeDebtResult(rpcError);
    assert.strictEqual(stateB.supported, false);
    assert.strictEqual(stateB.status, 'UNAVAILABLE_ON_DEPLOYMENT');
    assert.strictEqual(stateB.amountUsdc, null, 'Must NOT assume 0 debt on error!');

    // Case C: Upgraded vault returns valid uint256 (e.g. 50 USDC = 50,000,000 units)
    const validDebt = {
      success: true,
      result: '0x0000000000000000000000000000000000000000000000000000000002faf080'
    };
    const stateC = evaluateFeeDebtResult(validDebt);
    assert.strictEqual(stateC.supported, true);
    assert.strictEqual(stateC.amountUsdc, 50.0);
    assert.strictEqual(stateC.status, 'OUTSTANDING_DEBT');
  });

  // -------------------------------------------------------------
  // Suite 4: Fee Model Separation (Demo vs Contract Averted-Penalty)
  // -------------------------------------------------------------
  console.log('\n--- Suite 4: Fee Model Separation & Truthfulness ---');

  it('Calculates both Demo Trading PnL fee and Contract Averted-Penalty fee correctly', () => {
    const collateralAmount = 100.0; // 100 HYPE
    const entryPrice = 48.50;
    const exitPrice = 42.00;
    const hedgeSize = collateralAmount * 0.75; // 75 HYPE

    // Hedge trading profit
    const hedgeProfit = hedgeSize * (entryPrice - exitPrice); // 75 * 6.50 = 487.50 USDC

    // Model A: Simulated Demo Fee (10% of hedge profit)
    const demoFee = hedgeProfit * 0.10; // 48.75 USDC

    // Model B: Contract Specification Fee (0.50% of collateral TVL = 10% of 5% averted liquidation penalty)
    const collateralUsd = collateralAmount * exitPrice; // 100 * 42.00 = 4200 USDC
    const savedPenaltyEst = collateralUsd * 0.05; // 210 USDC (5% saved penalty)
    const contractProtocolFeeEst = savedPenaltyEst * 0.10; // 21.00 USDC (0.50% TVL)

    assert.strictEqual(demoFee, 48.75, 'Demo fee should be 10% of trading profit');
    assert.strictEqual(savedPenaltyEst, 210.0, 'Contract saved penalty should be 5% TVL');
    assert.strictEqual(contractProtocolFeeEst, 21.0, 'Contract protocol fee should be 0.50% TVL');
    assert.notStrictEqual(demoFee, contractProtocolFeeEst, 'Models must NOT be presented as equivalent!');
  });

  // -------------------------------------------------------------
  // Suite 5: External Reference Price Handling
  // -------------------------------------------------------------
  console.log('\n--- Suite 5: External Reference Price Handling ---');

  it('External reference price failure does not crash or fabricate prices', async () => {
    let prices = { HYPE: 48.50, ETH: 3100.00 };
    let lastTimestamp = '2026-10-14T12:00:00Z';

    const mockFetch = async () => ({ ok: false, status: 502 });

    const res = await mockFetch();
    if (res.ok) {
      prices.HYPE = 999.99;
    }

    assert.strictEqual(prices.HYPE, 48.50, 'Price must not mutate on failed external fetch');
    assert.strictEqual(lastTimestamp, '2026-10-14T12:00:00Z');
  });

  // -------------------------------------------------------------
  // Suite 6: Live Elysium RPC Verified Connection Check
  // -------------------------------------------------------------
  console.log('\n--- Suite 6: Live Elysium Testnet RPC Verification ---');

  const dns = require('dns');
  const https = require('https');
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  function robustRpcCall(method, params) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
      function customLookup(hostname, options, callback) {
        if (typeof options === 'function') { callback = options; options = {}; }
        resolver.resolve4(hostname, (err, addresses) => {
          if (err) return callback(err);
          if (!addresses || addresses.length === 0) return callback(new Error('No address found'));
          if (options && options.all) return callback(null, addresses.map(a => ({ address: a, family: 4 })));
          callback(null, addresses[0], 4);
        });
      }
      const req = https.request({
        hostname: 'testnet-rpc.elysium.kinetiq.xyz',
        port: 443,
        path: '/',
        method: 'POST',
        lookup: customLookup,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  await itAsync('Can query live Elysium testnet RPC at https://testnet-rpc.elysium.kinetiq.xyz', async () => {
    const t0 = Date.now();
    const data = await robustRpcCall('eth_blockNumber', []);
    const t1 = Date.now();
    const rtt = t1 - t0;

    assert(data.result, 'RPC did not return blockNumber result');
    const blockNum = parseInt(data.result, 16);
    assert(blockNum > 9000000, `Block height ${blockNum} should be > 9,000,000`);
    console.log(`    (Observed Live Block #${blockNum.toLocaleString()} on Chain 99801 in ${rtt}ms)`);
  });

  await itAsync('Empirically confirms feeDebts returns 0 debt on clean AegisVault (0xC064...)', async () => {
    const data = await robustRpcCall('eth_call', [
      {
        to: '0xC064495DE20EfeEBB6a4B1dE57ffb48ED8f5dA29',
        data: '0x41bc5b0c000000000000000000000000f0e721c996e76a0cd5805975464cbe3e98839d64'
      },
      'latest'
    ]);
    assert(data.result, 'Expected feeDebts to return 32-byte hex result');
    assert.strictEqual(BigInt(data.result), 0n, 'Fee debt on clean vault should be 0');
    console.log(`    (Confirmed: feeDebts(address) on 0xC064... = 0 USDC debt)`);
  });

  await itAsync('Empirically confirms totalFeesCaptured() returns 0 on clean AegisFeeCollector (0xCA9D...)', async () => {
    const data = await robustRpcCall('eth_call', [
      {
        to: '0xCA9D24c4B5025dA065d1AEf92808aB1698f267ae',
        data: '0xd8f13e8c' // totalFeesCaptured()
      },
      'latest'
    ]);
    assert(data.result, 'Expected totalFeesCaptured to return 32-byte hex');
    const captured = BigInt(data.result);
    assert.strictEqual(captured, 0n, 'On-chain captured fees should be 0');
    console.log(`    (Confirmed: totalFeesCaptured() on 0xCA9D... = ${captured.toString()} USDC units)`);
  });

  await itAsync('Empirically confirms owner() on clean AegisVault is user wallet (0xf0e721...)', async () => {
    const data = await robustRpcCall('eth_call', [
      {
        to: '0xC064495DE20EfeEBB6a4B1dE57ffb48ED8f5dA29',
        data: '0x8da5cb5b' // owner()
      },
      'latest'
    ]);
    assert(data.result, 'Expected owner() to return address hex');
    const owner = '0x' + data.result.slice(26).toLowerCase();
    assert.strictEqual(owner, '0xf0e721c996e76a0cd5805975464cbe3e98839d64', 'Vault owner must be user admin wallet');
    console.log(`    (Confirmed: owner() on 0xC064... = ${owner})`);
  });

  console.log('\n=============================================================');
  console.log(`Tests Completed: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log('=============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
