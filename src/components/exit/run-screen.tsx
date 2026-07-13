import {
  EsploraProvider,
  UnilateralExit,
  type ExecutorEvent,
  type ExitPackage,
} from '@arkade-os/sdk';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadOrCreateFeeKey, makeFeeWallet, type FeeWalletHandle } from '@/lib/exit/fee-wallet';
import { KIND_LABEL, PHASE_STYLE, phaseFor, type StepPhase } from '@/components/exit/step-meta';
import { FundingGate } from '@/components/exit/funding-gate';
import { Card, CardTitle } from '@/components/exit/ui';
import { CopyButton } from '@/components/shared/copy-button';
import { cn, truncateHash } from '@/lib/utils';

export function RunScreen({
  pkg,
  esploraUrl,
  embeddedFeeKeyHex,
}: {
  pkg: ExitPackage;
  esploraUrl: string;
  /** Fee key carried inside a self-executable bundle; funds the graph-mode CPFP
   * bumps from an already-funded address instead of a freshly generated one. */
  embeddedFeeKeyHex?: string | null;
}) {
  const graph = pkg.mode === 'graph';
  // Graph mode always shows the funding gate — even with an embedded fee key it
  // stays visible so the fee address is never hidden and the balance is
  // confirmed before broadcasting (an embedded key just pre-funds it).
  const [phase, setPhase] = useState<'funding' | 'running'>(graph ? 'funding' : 'running');
  const [fee, setFee] = useState<FeeWalletHandle | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);

  const provider = useMemo(() => new EsploraProvider(esploraUrl), [esploraUrl]);

  useEffect(() => {
    if (!graph) return;
    let live = true;
    const privKey = embeddedFeeKeyHex ?? loadOrCreateFeeKey();
    // Network comes from the package itself, not the connected Ark server.
    makeFeeWallet(privKey, pkg.network, esploraUrl)
      .then((f) => {
        if (live) setFee(f);
      })
      .catch((e) => {
        if (live) setFeeError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, [graph, pkg.network, esploraUrl, embeddedFeeKeyHex]);

  const preparing = (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Preparing fee wallet…
    </div>
  );
  const feeErrorBanner = feeError ? (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      Couldn’t prepare the fee wallet: {feeError}
    </div>
  ) : null;

  if (phase === 'funding') {
    if (feeError) return feeErrorBanner;
    if (!fee) return preparing;
    return (
      <FundingGate
        fee={fee}
        required={pkg.totals.fundingRequiredSats}
        pkg={pkg}
        onReady={() => setPhase('running')}
      />
    );
  }

  // Graph mode always needs its fee wallet before the executor can bump anchors.
  if (graph && !fee) return feeError ? feeErrorBanner : preparing;

  return <ExecutionTimeline pkg={pkg} provider={provider} feeWallet={fee?.wallet} />;
}

function ExecutionTimeline({
  pkg,
  provider,
  feeWallet,
}: {
  pkg: ExitPackage;
  provider: EsploraProvider;
  feeWallet?: FeeWalletHandle['wallet'];
}) {
  const [events, setEvents] = useState<Map<number, ExecutorEvent>>(new Map());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [tipHeight, setTipHeight] = useState<number | null>(null);
  useEffect(() => {
    const executor = new UnilateralExit.Executor(pkg, provider, { feeWallet, pollIntervalMs: 4000 });
    const iterator = executor[Symbol.asyncIterator]();
    let cancelled = false;
    (async () => {
      try {
        for (let r = await iterator.next(); !r.done; r = await iterator.next()) {
          if (cancelled) return;
          const ev = r.value;
          if (ev.stepIndex < 0) {
            if (ev.reason) setWarnings((w) => [...w, ev.reason!]);
            continue;
          }
          setEvents((prev) => new Map(prev).set(ev.stepIndex, ev));
        }
        if (!cancelled) setDone(true);
      } catch (e) {
        if (!cancelled) setFatal(e instanceof Error ? e.message : String(e));
      }
    })();
    // Unmount (e.g. "Start over") must stop the executor — otherwise the
    // detached loop keeps polling and broadcasting the remaining steps in the
    // background. Returning the async iterator halts the generator at its next
    // suspension point; idempotency makes an in-flight step safe to re-run.
    return () => {
      cancelled = true;
      void iterator.return?.(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyWaiting = [...events.values()].some((e) => e.status === 'waiting_csv');
  useEffect(() => {
    if (!anyWaiting) return;
    let live = true;
    const poll = async () => {
      try {
        const tip = await provider.getChainTip();
        if (live) setTipHeight(tip.height);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const id = setInterval(poll, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [anyWaiting, provider]);

  const confirmed = pkg.steps.filter((_, i) => {
    const e = events.get(i);
    // A "skipped" step only counts as onchain when it was already there (no
    // reason); a skip with a reason means its branch failed upstream.
    return e?.status === 'confirmed' || (e?.status === 'skipped' && !e.reason);
  }).length;
  const failed = [...events.values()].filter((e) => e.status === 'failed').length;
  const pct = pkg.steps.length ? (confirmed / pkg.steps.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>
            {fatal
              ? 'Execution stopped'
              : done
                ? failed
                  ? 'Finished with failures'
                  : 'Exit complete'
                : 'Executing exit'}
          </CardTitle>
          {fatal ? (
            <span className="flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert className="h-3.5 w-3.5" /> stopped
            </span>
          ) : !done ? (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> running
            </span>
          ) : failed ? (
            <span className="flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert className="h-3.5 w-3.5" /> partial
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> done
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {confirmed} / {pkg.steps.length} transactions onchain
            </span>
            {failed > 0 && <span className="text-destructive">{failed} failed</span>}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full transition-all',
                failed ? 'bg-destructive' : done ? 'bg-emerald-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!done && (
            <p className="text-[11px] text-muted-foreground">
              Safe to close and reopen — execution reads only the blockchain, so it resumes where it
              left off.
            </p>
          )}
        </div>
      </Card>

      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{w}</span>
        </div>
      ))}

      {fatal && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Executor stopped: {fatal}
        </div>
      )}

      <ol className="flex flex-col">
        {pkg.steps.map((step, i) => (
          <TimelineRow
            key={i}
            index={i}
            last={i === pkg.steps.length - 1}
            kindLabel={KIND_LABEL[step.kind]}
            txid={'txid' in step ? step.txid : (step as { parentTxid: string }).parentTxid}
            event={events.get(i)}
            tipHeight={tipHeight}
          />
        ))}
      </ol>
    </div>
  );
}

function TimelineRow({
  index,
  last,
  kindLabel,
  txid,
  event,
  tipHeight,
}: {
  index: number;
  last: boolean;
  kindLabel: string;
  txid: string;
  event?: ExecutorEvent;
  tipHeight: number | null;
}) {
  const phase: StepPhase = event ? phaseFor(event.status, event.reason) : 'pending';
  const s = PHASE_STYLE[phase];
  const blocksLeft =
    event?.status === 'waiting_csv' && event.maturesAtHeight && tipHeight !== null
      ? Math.max(0, event.maturesAtHeight - tipHeight)
      : null;

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-background',
            s.ring,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
        </span>
        {!last && <span className="w-px flex-1 bg-border" />}
      </div>
      <div className="flex flex-1 items-start justify-between gap-3 pb-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">
            <span className="font-mono text-muted-foreground">{index + 1}.</span> {kindLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">{truncateHash(txid, 8, 6)}</span>
            <CopyButton text={txid} />
          </span>
          {event?.reason && (phase === 'failed' || phase === 'skipped') && (
            <span
              className={cn(
                'text-xs',
                phase === 'failed' ? 'text-destructive/80' : 'text-muted-foreground',
              )}
            >
              {event.reason}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn('text-xs font-medium', s.text)}>{s.label}</span>
          {blocksLeft !== null && (
            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
              ~{blocksLeft} block{blocksLeft === 1 ? '' : 's'} left
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
