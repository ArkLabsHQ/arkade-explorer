import type { CommitmentTx } from "@arkade-os/sdk";
import { MoneyDisplay } from "@/components/shared/money-display";
import { formatTimestamp } from "@/lib/utils";

export function CommitmentSummary({ metadata }: { metadata: CommitmentTx }) {
    return (
        <div className="space-y-5">
            <dl className="grid gap-5 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto]">
                <div className="min-w-0 space-y-2">
                    <dt className="text-sm text-muted-foreground">VTXO inputs</dt>
                    <dd className="space-y-1">
                        <MoneyDisplay
                            sats={BigInt(metadata.totalInputAmount || "0")}
                            className="block text-xl font-semibold sm:text-2xl"
                            unitClassName="text-xs font-normal text-muted-foreground"
                        />
                        <span className="block text-xs tabular-nums text-muted-foreground">
                            {(metadata.totalInputVtxos ?? 0).toLocaleString()} VTXO
                            {metadata.totalInputVtxos !== 1 ? "s" : ""}
                        </span>
                    </dd>
                </div>
                <div className="min-w-0 space-y-2">
                    <dt className="text-sm text-muted-foreground">VTXO outputs</dt>
                    <dd className="space-y-1">
                        <MoneyDisplay
                            sats={BigInt(metadata.totalOutputAmount || "0")}
                            className="block text-xl font-semibold sm:text-2xl"
                            unitClassName="text-xs font-normal text-muted-foreground"
                        />
                        <span className="block text-xs tabular-nums text-muted-foreground">
                            {(metadata.totalOutputVtxos ?? 0).toLocaleString()} VTXO
                            {metadata.totalOutputVtxos !== 1 ? "s" : ""}
                        </span>
                    </dd>
                </div>
                <div className="min-w-0 space-y-2 sm:col-span-2 md:col-span-1 md:border-l md:border-border md:pl-6">
                    <dt className="text-sm text-muted-foreground">Batches</dt>
                    <dd className="text-xl font-semibold tabular-nums sm:text-2xl">
                        {Object.keys(metadata.batches ?? {}).length.toLocaleString()}
                    </dd>
                </div>
            </dl>
            <dl className="grid gap-x-6 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <dt className="text-muted-foreground">Started</dt>
                    <dd className="tabular-nums text-foreground">
                        {metadata.startedAt ? formatTimestamp(metadata.startedAt) : "—"}
                    </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <dt className="text-muted-foreground">Ended</dt>
                    <dd className="tabular-nums text-foreground">
                        {metadata.endedAt ? formatTimestamp(metadata.endedAt) : "—"}
                    </dd>
                </div>
            </dl>
        </div>
    );
}
