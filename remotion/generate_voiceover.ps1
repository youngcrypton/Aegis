Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 2  # Crisp, professional tech demo cadence

$outDir = "remotion/public/audio"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force
}

$ch1Text = "Welcome to the live product demonstration of AEGIS, the first autonomous, non-custodial risk engine engineered to eliminate forced liquidations in DeFi. We are live on the Elysium Layer 2 testnet on Chain ID 99801. Our terminal connects directly to HyperCore Precompile 0x0801, streaming mark prices in sub-78 milliseconds from L1 consensus. On screen, our vault holds 1,000 HYPE collateral and $32,000 USDC debt, maintaining a safe Health Factor of 1.41 on our dynamic radial gauge."

$ch2Text = "For everyday borrowers, AEGIS provides the 1-Click Lite Auto-Pilot. Users select from three mathematically modeled defense presets: Conservative at health factor 1.25, Aggressive at 1.08, or Balanced at 1.15. We pick the 0.05 HYPE micro-deposit chip, calibrated for the Elysium testnet faucet cap. Clicking Activate Shield delegates an ephemeral session key under Invariant INV-1, strictly restricted to trade-only hedging with zero permission to withdraw collateral."

$ch3Text = "For institutional quants, the Pro Terminal unlocks granular algorithmic parameters. Traders set exact collateral price triggers, health thresholds, delta coverage ratios from 10% to 100%, and trailing profit locks. Below, our terminal streams the live 10-level Central Limit Orderbook directly from HyperCore, showing sub-tick liquidity and execution depth."

$ch4Text = "Now, let's witness AEGIS under extreme volatility. We trigger a live -18% flash crash simulation. As the price falls toward the $40 liquidation barrier, the Health Factor drops below our 1.15 threshold. In under 78 milliseconds, the Sentinel engine detects the breach and dispatches an atomic short hedge via Predeploy 0x0802. In the Active Hedge panel, our short position absorbs the drop dollar-for-dollar. Spot collateral remains 100% safe."

$ch5Text = "Next, the market bottoms out at $34.50 and rebounds. The moment price bounces by our 1.5% trailing buffer, the take-profit trigger fires automatically. The short hedge buys back on the orderbook, locking in cash profits. 90% of net profits pay down debt, restoring the Health Factor comfortably above 1.25. The 10% performance fee splits under Invariant INV-4: 50% burned via Ascend Hook Pools, and 50% paid as real yield to bonded Sentinel stakers."

$ch6Text = "Finally, safety is non-negotiable. Under Invariant INV-3, borrowers retain an atomic single-transaction Manual Override killswitch to instantly revoke keys. In the audit terminal, every intent is signed via EIP-712 with strictly monotonic nonces under Invariant INV-5, preventing replay attacks. AEGIS eliminates liquidation loss forever. Explore the live terminal at aegis.trade."

$chapters = @(
    @{ Name = "ch1.wav"; Text = $ch1Text },
    @{ Name = "ch2.wav"; Text = $ch2Text },
    @{ Name = "ch3.wav"; Text = $ch3Text },
    @{ Name = "ch4.wav"; Text = $ch4Text },
    @{ Name = "ch5.wav"; Text = $ch5Text },
    @{ Name = "ch6.wav"; Text = $ch6Text }
)

foreach ($c in $chapters) {
    $filePath = Join-Path $outDir $c.Name
    $synth.SetOutputToWaveFile($filePath)
    $synth.Speak($c.Text)
    Write-Host "Generated: $filePath"
}

$synth.Dispose()
Write-Host "All calibrated audio tracks generated successfully!"
