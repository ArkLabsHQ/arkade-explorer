import * as btc from '@scure/btc-signer';
import { hex, base64 } from '@scure/base';
import { ArkAddress } from '@arkade-os/sdk';
import { constructArkAddress } from './arkAddress';

export function isHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Decode Bitcoin address to script hex
 */
export function addressToScriptHex(address: string): string {

  // If the input is already a valid hex script, return it as-is
  if (isHex(address) && address.length % 2 === 0) {
    return address.toLowerCase();
  }

  return hex.encode(ArkAddress.decode(address).pkScript);
}

/**
 * Convert script hex to Bitcoin address
 */
export function scriptHexToAddress(scriptHex: string, aspPubkeyHex?: string, network?: string): string {
  try {
    const scriptBytes = hex.decode(scriptHex);
    
    // If we have ASP pubkey, use ArkAddress construction
    if (aspPubkeyHex) {
      const arkAddress = constructArkAddress(scriptBytes, aspPubkeyHex, network);
      if (arkAddress) {
        return arkAddress;
      }
    }
    
    // Fallback to btc-signer for non-Ark addresses
    const address = btc.Address(btc.NETWORK).encode({
      type: 'tr',
      pubkey: scriptBytes.slice(2) // Remove OP_1 OP_32 prefix (5120)
    });
    return address;
  } catch (error) {
    // If conversion fails, return the script hex
    return scriptHex;
  }
}

/**
 * Decode Bitcoin script to human-readable format
 */
export function decodeScript(scriptHex: string): string {
  try {
    hex.decode(scriptHex);
    // Basic script decoding - can be enhanced
    return scriptHex;
  } catch (error) {
    return scriptHex;
  }
}

/**
 * Decode transaction hex to readable format
 */
export function decodeTransaction(txHex: string): any {
  try {
    const txBytes = hex.decode(txHex);
    const tx = btc.Transaction.fromRaw(txBytes);
    return {
      version: tx.version,
      inputsCount: tx.inputsLength,
      outputsCount: tx.outputsLength,
      lockTime: tx.lockTime,
    };
  } catch (error) {
    console.error('Failed to decode transaction:', error);
    return null;
  }
}

/**
 * Parse outpoint string (txid:vout)
 */
export function parseOutpoint(outpointStr: string): { txid: string; vout: number } | null {
  try {
    const parts = outpointStr.split(':');
    if (parts.length !== 2) return null;
    
    const txid = parts[0];
    const vout = parseInt(parts[1], 10);
    
    if (!/^[0-9a-fA-F]{64}$/.test(txid) || isNaN(vout)) {
      return null;
    }
    
    return { txid, vout };
  } catch (error) {
    return null;
  }
}

/**
 * Encode data to base64
 */
export function encodeBase64(data: Uint8Array): string {
  return base64.encode(data);
}

/**
 * Decode base64 to bytes
 */
export function decodeBase64(data: string): Uint8Array {
  return base64.decode(data);
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hexStr: string): Uint8Array {
  return hex.decode(hexStr);
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return hex.encode(bytes);
}
