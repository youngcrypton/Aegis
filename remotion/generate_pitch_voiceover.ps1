Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 2  # Crisp, professional tech demo cadence (Rate 2)

$outDir = "remotion/public/audio_pitch"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force
}

$ch1Text = "Welcome to AEGIS, the first autonomous risk engine eliminating forced liquidations in DeFi. Live on Elysium Layer 2, our terminal connects directly to HyperCore Precompile 0x0801, streaming mark prices in sub-78 milliseconds. On screen, our vault holds 1,000 HYPE collateral and $32,000 USDC debt, maintaining a safe 1.41 Health Factor on our live radial gauge."

$ch2Text = "For everyday borrowers, the main user experience is our 1-Click Lite Auto-Pilot. Calibrated for testnet faucet micro-deposits, users select Conservative, Balanced, or Aggressive presets. Activating the shield delegates an ephemeral session key under Invariant INV-1, mathematically restricted to trade-only hedging with zero permission to withdraw collateral."

$ch3Text = "For institutional quants, the Pro Terminal unlocks granular parameters: customizable trigger prices, delta coverage ratios from 10% to 100%, and trailing profit locks. Below, our terminal streams the live central limit order book directly from HyperCore, monitoring sub-tick execution depth."

$ch4Text = "Now for our core functionality: eliminating liquidation loss. During a live -18% flash crash simulation, as price drops toward liquidation, the Health Factor falls below 1.15. In under 78 milliseconds, our Sentinel dispatches an atomic short hedge via Predeploy 0x0802 on HyperCore. The short absorbs the drop dollar-for-dollar. Spot collateral remains 100% safe."

$ch5Text = "When the market rebounds by our 1.5% trailing buffer, AEGIS automatically buys back the short, locking in cash profits. 90% of gains pay down debt, restoring the Health Factor above 1.25. Borrowers retain an atomic Manual Override killswitch under Invariant INV-3. With 5 formal invariants verified over 160,000 fuzz runs, AEGIS eliminates liquidation loss forever."

$chapters = @(
    @{ Name = "pitch_ch1.wav"; Text = $ch1Text },
    @{ Name = "pitch_ch2.wav"; Text = $ch2Text },
    @{ Name = "pitch_ch3.wav"; Text = $ch3Text },
    @{ Name = "pitch_ch4.wav"; Text = $ch4Text },
    @{ Name = "pitch_ch5.wav"; Text = $ch5Text }
)

foreach ($c in $chapters) {
    $filePath = Join-Path $outDir $c.Name
    $synth.SetOutputToWaveFile($filePath)
    $synth.Speak($c.Text)
    Write-Host "Generated: $filePath"
}

$synth.Dispose()
Write-Host "Calibrated pitch demo audio tracks generated successfully!"
