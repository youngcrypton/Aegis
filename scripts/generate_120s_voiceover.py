import os
import asyncio
import edge_tts

VOICE = "en-US-ChristopherNeural"
OUTPUT_DIR = r"c:\Users\ascend X elysium\remotion\public\audio_120s"

SCRIPTS = {
    "act1_problem.mp3": (
        "Every bull run, billions of dollars in borrower collateral are wiped out by sudden cascade liquidations. "
        "Traditional money markets penalize you eight to fifteen percent when the market dips. "
        "But what if your collateral could defend itself? Welcome to AEGIS Protocol."
    ),
    "act2_architecture.mp3": (
        "Built natively on Elysium Orbit L-two and powered by HyperCore, AEGIS is an autonomous, high-frequency risk sentinel. "
        "Under Invariant INV-One, users delegate ephemeral, trade-only session keys. "
        "Sentinels can never withdraw your assets. They have exactly one job: open a delta-neutral short hedge the moment volatility threatens your position."
    ),
    "act3_product_tour.mp3": (
        "AEGIS delivers dual-layer execution. In Lite Auto-Pilot, everyday borrowers activate non-custodial protection in a single click. "
        "For institutional traders, our Pro Terminal delivers live HyperCore orderbook depth, custom trigger thresholds, and real-time health factor monitoring driven by our verified on-chain vault contracts."
    ),
    "act4_flash_crash.mp3": (
        "Watch what happens during a sudden eighteen percent flash crash. "
        "As mark price plunges, the health factor hits the one point one five threshold. "
        "In under seventy-eight milliseconds, our keeper sentinel executes an off-chain orderbook short on HyperCore. "
        "The position is locked in delta-neutral defense. Zero liquidation. Zero penalty."
    ),
    "act5_unwind.mp3": (
        "When the market stabilizes, AEGIS doesn't leave you stranded. "
        "The autonomous trailing take-profit unwinds the short into strength, capturing trading profit directly back into your collateral and restoring health to safe ground. "
        "Twenty percent of protocol fees are permanently burned, driving value directly to AEGIS stakers."
    ),
    "act6_outro.mp3": (
        "AEGIS Protocol is live on Elysium L-two testnet with fully verified smart contracts and one hundred and sixteen passing tests. "
        "Test the live terminal today at aegishedge dot xyz. Never get liquidated again."
    )
}

async def generate_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for filename, text in SCRIPTS.items():
        out_path = os.path.join(OUTPUT_DIR, filename)
        print(f"Generating {filename}...")
        communicate = edge_tts.Communicate(text, VOICE, rate="+3%", volume="+15%")
        await communicate.save(out_path)
        print(f"Done: {out_path}")

if __name__ == "__main__":
    asyncio.run(generate_all())
