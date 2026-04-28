export function isValidTxid(txid: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(txid);
}

export function isValidHex(hex: string): boolean {
  return /^[0-9a-fA-F]*$/.test(hex) && hex.length % 2 === 0;
}

export function isValidOutpoint(outpoint: string): boolean {
  const parts = outpoint.split(':');
  if (parts.length !== 2) return false;
  const [txid, voutStr] = parts;
  const vout = parseInt(voutStr, 10);
  return isValidTxid(txid) && !isNaN(vout) && vout >= 0;
}

export function isValidAssetId(id: string): boolean {
  return /^[0-9a-fA-F]{68}$/.test(id);
}
