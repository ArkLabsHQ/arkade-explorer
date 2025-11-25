// Import ArkAddress from the SDK
import { ArkAddress } from '@arkade-os/sdk';
import { hex } from '@scure/base';

/**
 * Constructs an Ark address from a script pubkey and server info
 */
export function constructArkAddress(scriptPubkey: Uint8Array, aspPubkeyHex: string, network: string = 'liquidtestnet'): string | null {
  try {
    // Convert hex pubkey to bytes
    let aspPubkey = hex.decode(aspPubkeyHex);
    
    // If it's a compressed pubkey (33 bytes), extract the x-only part (32 bytes)
    if (aspPubkey.length === 33) {
      // Remove the prefix byte (02 or 03) to get x-only pubkey
      aspPubkey = aspPubkey.slice(1);
    }
    
    // For P2TR (SegWit v1), the script is: OP_1 (0x51) + 0x20 (32 bytes) + pubkey (32 bytes)
    // Total: 34 bytes. We need to extract just the 32-byte pubkey part.
    let witnessProgram = scriptPubkey;
    if (scriptPubkey.length === 34 && scriptPubkey[0] === 0x51 && scriptPubkey[1] === 0x20) {
      // Extract the 32-byte witness program (skip OP_1 and length byte)
      witnessProgram = new Uint8Array(scriptPubkey.buffer, scriptPubkey.byteOffset + 2, 32);
    }
    
    // Create ArkAddress instance from witness program
    const arkAddress = new ArkAddress(aspPubkey, witnessProgram, network === 'bitcoin' ? 'ark' : 'tark');
    
    // Use the encode method to get the string representation
    const addressString = arkAddress.encode();
    return addressString;
  } catch (e) {
    console.error('Failed to construct Ark address:', e);
    return null;
  }
}

/**
 * Decodes an Ark address string to extract its components
 */
export function decodeArkAddress(arkAddressStr: string): ArkAddress | null {
  try {
    return ArkAddress.decode(arkAddressStr);
  } catch (e) {
    console.error('Failed to decode Ark address:', e);
    return null;
  }
}
