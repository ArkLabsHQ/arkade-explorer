import { ArkAddress } from '@arkade-os/sdk';
import { hex } from '@scure/base';

export function constructArkAddress(
  scriptPubkey: Uint8Array,
  aspPubkeyHex: string,
  network: string = 'liquidtestnet'
): string | null {
  try {
    let aspPubkey = hex.decode(aspPubkeyHex);
    if (aspPubkey.length === 33) {
      aspPubkey = aspPubkey.slice(1);
    }

    let witnessProgram: Uint8Array | null = null;

    if (scriptPubkey.length >= 2 && scriptPubkey[0] === 0x6a) {
      if (scriptPubkey.length === 34 && scriptPubkey[1] === 0x20) {
        witnessProgram = new Uint8Array(scriptPubkey.buffer, scriptPubkey.byteOffset + 2, 32);
      } else if (scriptPubkey.length === 33) {
        witnessProgram = new Uint8Array(scriptPubkey.buffer, scriptPubkey.byteOffset + 1, 32);
      }
    } else if (scriptPubkey.length === 34 && scriptPubkey[0] === 0x51 && scriptPubkey[1] === 0x20) {
      witnessProgram = new Uint8Array(scriptPubkey.buffer, scriptPubkey.byteOffset + 2, 32);
    }

    if (!witnessProgram) return null;

    const arkAddress = new ArkAddress(aspPubkey, witnessProgram, network === 'bitcoin' ? 'ark' : 'tark');
    return arkAddress.encode();
  } catch (e) {
    console.error('Failed to construct Ark address:', e);
    return null;
  }
}

export function decodeArkAddress(arkAddressStr: string): ArkAddress | null {
  try {
    return ArkAddress.decode(arkAddressStr);
  } catch (e) {
    console.error('Failed to decode Ark address:', e);
    return null;
  }
}
