import type { ExitPackage } from "@arkade-os/sdk";
import { CircleAlert, Download, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { encodeExitBundle } from "@/lib/exit/package";
import { type FeeWalletHandle } from "@/lib/exit/fee-wallet";
import { MoneyDisplay } from "@/components/shared/money-display";
import { CopyButton } from "@/components/shared/copy-button";
import { Button, Card, CardTitle } from "@/components/exit/ui";

/** A minimal progress bar built from tokens (the explorer has no Progress). */
function Bar({ pct, done }: { pct: number; done: boolean }) {
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
                className={
                    done
                        ? "h-full bg-emerald-500 transition-all"
                        : "h-full bg-primary transition-all"
                }
                style={{ width: `${Math.min(100, pct)}%` }}
            />
        </div>
    );
}

function downloadText(filename: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    // Firefox only triggers a programmatic download when the anchor is in the
    // document; defer the revoke so the browser can read the blob first.
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Graph-mode funding gate: this browser owns a throwaway fee key; the user
 * sends fee sats to its address and we proceed once the deposit confirms.
 * The exit can also be exported as a self-executable bundle carrying that fee
 * key, so another machine can run it against the already-funded address.
 */
export function FundingGate({
    fee,
    required,
    pkg,
    onReady,
}: {
    fee: FeeWalletHandle;
    required: number;
    pkg: ExitPackage;
    onReady: () => void;
}) {
    const [balance, setBalance] = useState(0);
    const [unreachable, setUnreachable] = useState(false);

    useEffect(() => {
        let live = true;
        let failures = 0;
        const poll = async () => {
            try {
                const b = await fee.confirmedBalance();
                if (!live) return;
                setBalance(b);
                failures = 0;
                setUnreachable(false);
            } catch {
                // Tolerate transient hiccups, but after a few consecutive failures
                // surface the outage — otherwise "can't reach the endpoint" is
                // indistinguishable from "deposit not seen yet" and the user waits
                // forever (or re-sends fees).
                failures += 1;
                if (live && failures >= 3) setUnreachable(true);
            }
        };
        void poll();
        const id = setInterval(poll, 5000);
        return () => {
            live = false;
            clearInterval(id);
        };
    }, [fee]);

    const funded = balance >= required;
    const pct = required > 0 ? (balance / required) * 100 : 0;
    const bundle = encodeExitBundle(pkg, fee.privKeyHex);

    return (
        <Card>
            <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <CardTitle>Fund the exit</CardTitle>
            </div>
            <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                    Send at least{" "}
                    <span className="font-medium text-foreground">
                        <MoneyDisplay sats={required} />
                    </span>{" "}
                    to this throwaway fee address. It only ever holds fee sats — never your exited
                    funds — and lives in this browser. Change comes back to it.
                </p>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <span className="break-all font-mono text-xs text-foreground">
                        {fee.address}
                    </span>
                    <CopyButton text={fee.address} className="shrink-0" />
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Received (confirmed)</span>
                        <span className="font-mono text-foreground tabular-nums">
                            <MoneyDisplay sats={balance} /> / <MoneyDisplay sats={required} />
                        </span>
                    </div>
                    <Bar pct={pct} done={funded} />
                </div>

                {unreachable && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            Can’t reach the Esplora endpoint to check the balance — still retrying.
                            If this persists, verify the endpoint in Review → Advanced settings.
                        </span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={() =>
                                downloadText(`arkade-exit-${pkg.createdAt}.json`, bundle)
                            }
                            title="Download this exit with its fee key embedded, so another machine can run it standalone"
                        >
                            <Download className="h-3.5 w-3.5" /> Export package
                        </Button>
                        <CopyButton text={bundle} />
                    </div>
                    <Button disabled={!funded} onClick={onReady}>
                        {funded ? "Proceed" : "Waiting for deposit…"}
                    </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                    Export produces a self-executable bundle with the fee key embedded — the
                    graph-mode equivalent of a fully-signed package. Keep it private: anyone holding
                    it can spend the small fee remainder.
                </p>
            </div>
        </Card>
    );
}
