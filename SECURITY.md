# Security Policy & Vulnerability Disclosure

AEGIS Protocol is a non-custodial risk mitigation system managing high-value collateralized lending positions and perpetual hedging intents. Security, formal correctness, and invariant integrity are paramount.

---

## Supported Versions

Only the latest release of AEGIS Protocol smart contracts and keeper software is actively maintained for security patches:

| Component | Branch / Tag | Supported |
| :--- | :--- | :---: |
| Smart Contracts (`contracts/`) | `main` | :white_check_mark: |
| Sentinel Keeper Daemon (`keeper/`) | `main` | :white_check_mark: |
| Modular Adapters (`contracts/adapters/`) | `main` | :white_check_mark: |
| Deprecated Test Deployments | Older tags / commits | :x: |

---

## Reporting a Vulnerability

If you discover a security vulnerability, invariant violation, or unintended state transition within AEGIS Protocol, **do not disclose it publicly** (such as in GitHub issues, public Discord channels, or social media).

Please report security issues responsibly using one of the following channels:

* **GitHub Security Advisory:** Open a [Confidential Security Advisory](https://github.com/youngcrypton/Aegis/security/advisories/new) directly on GitHub.
* **Security Team Email:** `security@aegis.trade` (or reach out to core team leads via verified channels).
* **Direct Confidential Outreach:** Contact the AEGIS security leads on Telegram or Discord (`@youngcrypton`).

### When Submitting a Report, Please Include:

1. A clear description of the potential vulnerability or invariant flaw.
2. The specific contracts, functions, or lines of code affected.
3. Step-by-step instructions or a Foundry test case (`test/...`) reproducing the exploit scenario.
4. An assessment of potential impact (e.g., unauthorized collateral withdrawal, stuck funds, invariant failure, keeper denial of service).
5. Suggested remediation or patch, if known.

---

## Response Timeline & Coordination

* **Acknowledgment:** Within 24 hours of receiving your report.
* **Triage & Assessment:** Within 48 hours, confirming vulnerability severity and reproducing findings.
* **Remediation & Patching:** High/Critical severity issues receive immediate mitigation via timelock governance or emergency pauses.
* **Public Disclosure:** Following resolution and deployment of the fix, coordinated disclosure and recognition will be published in protocol audit notes.

---

## Bug Bounty Program

AEGIS values independent security researchers. Vulnerabilities identified in protocol smart contracts, invariant specifications, or off-chain keeper logic that lead to verifiable risk will be rewarded based on severity:

| Severity Level | Impact Definition | Potential Bounty |
| :--- | :--- | :--- |
| **Critical** | Direct theft of user vault collateral, bypass of non-custodial invariant INV-1, or permanent locking of funds. | Up to $50,000 |
| **High** | Manipulation of health factor calculations, evasion of slashing penalties, or unauthorized fee diversion. | Up to $20,000 |
| **Medium** | Keeper denial of service, griefing attacks resulting in degraded hedging performance, or minor fee leakage. | Up to $5,000 |
| **Low** | Non-critical edge cases, state inconsistencies without financial loss, or telemetry reporting errors. | Up to $1,000 |

*Rewards are determined at the sole discretion of the protocol governance team based on impact, novel proof-of-concept, and quality of report.*
