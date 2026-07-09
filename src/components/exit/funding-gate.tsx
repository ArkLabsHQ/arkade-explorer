import { RefreshCw, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { resetFeeKey, type FeeWalletHandle } from '@/lib/exit/fee-wallet';
import { formatSats } from '@/lib/utils';
import { CopyButton } from '@/components/shared/copy-button';
import { Button, Card, CardTitle } from '@/components/exit/ui';

/** A minimal progress bar built from tokens (the explorer has no Progress). */
function Bar({ pct, done }: { pct: number; done: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={done ? 'h-full bg-emerald-500 transition-all' : 'h-full bg-primary transition-all'}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

/**
 * Graph-mode funding gate: this browser owns a throwaway fee key; the user
 * sends fee sats to its address and we proceed once the deposit confirms.
 */
export function FundingGate({
  fee,
  required,
  onReady,
  onRegenerate,
}: {
  fee: FeeWalletHandle;
  required: number;
  onReady: () => void;
  onRegenerate: () => void;
}) {
  const [balance, setBalance] = useState(0);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const b = await fee.confirmedBalance();
        if (live) setBalance(b);
      } catch {
        /* endpoint hiccup — keep polling */
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

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <CardTitle>Fund the exit</CardTitle>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Send at least{' '}
          <span className="font-mono font-medium text-foreground">{formatSats(required)}</span> to
          this throwaway fee address. It only ever holds fee sats — never your exited funds — and
          lives in this browser. Change comes back to it.
        </p>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <span className="break-all font-mono text-xs text-foreground">{fee.address}</span>
          <CopyButton text={fee.address} className="shrink-0" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Received (confirmed)</span>
            <span className="font-mono text-foreground tabular-nums">
              {formatSats(balance)} / {formatSats(required)}
            </span>
          </div>
          <Bar pct={pct} done={funded} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setShowKey((s) => !s)}>
              {showKey ? 'Hide' : 'Export'} fee key
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                resetFeeKey();
                onRegenerate();
              }}
              title="Discard this fee key and generate a new one"
            >
              <RefreshCw className="h-3.5 w-3.5" /> New key
            </Button>
          </div>
          <Button disabled={!funded} onClick={onReady}>
            {funded ? 'Proceed' : 'Waiting for deposit…'}
          </Button>
        </div>

        {showKey && (
          <p className="break-all rounded border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
            {fee.privKeyHex}
          </p>
        )}
      </div>
    </Card>
  );
}
