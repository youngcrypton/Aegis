import { ethers } from "ethers";
import { TelemetryService } from "../src/telemetry";

describe("TelemetryService Oracle Fail-Closed Behavior", () => {
  let telemetry: TelemetryService;
  let mockProvider: {
    call: jest.Mock;
    getBlockNumber: jest.Mock;
    getBlock: jest.Mock;
  };

  beforeEach(() => {
    telemetry = new TelemetryService();
    mockProvider = {
      call: jest.fn(),
      getBlockNumber: jest.fn(),
      getBlock: jest.fn()
    };
    (telemetry as any).provider = mockProvider;
  });

  afterEach(() => {
    telemetry.stop();
  });

  it("should encode precompile call with selector 0x3a4b9c1d and perpIndex", async () => {
    const perpIndex = 0;
    const expectedSelector = "0x3a4b9c1d";
    const expectedIndex = ethers.AbiCoder.defaultAbiCoder().encode(["uint32"], [perpIndex]);
    const expectedCalldata = ethers.concat([expectedSelector, expectedIndex]);

    mockProvider.call.mockResolvedValueOnce(
      ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [83_50000000n])
    );

    await telemetry.getMarkPrice(perpIndex);

    expect(mockProvider.call).toHaveBeenCalledWith({
      to: "0x0000000000000000000000000000000000000801",
      data: expectedCalldata
    });
  });

  it("should fail closed and throw when RPC call throws an error", async () => {
    mockProvider.call.mockRejectedValueOnce(new Error("RPC Connection Refused"));

    await expect(telemetry.getMarkPrice(0)).rejects.toThrow("RPC Connection Refused");
  });

  it("should fail closed and throw when precompile returns empty bytes (0x)", async () => {
    mockProvider.call.mockResolvedValueOnce("0x");

    await expect(telemetry.getMarkPrice(0)).rejects.toThrow(
      "Oracle read failed: Precompile 0x0801 returned empty data for perp 0"
    );
  });

  it("should fail closed and throw when precompile returns malformed or short data", async () => {
    mockProvider.call.mockResolvedValueOnce("0x1234");

    await expect(telemetry.getMarkPrice(0)).rejects.toThrow(
      "Oracle read failed: Precompile 0x0801 returned malformed data"
    );
  });

  it("should fail closed and throw when mark price is 0", async () => {
    mockProvider.call.mockResolvedValueOnce(
      ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [0n])
    );

    await expect(telemetry.getMarkPrice(0)).rejects.toThrow(
      "Oracle read failed: Precompile 0x0801 returned non-positive price (0) for perp 0"
    );
  });

  it("should correctly decode valid 32-byte mark price from precompile 0x0801", async () => {
    const expectedPrice = 83_46000000n; // $83.46 scaled 1e8
    mockProvider.call.mockResolvedValueOnce(
      ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [expectedPrice])
    );

    const data = await telemetry.getMarkPrice(0);
    expect(data.perpIndex).toBe(0);
    expect(data.markPrice).toBe(expectedPrice);
    expect(data.indexPrice).toBe(expectedPrice);
    expect(data.depthBid).toBe(0n);
    expect(data.depthAsk).toBe(0n);
    expect(data.timestamp).toBeGreaterThan(0);
  });

  it("should correctly decode extended 160-byte 5-tuple from precompile 0x0801", async () => {
    const expectedMark = 83_50000000n;
    const expectedIndex = 83_48000000n;
    const expectedBidDepth = ethers.parseUnits("125000", 18);
    const expectedAskDepth = ethers.parseUnits("98000", 18);
    const expectedTs = 1791800500n;

    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256", "uint256", "uint256", "uint256"],
      [expectedMark, expectedIndex, expectedBidDepth, expectedAskDepth, expectedTs]
    );
    mockProvider.call.mockResolvedValueOnce(encoded);

    const data = await telemetry.getMarkPrice(0);
    expect(data.perpIndex).toBe(0);
    expect(data.markPrice).toBe(expectedMark);
    expect(data.indexPrice).toBe(expectedIndex);
    expect(data.depthBid).toBe(expectedBidDepth);
    expect(data.depthAsk).toBe(expectedAskDepth);
    expect(data.timestamp).toBe(Number(expectedTs));
  });
});
