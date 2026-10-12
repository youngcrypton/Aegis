import { ethers } from "ethers";

export interface HedgeIntentParams {
  vault: string;
  perpIndex: number;
  size: bigint; // Negative for short, positive for long / unwind
  limitPrice: bigint; // Scaled 1e8
  nonce: bigint;
  deadline: bigint;
}

export interface EIP712DomainData {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export const HEDGE_INTENT_TYPES = {
  HedgeIntent: [
    { name: "vault", type: "address" },
    { name: "perpIndex", type: "uint32" },
    { name: "size", type: "int256" },
    { name: "limitPrice", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

export class OrderSigner {
  private wallet: ethers.Wallet;
  private domain: EIP712DomainData;

  constructor(
    privateKey: string,
    verifyingContract: string,
    chainId: number = 99801
  ) {
    this.wallet = new ethers.Wallet(privateKey);
    this.domain = {
      name: "AEGIS Protocol",
      version: "1.0.0",
      chainId,
      verifyingContract
    };
  }

  public getSignerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Cryptographically signs an atomic EIP-712 hedge intent using the delegated trade-only session key.
   */
  public async signHedgeIntent(params: HedgeIntentParams): Promise<string> {
    const value = {
      vault: params.vault,
      perpIndex: params.perpIndex,
      size: params.size,
      limitPrice: params.limitPrice,
      nonce: params.nonce,
      deadline: params.deadline
    };

    return await this.wallet.signTypedData(this.domain, HEDGE_INTENT_TYPES, value);
  }

  /**
   * Computes the 32-byte EIP-712 digest locally for pre-dispatch verification.
   */
  public computeDigest(params: HedgeIntentParams): string {
    const value = {
      vault: params.vault,
      perpIndex: params.perpIndex,
      size: params.size,
      limitPrice: params.limitPrice,
      nonce: params.nonce,
      deadline: params.deadline
    };

    return ethers.TypedDataEncoder.hash(this.domain, HEDGE_INTENT_TYPES, value);
  }

  /**
   * Verifies an EIP-712 signature locally against expected session key.
   */
  public verifySignature(
    params: HedgeIntentParams,
    signature: string,
    expectedSigner: string
  ): boolean {
    const value = {
      vault: params.vault,
      perpIndex: params.perpIndex,
      size: params.size,
      limitPrice: params.limitPrice,
      nonce: params.nonce,
      deadline: params.deadline
    };

    const recovered = ethers.verifyTypedData(
      this.domain,
      HEDGE_INTENT_TYPES,
      value,
      signature
    );
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }
}
