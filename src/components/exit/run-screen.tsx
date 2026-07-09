import {
  EsploraProvider,
  UnilateralExit,
  type ExecutorEvent,
  type ExitPackage,
} from '@arkade-os/sdk';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadOrCreateFeeKey, makeFeeWallet, type FeeWalletHandle } from '@/lib/exit/fee-wallet';
import { KIND_LABEL, PHASE_STYLE, phaseFor, type StepPhase } from '@/components/exit/step-meta';
import { FundingGate } from '@/components/exit/funding-gate';
import { Card, CardTitle } from '@/components/exit/ui';
import { CopyButton } from '@/components/shared/copy-button';
import { cn, truncateHash } from '@/lib/utils';

export function RunScreen({
  pkg,
  esploraUrl,
  network,
}: {
  pkg: ExitPackage;
  esploraUrl: string;
  network: string | undefined;
}) {
  const graph = pkg.mode === 'graph';
  const [phase, setPhase] = useState<'funding' | 'running'>(graph ? 'funding' : 'running');
  const [fee, setFee] = useState<FeeWalletHandle | null>(null);
  const [feeKeyNonce, setFeeKeyNonce] = useState(0);

  const provider = useMemo(() => new EsploraProvider(esploraUrl), [esploraUrl]);

  useEffect(() => {
    if (!graph) return;
    let live = true;
    void makeFeeWallet(loadOrCreateFeeKey(), network ?? 'bitcoin', esploraUrl).then((f) => {
      if (live) setFee(f);
    });
    return () => {
      live = false;
    };
  }, [graph, network, esploraUrl, feeKeyNonce]);

  if (phase === 'funding') {
    if (!fee) {
      return (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparing fee wallet…
        </div>
      );
    }
    return (
      <FundingGate
        fee={fee}
        required={pkg.totals.fundingRequiredSats}
        onReady={() => setPhase('running')}
        onRegenerate={() => setFeeKeyNonce((n) => n + 1)}
      />
    );
  }

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
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // guard StrictMode double-invoke
    started.current = true;
    const executor = new UnilateralExit.Executor(pkg, provider, { feeWallet, pollIntervalMs: 4000 });
    (async () => {
      try {
        for await (const ev of executor) {
          if (ev.stepIndex < 0) {
            if (ev.reason) setWarnings((w) => [...w, ev.reason!]);
            continue;
          }
          setEvents((prev) => new Map(prev).set(ev.stepIndex, ev));
        }
        setDone(true);
      } catch (e) {
        setFatal(e instanceof Error ? e.message : String(e));
      }
    })();
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

  const confirmed = pkg.steps.filter(
    (_, i) => events.get(i)?.status === 'confirmed' || events.get(i)?.status === 'skipped',
  ).length;
  const failed = [...events.values()].filter((e) => e.status === 'failed').length;
  const pct = pkg.steps.length ? (confirmed / pkg.steps.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>{done ? (failed ? 'Finished with failures' : 'Exit complete') : 'Executing exit'}</CardTitle>
          {!done ? (
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
  const phase: StepPhase = event ? phaseFor(event.status) : 'pending';
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
          {event?.reason && phase === 'failed' && (
            <span className="text-xs text-destructive/80">{event.reason}</span>
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
