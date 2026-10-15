// Add BigInt serialization support for Jest worker IPC
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
