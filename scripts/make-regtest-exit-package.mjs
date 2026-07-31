/**
 * Produce a REAL, broadcastable unilateral-exit package against the local
 * regtest stack, so the exit UI's success path can be verified against live
 * executor events rather than reasoned about.
 *
 * Everything else about the exit UI has been checked end to end. The one thing
 * that could not be was a run that succeeds: the `active` → `waiting` →
 * `confirmed` sequence only appears when transactions actually confirm, and a
 * hand-made fixture cannot be broadcast. This builds a genuine one.
 *
 * Requires the arkade regtest stack (arkd, arkd-wallet, bitcoin-miner, esplora)
 * and the `regtest.mjs` CLI from the ts-sdk checkout.
 *
 *   node --experimental-eventsource scripts/make-regtest-exit-package.mjs > exit-package.json
 *
 * The flag is required: settlement subscribes to the operator's event stream
 * over SSE, and Node only exposes a global EventSource behind it.
 *
 * Writes progress to stderr and the package JSON to stdout, so it can be piped
 * straight into a file or a share link. Regtest only — never point this at a
 * network where the coins matter.
 */
import { execFileSync } from "node:child_process";
import {
    EsploraProvider,
    InMemoryContractRepository,
    InMemoryWalletRepository,
    MnemonicIdentity,
    OnchainWallet,
    UnilateralExit,
    Wallet,
} from "@arkade-os/sdk";
import { generateMnemonic } from "@scure/bip39";
// The `.js` suffix is required: @scure/bip39's exports map lists each wordlist
// with its extension, so the bare specifier does not resolve.
import { wordlist } from "@scure/bip39/wordlists/english.js";

const ARK_SERVER = "http://localhost:7070";
const ESPLORA = "http://localhost:3000/api";
const TS_SDK = process.env.TS_SDK_DIR ?? "C:/Git/ts-sdk";
const VTXO_SATS = 60_000;
/** Settlement fee headroom; the operator here requires at least 600 sats. */
const INTENT_FEE_SATS = 1_000;

const log = (...a) => console.error("[exit-pkg]", ...a);

/**
 * Argument arrays, not shell strings. Every value interpolated below is
 * SDK-generated (addresses, amounts) rather than user input, so injection is
 * theoretical here — but a bare `execFileSync` costs nothing and keeps it that
 * way if this ever grows an argument someone can influence.
 */
const run = (file, args, cwd) =>
    execFileSync(file, args, { encoding: "utf8", cwd, stdio: ["ignore", "pipe", "pipe"] }).trim();

/** The regtest CLI lives in the ts-sdk checkout and must run from its root. */
const regtest = (...args) => run("node", ["regtest/regtest.mjs", ...args], TS_SDK);
/** arkd's own CLI, for offchain sends — the only way to mint a VTXO here. */
const arkd = (...args) => run("docker", ["exec", "-t", "arkd", ...args]);

async function waitFor(label, fn, timeoutMs = 60_000, everyMs = 1000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (await fn()) return;
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
        await new Promise((r) => setTimeout(r, everyMs));
    }
}

const provider = new EsploraProvider(ESPLORA, { forcePolling: true, pollingInterval: 1000 });

// A throwaway identity: this wallet exists only to own the VTXO being exited.
const identity = MnemonicIdentity.fromMnemonic(generateMnemonic(wordlist, 128), {
    isMainnet: false,
});

log("creating wallet…");
const wallet = await Wallet.create({
    identity,
    arkServerUrl: ARK_SERVER,
    onchainProvider: provider,
    // The SDK defaults to IndexedDB, which does not exist in Node — without
    // these it throws "IndexedDB is not available in this environment".
    storage: {
        walletRepository: new InMemoryWalletRepository(),
        contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
});

const offchainAddress = await wallet.getAddress();
log("offchain address:", offchainAddress);

log(`funding ${VTXO_SATS} sats offchain…`);
arkd("ark", "send", "--to", offchainAddress, "--amount", String(VTXO_SATS), "--password", "secret");
await waitFor("a vtxo to arrive", async () => (await wallet.getVtxos()).length > 0);

// Settle it: prepare() exits *settled* VTXOs, and a freshly received one is not
// yet anchored in a commitment transaction.
const vtxos = await wallet.getVtxos();
const vtxoTotal = vtxos.reduce((s, v) => s + v.value, 0);
log(`settling ${vtxos.length} vtxo(s), ${vtxoTotal} sats…`);
await wallet.settle({
    inputs: vtxos,
    outputs: [
        {
            // The intent fee is inputs minus outputs, so settling the full
            // amount leaves zero and the server rejects it with
            // INTENT_INSUFFICIENT_FEE. This operator's minimum is 600 sats;
            // leave headroom rather than pinning the exact figure.
            address: offchainAddress,
            amount: BigInt(vtxoTotal - INTENT_FEE_SATS),
        },
    ],
});
await waitFor("settled vtxos", async () => (await wallet.getVtxos()).length > 0);

// Funded mode signs fee children from an onchain wallet that must share the
// wallet identity — prepare() rejects a mismatch.
const feeWallet = await OnchainWallet.create(identity, "regtest");
const destination = await OnchainWallet.create(
    MnemonicIdentity.fromMnemonic(generateMnemonic(wordlist, 128), { isMainnet: false }),
    "regtest",
);
log("sweep destination:", destination.address);

const opts = {
    wallet,
    onchainWallet: feeWallet,
    sweepAddress: destination.address,
    feeRate: 2,
};

const quote = await UnilateralExit.estimate(opts);
log(
    `quote: ${quote.totals.txCount} txs, recover ${quote.totals.recoveredSats} sats,`,
    `funding needed ${quote.totals.fundingRequiredSats}`,
);

// Fund the fee wallet with the shortfall plus headroom; --confirm mines a block
// so the coins are spendable immediately.
const fundSats = quote.totals.fundingRequiredSats + 30_000;
log(`funding fee wallet with ${fundSats} sats onchain…`);
regtest("faucet", feeWallet.address, (fundSats / 1e8).toFixed(8), "--confirm");
await waitFor("fee wallet coins to confirm", async () =>
    (await feeWallet.getCoins()).some((c) => c.status.confirmed),
);

// prepare() signs every transaction AND broadcasts the funding splitter, which
// is why an exit can only ever be resumed and never restarted: by the time a
// package exists, money is already onchain.
log("preparing (this broadcasts the splitter)…");
const pkg = await UnilateralExit.prepare(opts);
regtest("mine", "1");

log(
    `package ready: mode=${pkg.mode} steps=${pkg.steps.length}`,
    `recover=${pkg.totals.recoveredSats} sats`,
);
log("step kinds:", pkg.steps.map((s) => s.kind).join(" → "));

process.stdout.write(JSON.stringify(pkg));

// The wallet holds an open SSE subscription to the operator, which keeps the
// event loop alive forever — without this the script finishes its work and then
// hangs, looking exactly like a failure. Nothing is left to flush: the package
// is already on stdout.
process.exit(0);
