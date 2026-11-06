import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import {
    arkade,
    decodeTapscript,
    Extension,
    BITCOIN_EMULATOR_PUBKEY,
    MUTINYNET_EMULATOR_PUBKEY,
    REGTEST_EMULATOR_PUBKEY,
} from "@arkade-os/sdk";

export interface ScriptView {
    scriptHex: string;
    asm: string[];
}

export interface TapscriptInfo extends ScriptView {
    arkadeScript?: ScriptView;
}

export type SpendPath =
    | { kind: "key-path" }
    | { kind: "script-path"; scripts: TapscriptInfo[] }
    | { kind: "unknown" };

export type SpendPathInput = Pick<
    ReturnType<btc.Transaction["getInput"]>,
    "tapKeySig" | "tapScriptSig" | "tapLeafScript" | "finalScriptWitness"
>;

interface DescribeOptions {
    arkadeScripts?: Uint8Array[];
}

const EMULATOR_PUBKEYS = [
    BITCOIN_EMULATOR_PUBKEY,
    MUTINYNET_EMULATOR_PUBKEY,
    REGTEST_EMULATOR_PUBKEY,
].map((k) => hex.decode(k));

type ScriptOp = string | number | bigint | Uint8Array;

function toAsm(ops: readonly ScriptOp[], textPushes = false): string[] {
    return ops.map((op) => {
        if (typeof op === "string") return `OP_${op}`;
        if (!(op instanceof Uint8Array)) return `${op}`;
        if (textPushes && op.length >= 2 && op.every((b) => b >= 0x20 && b <= 0x7e)) {
            return JSON.stringify(String.fromCharCode(...op));
        }
        return hex.encode(op);
    });
}

export function emulatorScripts(tx: btc.Transaction): Uint8Array[] {
    try {
        return (
            Extension.fromTx(tx)
                .getEmulatorPacket()
                ?.entries.map((e) => e.script) ?? []
        );
    } catch {
        return [];
    }
}

function findArkadeScript(pubkeys: string[], candidates: Uint8Array[]): ScriptView | undefined {
    for (const script of candidates) {
        for (const emulatorKey of EMULATOR_PUBKEYS) {
            let tweaked: string;
            try {
                tweaked = hex.encode(arkade.computeArkadeScriptPublicKey(emulatorKey, script));
            } catch {
                continue;
            }
            if (!pubkeys.includes(tweaked)) continue;
            let asm: string[] = [];
            try {
                asm = toAsm(arkade.ArkadeScript.decode(script), true);
            } catch {
                // Preserve the bytes when this SDK cannot decode an opcode.
            }
            return { scriptHex: hex.encode(script), asm };
        }
    }
    return undefined;
}

export function describeTapscript(script: Uint8Array, opts: DescribeOptions = {}): TapscriptInfo {
    let asm: string[] = [];
    try {
        asm = toAsm(btc.Script.decode(script));
    } catch {
        // Raw bytes remain available even for an unfamiliar or malformed script.
    }
    let arkadeScript: ScriptView | undefined;
    if (opts.arkadeScripts?.length) {
        try {
            const pubkeys = decodeTapscript(script).params.pubkeys.map(hex.encode);
            arkadeScript = findArkadeScript(pubkeys, opts.arkadeScripts);
        } catch {
            // Closure decoding is needed only to bind a matching Arkade Script.
        }
    }
    return { scriptHex: hex.encode(script), asm, arkadeScript };
}

function isControlBlock(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 33 &&
        bytes.length <= 4129 &&
        (bytes.length - 33) % 32 === 0 &&
        (bytes[0] & 0xfe) === 0xc0
    );
}

export function extractSpendPath(
    input: SpendPathInput | undefined | null,
    opts: DescribeOptions = {},
): SpendPath | null {
    if (!input) return null;

    let witness = input.finalScriptWitness ?? [];
    if (witness.length >= 2 && witness[witness.length - 1][0] === 0x50) {
        witness = witness.slice(0, -1);
    }
    if (witness.length === 1) return { kind: "key-path" };
    if (witness.length >= 2) {
        if (!isControlBlock(witness[witness.length - 1])) return { kind: "unknown" };
        return {
            kind: "script-path",
            scripts: [describeTapscript(witness[witness.length - 2], opts)],
        };
    }

    const leaves = input.tapLeafScript ?? [];
    if (leaves.length > 0) {
        const scripts = new Map<string, TapscriptInfo>();
        for (const [, scriptAndVersion] of leaves) {
            if (scriptAndVersion.length === 0) continue;
            // BIP-371 appends the leaf version to the script bytes.
            const script = describeTapscript(scriptAndVersion.subarray(0, -1), opts);
            scripts.set(script.scriptHex, script);
        }
        return scripts.size > 0
            ? { kind: "script-path", scripts: [...scripts.values()] }
            : { kind: "unknown" };
    }

    if (input.tapKeySig) return { kind: "key-path" };
    if (input.tapScriptSig?.length) return { kind: "unknown" };
    return null;
}
