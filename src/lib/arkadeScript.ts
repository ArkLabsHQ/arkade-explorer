import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import {
    arkade,
    decodeTapscript,
    Extension,
    MultisigTapscript,
    CSVMultisigTapscript,
    ConditionMultisigTapscript,
    ConditionCSVMultisigTapscript,
    CLTVMultisigTapscript,
    BITCOIN_EMULATOR_PUBKEY,
    MUTINYNET_EMULATOR_PUBKEY,
    REGTEST_EMULATOR_PUBKEY,
} from "@arkade-os/sdk";

/**
 * Detection of how a VTXO was spent in a given transaction input.
 *
 * A VTXO spend is either:
 * - key path: a signature for the taproot output key (e.g. MuSig2 aggregate in trees), or
 * - script path: one of the tapleaf scripts (forfeit, exit, sweep, VHTLC closures…)
 *   was revealed in the witness / PSBT input.
 *
 * A script-path leaf may additionally be bound to an Arkade Script: the covenant
 * program the emulator executes before co-signing. The leaf then holds the
 * emulator key tweaked by the script hash, and the script itself is revealed in
 * an Emulator Packet (OP_RETURN extension) of a related transaction.
 */

export interface ScriptView {
    scriptHex: string;
    /** Opcodes in order: "OP_*" names, hex (or quoted text) for data pushes, decimals for ints. */
    asm: string[];
}

export interface TapscriptInfo extends ScriptView {
    /** Protocol role of the leaf, e.g. "Forfeit", "Exit", "Sweep", "Arkade". */
    label: string;
    /** The Arkade Script this leaf is bound to, when one of the candidates matches. */
    arkadeScript?: ScriptView;
}

export type SpendPath =
    | { kind: "key-path" }
    | { kind: "script-path"; info: TapscriptInfo }
    /** Script path whose leaf is missing or is not a known arkade tapscript. */
    | { kind: "unknown" };

/** The witness-related fields of a btc-signer transaction input (PSBT or finalized). */
export type SpendPathInput = Pick<
    ReturnType<btc.Transaction["getInput"]>,
    "tapKeySig" | "tapScriptSig" | "tapLeafScript" | "finalScriptWitness"
>;

interface DescribeOptions {
    /**
     * The server signer pubkey (compressed or x-only hex). When present, scripts
     * involving it are labeled as forfeit / sweep closures.
     */
    operatorPubkeyHex?: string;
    /**
     * Candidate Arkade Scripts (see {@link emulatorScripts}). A candidate is only
     * attached to a leaf when its emulator-tweaked key is one of the leaf's keys,
     * so passing unrelated scripts is harmless.
     */
    arkadeScripts?: Uint8Array[];
}

// ponytail: known emulator keys only; add an env override if self-hosted emulators need decoding
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
        // Arkade Scripts push field names ("type", "register"…): show those as text
        if (textPushes && op.length >= 2 && op.every((b) => b >= 0x20 && b <= 0x7e)) {
            return JSON.stringify(String.fromCharCode(...op));
        }
        return hex.encode(op);
    });
}

/** The Arkade Scripts revealed by a transaction's Emulator Packet, if any. */
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

/** The candidate whose emulator-tweaked key is one of the leaf's pubkeys. */
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
                // opcode unknown to this SDK version: the hex is still shown
            }
            return { scriptHex: hex.encode(script), asm };
        }
    }
    return undefined;
}

/** True when the embedded condition script is a hash160 preimage check (VHTLC claim). */
function isPreimageCondition(conditionScript: Uint8Array): boolean {
    try {
        const asm = btc.Script.decode(conditionScript);
        return asm.includes("HASH160") && asm.includes("EQUAL");
    } catch {
        return false;
    }
}

/**
 * Decode a tapleaf script into its protocol role and opcodes, or null when it
 * is not a known arkade tapscript.
 */
export function describeTapscript(
    script: Uint8Array,
    opts: DescribeOptions = {},
): TapscriptInfo | null {
    let tapscript: ReturnType<typeof decodeTapscript>;
    try {
        tapscript = decodeTapscript(script);
    } catch {
        return null;
    }

    const pubkeys: string[] = tapscript.params.pubkeys.map(hex.encode);
    const n = pubkeys.length;
    // x-only form of the operator key: the last 32 bytes of either encoding
    const operatorKey = opts.operatorPubkeyHex?.slice(-64).toLowerCase();
    const involvesOperator = !!operatorKey && pubkeys.includes(operatorKey);
    const arkadeScript = findArkadeScript(pubkeys, opts.arkadeScripts ?? []);

    let label: string;
    if (arkadeScript) {
        label = "Arkade";
    } else if (MultisigTapscript.is(tapscript)) {
        label = !involvesOperator ? "Multisig" : n === 1 ? "Operator" : "Forfeit";
    } else if (CSVMultisigTapscript.is(tapscript)) {
        label = !involvesOperator ? "Exit" : n === 1 ? "Sweep" : "Timelocked operator";
    } else if (ConditionCSVMultisigTapscript.is(tapscript)) {
        label = isPreimageCondition(tapscript.params.conditionScript)
            ? "VHTLC unilateral claim"
            : "Conditional exit";
    } else if (ConditionMultisigTapscript.is(tapscript)) {
        label = isPreimageCondition(tapscript.params.conditionScript)
            ? "VHTLC claim"
            : "Conditional";
    } else if (CLTVMultisigTapscript.is(tapscript)) {
        label = "CLTV multisig";
    } else {
        return null;
    }

    return {
        label,
        scriptHex: hex.encode(script),
        asm: toAsm(btc.Script.decode(script)),
        arkadeScript,
    };
}

function isControlBlock(bytes: Uint8Array): boolean {
    // Taproot control block: version byte 0xc0|0xc1, internal key, merkle path.
    return bytes.length >= 33 && (bytes[0] & 0xfe) === 0xc0;
}

/**
 * Determine how a transaction input spent its VTXO: key path or script path,
 * and with which script.
 *
 * Handles both PSBT inputs (partial: tapKeySig / tapLeafScript + tapScriptSig)
 * and finalized inputs (finalScriptWitness from raw or finalized transactions).
 * Returns null when the input carries no taproot witness information at all.
 */
export function extractSpendPath(
    input: SpendPathInput | undefined | null,
    opts: DescribeOptions = {},
): SpendPath | null {
    if (!input) return null;

    // PSBT script-path spend. Per BIP-371 the tap_leaf_script value is the
    // script followed by a one-byte leaf version, which is not part of the script.
    const leaves = input.tapLeafScript ?? [];
    if (leaves.length > 0) {
        for (const [, scriptAndVersion] of leaves) {
            const info = describeTapscript(scriptAndVersion.subarray(0, -1), opts);
            if (info) return { kind: "script-path", info };
        }
        return { kind: "unknown" };
    }

    // Finalized spend: witness is [stack..., script, controlBlock, annex?] for
    // script path, or [signature, annex?] for key path.
    let witness = input.finalScriptWitness ?? [];
    if (witness.length >= 2 && witness[witness.length - 1][0] === 0x50) {
        witness = witness.slice(0, -1);
    }
    if (witness.length >= 2 && isControlBlock(witness[witness.length - 1])) {
        const info = describeTapscript(witness[witness.length - 2], opts);
        return info ? { kind: "script-path", info } : { kind: "unknown" };
    }

    if (input.tapKeySig || witness.length === 1) return { kind: "key-path" };

    // Script-path signatures without an attached leaf script.
    if (input.tapScriptSig && input.tapScriptSig.length > 0) return { kind: "unknown" };

    return null;
}
