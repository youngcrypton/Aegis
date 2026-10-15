import { ethers } from "ethers";
import { OrderSigner, HedgeIntentParams, HEDGE_INTENT_TYPES } from "../src/order_signer";

describe("EIP-712 Unwind Signature & Digest Consistency", () => {
  // Ephemeral test key (Anvil #9 test key for pure local mathematical testing)
  const testPrivateKey = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
  const testWallet = new ethers.Wallet(testPrivateKey);
  const verifyingContract = "0x05Aa229Aec102f78CE0E852A812a388F076Aa555";
  const chainId = 99801;

  let signer: OrderSigner;

  beforeEach(() => {
    signer = new OrderSigner(testPrivateKey, verifyingContract, chainId);
  });

  it("should configure EIP-712 domain matching OpenZeppelin TradeIntentExecutor exactly", () => {
    const domain = (signer as any).domain;
    expect(domain.name).toBe("AEGIS Protocol");
    expect(domain.version).toBe("1.0.0");
    expect(domain.chainId).toBe(99801);
    expect(domain.verifyingContract).toBe(verifyingContract);
  });

  it("should define HedgeIntent type matching Solidity HEDGE_INTENT_TYPEHASH", () => {
    expect(HEDGE_INTENT_TYPES.HedgeIntent).toEqual([
      { name: "vault", type: "address" },
      { name: "perpIndex", type: "uint32" },
      { name: "size", type: "int256" },
      { name: "limitPrice", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ]);
  });

  it("should sign an unwind intent with positive hedge size matching contract verification", async () => {
    const vaultOwner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const hedgeSize = ethers.parseUnits("500", 18); // 500 HYPE short bought to close
    const exitPrice = 42_63000000n; // $42.63 scaled 1e8
    const nonce = 1n;
    const deadline = 1791800000n;

    const unwindParams: HedgeIntentParams = {
      vault: vaultOwner,
      perpIndex: 0,
      size: hedgeSize, // Correctly matches int256(hedge.size) in AegisVault.sol:271
      limitPrice: exitPrice,
      nonce,
      deadline
    };

    const signature = await signer.signHedgeIntent(unwindParams);
    expect(signature).toBeDefined();
    expect(signature.startsWith("0x")).toBe(true);
    expect(signature.length).toBe(132); // 65 bytes in hex

    // Verify signature against delegated session key
    const isValid = signer.verifySignature(unwindParams, signature, testWallet.address);
    expect(isValid).toBe(true);

    // Verify recovered signer
    const digest = signer.computeDigest(unwindParams);
    const recovered = ethers.recoverAddress(digest, signature);
    expect(recovered.toLowerCase()).toBe(testWallet.address.toLowerCase());
  });

  it("should prove that signing size 0n causes a digest mismatch against hedge size", async () => {
    const vaultOwner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const hedgeSize = ethers.parseUnits("500", 18);
    const exitPrice = 42_63000000n;
    const nonce = 1n;
    const deadline = 1791800000n;

    // Buggy keeper intent (pre-fix)
    const buggyParams: HedgeIntentParams = {
      vault: vaultOwner,
      perpIndex: 0,
      size: 0n,
      limitPrice: exitPrice,
      nonce,
      deadline
    };

    // Contract expected intent (AegisVault.sol:271)
    const contractParams: HedgeIntentParams = {
      vault: vaultOwner,
      perpIndex: 0,
      size: hedgeSize,
      limitPrice: exitPrice,
      nonce,
      deadline
    };

    const buggyDigest = signer.computeDigest(buggyParams);
    const contractDigest = signer.computeDigest(contractParams);

    // Digests must NOT match, proving why 0n caused UnauthorizedSessionKey()
    expect(buggyDigest).not.toBe(contractDigest);

    // Signature produced from buggyParams fails verification against contractParams
    const buggySig = await signer.signHedgeIntent(buggyParams);
    const recoveredAgainstContract = ethers.recoverAddress(contractDigest, buggySig);
    expect(recoveredAgainstContract.toLowerCase()).not.toBe(testWallet.address.toLowerCase());
  });
});
