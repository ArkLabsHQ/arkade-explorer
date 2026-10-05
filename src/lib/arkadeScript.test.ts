import { describe, expect, it } from "vitest";
import { hex } from "@scure/base";
import * as btc from "@scure/btc-signer";
import {
    DefaultVtxo,
    CSVMultisigTapscript,
    CLTVMultisigTapscript,
    ConditionMultisigTapscript,
    ConditionCSVMultisigTapscript,
    VHTLC,
} from "@arkade-os/sdk";
import { describeTapscript, extractSpendPath, type SpendPathInput } from "@/lib/arkadeScript";

const USER_KEY = hex.decode(
    "3f56f2ac74b1785604fd0c2c025ce59b473a3fea6504dff2b803b0f24a251c42",
) as Uint8Array;
const OPERATOR_KEY = hex.decode(
    "8202bebddeb1f7442803897a85eaf3ce9254d07df0172fc3725ab5f0d097779c",
) as Uint8Array;
const OPERATOR_COMPRESSED_HEX =
    "03" + "8202bebddeb1f7442803897a85eaf3ce9254d07df0172fc3725ab5f0d097779c";

describe("describeTapscript", () => {
    it("labels a two-party multisig with the operator key as forfeit", () => {
        const forfeit = new DefaultVtxo.Script({
            pubKey: USER_KEY,
            serverPubKey: OPERATOR_KEY,
            csvTimelock: { value: 144n, type: "blocks" },
        });
        const info = describeTapscript(hex.decode(forfeit.forfeitScript), {
            operatorPubkeyHex: OPERATOR_COMPRESSED_HEX,
        });
        expect(info).not.toBeNull();
        expect(info!.label).toBe("Forfeit");
    });

    it("labels a single-user CSV script as unilateral exit", () => {
        const vtxo = new DefaultVtxo.Script({
            pubKey: USER_KEY,
            serverPubKey: OPERATOR_KEY,
            csvTimelock: { value: 144n, type: "blocks" },
        });
        const info = describeTapscript(hex.decode(vtxo.exitScript));
        expect(info!.label).toBe("Exit");
    });

    it("labels a single-operator CSV script as sweep", () => {
        const ts = CSVMultisigTapscript.encode({
            timelock: { value: 512n, type: "seconds" },
            pubkeys: [OPERATOR_KEY],
        });
        const info = describeTapscript(ts.script, {
            operatorPubkeyHex: OPERATOR_COMPRESSED_HEX,
        });
        expect(info!.label).toBe("Sweep");
    });

    it("labels a CLTV multisig", () => {
        const ts = CLTVMultisigTapscript.encode({
            absoluteTimelock: 800000n,
            pubkeys: [USER_KEY, OPERATOR_KEY],
        });
        const info = describeTapscript(ts.script);
        expect(info!.label).toBe("CLTV multisig");
    });

    it("labels VHTLC claim / unilateral claim / refund leaves", () => {
        const vhtlc = new VHTLC.Script({
            sender: USER_KEY,
            receiver: OPERATOR_KEY,
            server: OPERATOR_KEY,
            preimageHash: new Uint8Array(20).fill(0xab),
            refundLocktime: 800000n,
            unilateralClaimDelay: { value: 100n, type: "blocks" },
            unilateralRefundDelay: { value: 101n, type: "blocks" },
            unilateralRefundWithoutReceiverDelay: { value: 102n, type: "blocks" },
        });

        const claim = describeTapscript(hex.decode(vhtlc.claimScript));
        expect(claim!.label).toBe("VHTLC claim");

        const unilateralClaim = describeTapscript(hex.decode(vhtlc.unilateralClaimScript));
        expect(unilateralClaim!.label).toBe("VHTLC unilateral claim");

        const refund = describeTapscript(hex.decode(vhtlc.refundWithoutReceiverScript));
        expect(refund!.label).toBe("CLTV multisig");
    });

    it("recognizes a plain condition-multisig without preimage as a conditional spend", () => {
        const ts = ConditionMultisigTapscript.encode({
            conditionScript: new Uint8Array([0x51]), // OP_TRUE
            pubkeys: [USER_KEY, OPERATOR_KEY],
        });
        const info = describeTapscript(ts.script);
        expect(info!.label).toBe("Conditional");
    });

    it("labels a non-operator multisig as plain multisig", () => {
        const ts = ConditionCSVMultisigTapscript.encode({
            conditionScript: new Uint8Array([0x51]),
            timelock: { value: 10n, type: "blocks" },
            pubkeys: [USER_KEY, OPERATOR_KEY],
        });
        const info = describeTapscript(ts.script, { operatorPubkeyHex: "02abcd" });
        // operator key unknown here, so it must not claim forfeit semantics
        expect(info!.label).toBe("Conditional exit");
    });

    it("returns null for an undecodable script", () => {
        expect(describeTapscript(new Uint8Array([0x51]))).toBeNull();
    });
});

describe("extractSpendPath", () => {
    it("detects a key-path spend from tapKeySig", () => {
        const input: SpendPathInput = { tapKeySig: new Uint8Array(64).fill(1) };
        const path = extractSpendPath(input);
        expect(path!.kind).toBe("key-path");
    });

    it("detects a key-path spend from a single-item witness", () => {
        const input: SpendPathInput = { finalScriptWitness: [new Uint8Array(64).fill(1)] };
        const path = extractSpendPath(input);
        expect(path!.kind).toBe("key-path");
    });

    it("detects a script-path spend from tapLeafScript", () => {
        const forfeit = new DefaultVtxo.Script({
            pubKey: USER_KEY,
            serverPubKey: OPERATOR_KEY,
            csvTimelock: { value: 144n, type: "blocks" },
        });
        const input: SpendPathInput = {
            tapScriptSig: [
                [{ pubKey: USER_KEY, leafHash: new Uint8Array(32) }, new Uint8Array(64)],
            ],
            tapLeafScript: [
                [
                    {
                        version: 193,
                        internalKey: new Uint8Array(32),
                        merklePath: [],
                    },
                    // BIP-371: script followed by the leaf version byte
                    hex.decode(forfeit.forfeitScript + "c0"),
                ],
            ],
        };
        const path = extractSpendPath(input, { operatorPubkeyHex: OPERATOR_COMPRESSED_HEX });
        expect(path).not.toBeNull();
        if (!path || path.kind !== "script-path") throw new Error("expected script path");
        expect(path.kind).toBe("script-path");
        expect(path.info.label).toBe("Forfeit");
        expect(path.info.scriptHex).toBe(forfeit.forfeitScript);
        expect(path.info.asm).toEqual([
            hex.encode(USER_KEY),
            "OP_CHECKSIGVERIFY",
            hex.encode(OPERATOR_KEY),
            "OP_CHECKSIG",
        ]);
    });

    it("detects a script-path spend from a finalized witness stack", () => {
        const exit = new DefaultVtxo.Script({
            pubKey: USER_KEY,
            serverPubKey: OPERATOR_KEY,
            csvTimelock: { value: 512n, type: "seconds" },
        });
        const script = hex.decode(exit.exitScript);
        const controlBlock = new Uint8Array(33);
        controlBlock[0] = 0xc0; // tapscript leaf version + parity bit
        const input: SpendPathInput = {
            finalScriptWitness: [new Uint8Array(64).fill(1), script, controlBlock],
        };
        const path = extractSpendPath(input);
        expect(path).not.toBeNull();
        if (!path || path.kind !== "script-path") throw new Error("expected script path");
        expect(path.info.label).toBe("Exit");
    });

    it("reports unknown for a script-path spend with an undecodable leaf", () => {
        const input: SpendPathInput = {
            tapLeafScript: [
                [
                    { version: 193, internalKey: new Uint8Array(32), merklePath: [] },
                    new Uint8Array([0x51, 0x52, 0xc0]),
                ],
            ],
        };
        const path = extractSpendPath(input);
        expect(path).not.toBeNull();
        expect(path?.kind).toBe("unknown");
    });

    it("reports script path for tapScriptSig without attached leaves", () => {
        const input: SpendPathInput = {
            tapScriptSig: [
                [{ pubKey: USER_KEY, leafHash: new Uint8Array(32) }, new Uint8Array(64)],
            ],
        };
        const path = extractSpendPath(input);
        expect(path?.kind).toBe("unknown");
    });

    it("returns null when no witness information is present", () => {
        expect(extractSpendPath({})).toBeNull();
        expect(extractSpendPath(null)).toBeNull();
    });
});

describe("live indexer regression: mutinynet tx e2316f56", () => {
    // PSBT exactly as returned by /v1/indexer/virtualTx/e2316f56... on mutinynet.
    // Input 0 spends a VTXO through the forfeit leaf (operator + user multisig),
    // input 1 is a key-path (aggregate signature) spend.
    const PSBT =
        "cHNidP8BAIgDAAAAAv8f/lsL1/ZYzDAaF0J15MOfD71FVFWWkzodJa8oklKIAAAAAAD/////4t0BZebZQmFcK66TdRlOFrzMmkLk0RR0rNCWais6BJIAAAAAAP////8CWigAAAAAAAAWABQVBI5BYzCEv8rpHQOzwrt/aseEQAAAAAAAAAAABFECTnMAAAAAAAEBKxAnAAAAAAAAIlEgfUHeS4k/se8aUxQdAXOcu9R5cA34vxbLApGEiYfiJ8lBFOFaevjFVQ+B5eHdf1k1BkdqaiYi6MJoSCqbsw5HyWvQZO24hFnIhxN6wvRcyw4cciBEHO0FK4wLg15zPEP8bl5A9i41zqpbpIdnYP/C49aoi+SJpLQoPXjly8mXKyX2f+trlfAhysueJBeQ9QO/vntxuJz7HXtEMJPA4WqBpx5aKEEUMBB4gI5Pe8Da3+KeNLHfjq8BCO8GsXIidAdevBB6Enpk7biEWciHE3rC9FzLDhxyIEQc7QUrjAuDXnM8Q/xuXkBt7hhIFObwIqTcqbwe4gd2CvSwqVC28MudpCXBdPXstRQw6WYnXyIlMcm1l9FFpiG/X6mX4EEIyJNzQEpQdZ4iQhXBUJKbdMGgSVS3i0tgNel6XgeKWg8o7JbVR7/ums6AOsDjPSco+SLPyqD9E72O8MYtH9vepPh6TEOGXHN/41dZfUUgMBB4gI5Pe8Da3+KeNLHfjq8BCO8GsXIidAdevBB6EnqtIOFaevjFVQ+B5eHdf1k1BkdqaiYi6MJoSCqbsw5HyWvQrMAAAQErSgEAAAAAAAAiUSB+8iB0dj6/afj0ghC58oBWmTZvMtu/hkqlAZSjolKA8wETQHfE6d5KesawLRqF9kJXwvVTA/hJl/EpuHSH9QDzhV0GoZ2zodeP+SPbdozzxr717r8GH8SdKHEohh6KE4blqa4AAAA=";
    // signerPubkey from https://mutinynet.arkade.sh/v1/info
    const OPERATOR = "03301078808e4f7bc0dadfe29e34b1df8eaf0108ef06b1722274075ebc107a127a";

    const ARKADE_SCRIPT =
        "db03009d0494dc690474797065f86908726567697374657288166f6e636861696e5f6f75747075745f696e6465786573f869025b5d8817636f7369676e6572735f7075626c69635f6b6579732e30f869423033623762333639323639313333663137303536653635396638663632623161336164656236323137636162666636633231366139303432643864653538656566628817636f7369676e6572735f7075626c69635f6b6579732e31f8916975cd8ccf022c0193cdc9a269cd8c5500f7";

    it("decodes the forfeit-script spend and the key-path spend", () => {
        const tx = btc.Transaction.fromPSBT(Uint8Array.from(Buffer.from(PSBT, "base64")));
        expect(tx.inputsLength).toBe(2);

        const p0 = extractSpendPath(tx.getInput(0), {
            operatorPubkeyHex: OPERATOR,
        });
        expect(p0?.kind).toBe("script-path");
        if (!p0 || p0.kind !== "script-path") throw new Error("expected script path");
        expect(p0.info.label).toBe("Forfeit");

        const p1 = extractSpendPath(tx.getInput(1));
        expect(p1?.kind).toBe("key-path");
    });

    it("binds the leaf to its Arkade Script only when the emulator tweak matches", () => {
        const tx = btc.Transaction.fromPSBT(Uint8Array.from(Buffer.from(PSBT, "base64")));
        // Emulator Packet script of the VTXO created by the settling batch (tx a8909b19…)
        const arkadeScript = hex.decode(ARKADE_SCRIPT);
        const other = hex.decode("0474797065f8");

        const bound = extractSpendPath(tx.getInput(0), { arkadeScripts: [other, arkadeScript] });
        if (!bound || bound.kind !== "script-path") throw new Error("expected script path");
        expect(bound.info.label).toBe("Arkade");
        expect(bound.info.arkadeScript?.scriptHex).toBe(ARKADE_SCRIPT);
        expect(bound.info.arkadeScript?.asm).toContain("OP_INSPECTINTENTMESSAGE");
        expect(bound.info.arkadeScript?.asm).toContain('"type"');

        const unbound = extractSpendPath(tx.getInput(0), { arkadeScripts: [other] });
        if (!unbound || unbound.kind !== "script-path") throw new Error("expected script path");
        expect(unbound.info.arkadeScript).toBeUndefined();
    });
});
