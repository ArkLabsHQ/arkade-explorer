import type { ExitPackage } from '@arkade-os/sdk';
import { ArrowRight, Clock, Eye } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { esploraUrlFor } from '@/lib/exit/esplora';
import { cn, formatSats, truncateHash } from '@/lib/utils';
import { Button, Card, CardTitle } from '@/components/exit/ui';

function btc(sats: number): string {
  return `${(sats / 1e8).toLocaleString('en-US', { maximumFractionDigits: 8 })} BTC`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-lg text-foreground tabular-nums">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Warning({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'warn' | 'danger';
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-sm',
        tone === 'danger'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-xs opacity-90">{children}</p>
      </div>
    </div>
  );
}

export function ReviewScreen({
  pkg,
  network,
  onContinue,
}: {
  pkg: ExitPackage;
  network: string | undefined;
  onContinue: (esploraUrl: string) => void;
}) {
  const [esplora, setEsplora] = useState(() => esploraUrlFor(network));
  const active = pkg.vtxos.filter((v) => !v.skipped);
  const skipped = pkg.vtxos.filter((v) => v.skipped);
  const graph = pkg.mode === 'graph';

  const expired = useMemo(
    () => (pkg.validUntil ? Date.now() / 1000 > pkg.validUntil : false),
    [pkg.validUntil],
  );
  const hasConditionSweep = active.some((v) => v.path?.startsWith('vhtlc'));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>Exit summary</CardTitle>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {pkg.network}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
                graph ? 'bg-blue-500/15 text-blue-500' : 'bg-primary/15 text-primary',
              )}
            >
              {graph ? 'graph · you fund' : 'funded · keyless'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Transactions" value={String(pkg.totals.txCount)} />
          <Stat
            label="Total fees"
            value={formatSats(pkg.totals.totalFeeSats)}
            hint={`${pkg.feeRate} sat/vB`}
          />
          <Stat
            label={graph ? 'You send' : 'Funding needed'}
            value={formatSats(pkg.totals.fundingRequiredSats)}
            hint={graph ? 'to a throwaway fee address' : 'to the fee wallet'}
          />
          <Stat
            label="You recover"
            value={btc(pkg.totals.recoveredSats)}
            hint={formatSats(pkg.totals.recoveredSats)}
          />
        </div>
      </Card>

      {expired && (
        <Warning tone="danger" icon={<Clock className="h-4 w-4" />} title="Validity window passed">
          This package’s <span className="font-mono">validUntil</span> has elapsed. The operator may
          already have swept some branches. Execution will still try — it is harmless — but some
          steps may conflict.
        </Warning>
      )}

      {hasConditionSweep && (
        <Warning
          tone="warn"
          icon={<Eye className="h-4 w-4" />}
          title="Contains condition witnesses"
        >
          A sweep spends a contract path (e.g. a VHTLC preimage). That secret is embedded in the
          pre-signed transaction — treat this package as confidential until every step is broadcast.
        </Warning>
      )}

      <Card>
        <CardTitle>Destination &amp; VTXOs</CardTitle>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sweep address</span>
            <span className="font-mono text-xs text-foreground" title={pkg.sweepAddress}>
              {truncateHash(pkg.sweepAddress, 10, 8)}
            </span>
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {active.map((v) => (
              <div key={v.outpoint} className="flex items-center justify-between gap-3 p-3">
                <span className="font-mono text-xs text-muted-foreground" title={v.outpoint}>
                  {truncateHash(v.outpoint, 10, 8)}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  {v.path && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {v.path}
                    </span>
                  )}
                  {v.delay && (
                    <span className="text-muted-foreground">
                      +{v.delay.value} {v.delay.type === 'blocks' ? 'blk' : 's'}
                    </span>
                  )}
                  <span className="font-mono text-foreground tabular-nums">
                    {formatSats(v.value ?? 0)}
                  </span>
                </div>
              </div>
            ))}
            {skipped.map((v) => (
              <div
                key={v.outpoint}
                className="flex items-center justify-between gap-3 p-3 opacity-60"
              >
                <span className="font-mono text-xs text-muted-foreground" title={v.outpoint}>
                  {truncateHash(v.outpoint, 10, 8)}
                </span>
                <span className="text-xs text-destructive/80">skipped · {v.skipped}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Esplora endpoint</CardTitle>
        <div className="mt-4 flex flex-col gap-2">
          <input
            value={esplora}
            onChange={(e) => setEsplora(e.target.value)}
            spellCheck={false}
            className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Must be CORS-permissive and expose <span className="font-mono">/txs/package</span>.
            Defaulted for <span className="font-mono">{pkg.network}</span>.
          </p>
        </div>
      </Card>

      <Button
        className="self-end"
        disabled={active.length === 0 || !esplora.trim()}
        onClick={() => onContinue(esplora.trim())}
      >
        {graph ? 'Set up funding' : 'Begin execution'}
        <ArrowRight />
      </Button>
    </div>
  );
}
