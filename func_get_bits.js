// Helper function to extract bits from register value
export function getBits(regVal, endBit, startBit) {
  const length = endBit - startBit + 1;
  const mask = (1 << length) - 1;
  return (regVal >> startBit) & mask;
}