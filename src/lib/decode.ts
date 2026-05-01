import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { ArkAddress } from '@arkade-os/sdk';
import { constructArkAddress } from '@/lib/arkAddress';

export function isHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str);
}

export function addressToScriptHex(address: string): string {
  if (isHex(address) && address.length % 2 === 0) {
    return address.toLowerCase();
  }
  return hex.encode(ArkAddress.decode(address).pkScript);
}

export function scriptHexToAddress(scriptHex: string, operatorPubkeyHex?: string, network?: string): string {
  try {
    const scriptBytes = hex.decode(scriptHex);
    if (operatorPubkeyHex) {
      const arkAddress = constructArkAddress(scriptBytes, operatorPubkeyHex, network);
      if (arkAddress) return arkAddress;
    }
    const address = btc.Address(btc.NETWORK).encode({
      type: 'tr',
      pubkey: scriptBytes.slice(2)
    });
    return address;
  } catch {
    return scriptHex;
  }
}

export function parseOutpoint(outpointStr: string): { txid: string; vout: number } | null {
  try {
    const parts = outpointStr.split(':');
    if (parts.length !== 2) return null;
    const txid = parts[0];
    const vout = parseInt(parts[1], 10);
    if (!/^[0-9a-fA-F]{64}$/.test(txid) || isNaN(vout)) return null;
    return { txid, vout };
  } catch {
    return null;
  }
}
