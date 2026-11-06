import { describe, expect, it } from "vitest";
import { hex } from "@scure/base";
import * as btc from "@scure/btc-signer";
import { DefaultVtxo, VHTLC } from "@arkade-os/sdk";
import { describeTapscript, extractSpendPath, type SpendPathInput } from "@/lib/arkadeScript";

const USER_KEY = hex.decode("3f56f2ac74b1785604fd0c2c025ce59b473a3fea6504dff2b803b0f24a251c42");
const OPERATOR_KEY = hex.decode("8202bebddeb1f7442803897a85eaf3ce9254d07df0172fc3725ab5f0d097779c");

function leaf(scriptHex: string): NonNullable<SpendPathInput["tapLeafScript"]>[number] {
    return [
        { version: 193, internalKey: new Uint8Array(32), merklePath: [] },
        hex.decode(`${scriptHex}c0`),
    ];
}

function controlBlock(): Uint8Array {
    const block = new Uint8Array(33);
    block[0] = 0xc0;
    return block;
}

describe("describeTapscript", () => {
    it("shows a multisig's bytes and opcodes without assigning a protocol role", () => {
        const vtxo = new DefaultVtxo.Script({
            pubKey: USER_KEY,
            serverPubKey: OPERATOR_KEY,
            csvTimelock: { value: 144n, type: "blocks" },
        });
        const info = describeTapscript(hex.decode(vtxo.forfeitScript));
        expect(info.scriptHex).toBe(vtxo.forfeitScript);
        expect(info.asm).toEqual([
            hex.encode(USER_KEY),
            "OP_CHECKSIGVERIFY",
            hex.encode(OPERATOR_KEY),
            "OP_CHECKSIG",
        ]);
        expect(info).not.toHaveProperty("label");
    });

    it("preserves conditional scripts without guessing the contract", () => {
        const contract = new VHTLC.Script({
            sender: USER_KEY,
            receiver: OPERATOR_KEY,
            server: OPERATOR_KEY,
            preimageHash: new Uint8Array(20).fill(0xab),
            refundLocktime: 800000n,
            unilateralClaimDelay: { value: 100n, type: "blocks" },
            unilateralRefundDelay: { value: 101n, type: "blocks" },
            unilateralRefundWithoutReceiverDelay: { value: 102n, type: "blocks" },
        });
        const info = describeTapscript(hex.decode(contract.claimScript));
        expect(info.scriptHex).toBe(contract.claimScript);
        expect(info.asm).toContain("OP_HASH160");
        expect(info).not.toHaveProperty("label");
    });

    it("decodes unfamiliar valid leaves without a known closure template", () => {
        expect(describeTapscript(hex.decode("515293"))).toMatchObject({
            scriptHex: "515293",
            asm: ["1", "2", "OP_ADD"],
        });
    });

    it("preserves bytes when malformed push data cannot be disassembled", () => {
        expect(describeTapscript(hex.decode("4c0201"))).toMatchObject({
            scriptHex: "4c0201",
            asm: [],
        });
    });

    it("preserves an empty script", () => {
        expect(describeTapscript(new Uint8Array())).toMatchObject({ scriptHex: "", asm: [] });
    });
});

describe("extractSpendPath", () => {
    it("detects a key-path signature without leaves", () => {
        expect(extractSpendPath({ tapKeySig: new Uint8Array(64).fill(1) })?.kind).toBe("key-path");
    });

    it("detects a finalized key-path witness", () => {
        expect(extractSpendPath({ finalScriptWitness: [new Uint8Array(64).fill(1)] })?.kind).toBe(
            "key-path",
        );
    });

    it("returns all distinct PSBT leaves, including scripts without known templates", () => {
        const path = extractSpendPath({ tapLeafScript: [leaf("51"), leaf("52"), leaf("51")] });
        expect(path?.kind).toBe("script-path");
        if (!path || path.kind !== "script-path") throw new Error("expected script path");
        expect(path.scripts.map((script) => script.scriptHex)).toEqual(["51", "52"]);
    });

    it("strips only the PSBT leaf version and keeps an empty leaf", () => {
        const path = extractSpendPath({ tapLeafScript: [leaf("")] });
        if (!path || path.kind !== "script-path") throw new Error("expected script path");
        expect(path.scripts[0].scriptHex).toBe("");
    });

    it("retains malformed script bytes from a PSBT leaf", () => {
        const path = extractSpendPath({ tapLeafScript: [leaf("4c0201")] });
        if (!path || path.kind !== "script-path") throw new Error("expected script path");
        expect(path.scripts[0]).toMatchObject({ scriptHex: "4c0201", asm: [] });
    });

    it("uses the finalized witness leaf instead of PSBT candidates", () => {
        const path = extractSpendPath({
            tapLeafScript: [leaf("52")],
            finalScriptWitness: [new Uint8Array(64), hex.decode("51"), controlBlock()],
        });
        if (!path || path.kind !== "script-path") throw new Error("expected script path");
        expect(path.scripts.map((script) => script.scriptHex)).toEqual(["51"]);
    });

    it("uses a finalized key-path witness instead of PSBT candidates", () => {
        expect(
            extractSpendPath({
                tapLeafScript: [leaf("51")],
                finalScriptWitness: [new Uint8Array(64).fill(1)],
            })?.kind,
        ).toBe("key-path");
    });

    it("ignores an annex after a finalized script-path witness", () => {
        const path = extractSpendPath({
            finalScriptWitness: [
                new Uint8Array(64),
                hex.decode("51"),
                controlBlock(),
                hex.decode("5001"),
            ],
        });
        if (!path || path.kind !== "script-path") throw new Error("expected script path");
        expect(path.scripts[0].scriptHex).toBe("51");
    });

    it("ignores an annex after a finalized key-path signature", () => {
        expect(
            extractSpendPath({
                finalScriptWitness: [new Uint8Array(64).fill(1), hex.decode("5001")],
            })?.kind,
        ).toBe("key-path");
    });

    it("does not mistake malformed control-block data for a revealed script", () => {
        const invalid = new Uint8Array(34);
        invalid[0] = 0xc0;
        expect(
            extractSpendPath({
                finalScriptWitness: [new Uint8Array(64), hex.decode("51"), invalid],
            })?.kind,
        ).toBe("unknown");
    });

    it("does not interpret a compressed public key in a segwit witness as a control block", () => {
        const publicKey = new Uint8Array(33);
        publicKey[0] = 0x02;
        expect(
            extractSpendPath({ finalScriptWitness: [new Uint8Array(72), publicKey] })?.kind,
        ).toBe("unknown");
    });

    it("reports unavailable leaf data for script signatures without leaves", () => {
        expect(
            extractSpendPath({
                tapScriptSig: [
                    [{ pubKey: USER_KEY, leafHash: new Uint8Array(32) }, new Uint8Array(64)],
                ],
            })?.kind,
        ).toBe("unknown");
    });

    it("returns null when no witness information is present", () => {
        expect(extractSpendPath({})).toBeNull();
        expect(extractSpendPath(null)).toBeNull();
    });
});

describe("live indexer regression: mutinynet tx e2316f56", () => {
    // PSBT exactly as returned by /v1/indexer/virtualTx/e2316f56... on mutinynet.
    // Input 0 reveals tapscripts; input 1 carries a key-path signature.
    const PSBT =
        "cHNidP8BAIgDAAAAAv8f/lsL1/ZYzDAaF0J15MOfD71FVFWWkzodJa8oklKIAAAAAAD/////4t0BZebZQmFcK66TdRlOFrzMmkLk0RR0rNCWais6BJIAAAAAAP////8CWigAAAAAAAAWABQVBI5BYzCEv8rpHQOzwrt/aseEQAAAAAAAAAAABFECTnMAAAAAAAEBKxAnAAAAAAAAIlEgfUHeS4k/se8aUxQdAXOcu9R5cA34vxbLApGEiYfiJ8lBFOFaevjFVQ+B5eHdf1k1BkdqaiYi6MJoSCqbsw5HyWvQZO24hFnIhxN6wvRcyw4cciBEHO0FK4wLg15zPEP8bl5A9i41zqpbpIdnYP/C49aoi+SJpLQoPXjly8mXKyX2f+trlfAhysueJBeQ9QO/vntxuJz7HXtEMJPA4WqBpx5aKEEUMBB4gI5Pe8Da3+KeNLHfjq8BCO8GsXIidAdevBB6Enpk7biEWciHE3rC9FzLDhxyIEQc7QUrjAuDXnM8Q/xuXkBt7hhIFObwIqTcqbwe4gd2CvSwqVC28MudpCXBdPXstRQw6WYnXyIlMcm1l9FFpiG/X6mX4EEIyJNzQEpQdZ4iQhXBUJKbdMGgSVS3i0tgNel6XgeKWg8o7JbVR7/ums6AOsDjPSco+SLPyqD9E72O8MYtH9vepPh6TEOGXHN/41dZfUUgMBB4gI5Pe8Da3+KeNLHfjq8BCO8GsXIidAdevBB6EnqtIOFaevjFVQ+B5eHdf1k1BkdqaiYi6MJoSCqbsw5HyWvQrMAAAQErSgEAAAAAAAAiUSB+8iB0dj6/afj0ghC58oBWmTZvMtu/hkqlAZSjolKA8wETQHfE6d5KesawLRqF9kJXwvVTA/hJl/EpuHSH9QDzhV0GoZ2zodeP+SPbdozzxr717r8GH8SdKHEohh6KE4blqa4AAAA=";
    const ARKADE_SCRIPT =
        "db03009d0494dc690474797065f86908726567697374657288166f6e636861696e5f6f75747075745f696e6465786573f869025b5d8817636f7369676e6572735f7075626c69635f6b6579732e30f869423033623762333639323639313333663137303536653635396638663632623161336164656236323137636162666636633231366139303432643864653538656566628817636f7369676e6572735f7075626c69635f6b6579732e31f8916975cd8ccf022c0193cdc9a269cd8c5500f7";

    it("preserves revealed scripts and the key-path spend", () => {
        const tx = btc.Transaction.fromPSBT(Uint8Array.from(Buffer.from(PSBT, "base64")));
        expect(tx.inputsLength).toBe(2);

        const p0 = extractSpendPath(tx.getInput(0));
        expect(p0?.kind).toBe("script-path");
        if (!p0 || p0.kind !== "script-path") throw new Error("expected script path");
        expect(p0.scripts.length).toBeGreaterThan(0);
        expect(p0.scripts[0].asm).toContain("OP_CHECKSIG");
        expect(p0.scripts[0]).not.toHaveProperty("label");

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
        expect(bound.scripts[0].arkadeScript?.scriptHex).toBe(ARKADE_SCRIPT);
        expect(bound.scripts[0].arkadeScript?.asm).toContain("OP_INSPECTINTENTMESSAGE");
        expect(bound.scripts[0].arkadeScript?.asm).toContain('"type"');

        const unbound = extractSpendPath(tx.getInput(0), { arkadeScripts: [other] });
        if (!unbound || unbound.kind !== "script-path") throw new Error("expected script path");
        expect(unbound.scripts[0].arkadeScript).toBeUndefined();
    });
});
