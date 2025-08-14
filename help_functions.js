// Severity level constants as an object
export const sevC = {
  Info: 0,
  Recom: 1,
  Warn: 2,
  Error: 3,
  InfoCalc: 4
};

// Helper function to extract bits from register value
export function getBits(regVal, endBit, startBit) {
  // endBit: with larger index
  // startBit: with smaller index
  // example: getBits(0b11110000, 4, 3) => 0b10
  const length = endBit - startBit + 1;
  const mask = (1 << length) - 1;
  return (regVal >> startBit) & mask;
}