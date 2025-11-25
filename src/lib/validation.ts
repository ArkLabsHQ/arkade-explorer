/**
 * Validation utilities
 */

/**
 * Check if string is a valid Bitcoin transaction ID (64 hex characters)
 */
export function isValidTxid(txid: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(txid);
}

/**
 * Check if string is a valid hex string
 */
export function isValidHex(hex: string): boolean {
  return /^[0-9a-fA-F]*$/.test(hex) && hex.length % 2 === 0;
}

/**
 * Check if string is a valid outpoint format (txid:vout)
 */
export function isValidOutpoint(outpoint: string): boolean {
  const parts = outpoint.split(':');
  if (parts.length !== 2) return false;
  
  const [txid, voutStr] = parts;
  const vout = parseInt(voutStr, 10);
  
  return isValidTxid(txid) && !isNaN(vout) && vout >= 0;
}

/**
 * Check if value is a positive integer
 */
export function isPositiveInteger(value: any): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[^\w\s:]/gi, '');
}
