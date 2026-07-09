import type { ExitPackage } from '@arkade-os/sdk';
import { DoorOpen, RotateCcw, ShieldAlert } from 'lucide-react';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { ImportScreen } from '@/components/exit/import-screen';
import { ReviewScreen } from '@/components/exit/review-screen';
import { RunScreen } from '@/components/exit/run-screen';
import { PageTransition } from '@/components/shared/page-transition';
import { cn } from '@/lib/utils';

type Screen = 'import' | 'review' | 'run';
const STEPS: { id: Screen; label: string }[] = [
  { id: 'import', label: 'Import' },
  { id: 'review', label: 'Review' },
  { id: 'run', label: 'Execute' },
];

/**
 * Defense-in-depth: a malformed package that clears decode validation but still
 * throws during render must not blank the whole app. Keyed by screen so it
 * resets on navigation / "Start over". The header (with Start over) lives
 * outside it, so the user can always recover.
 */
class ScreenErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Couldn’t render this package</p>
            <p className="mt-0.5 text-xs opacity-90">
              {this.state.error.message}. Use “Start over” to load a different one.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Self-contained, keyless unilateral-exit executor. Imports a pre-signed exit
 * package (from `@arkade-os/sdk`'s `UnilateralExit.prepare()`) and drives it
 * onchain with only an Esplora endpoint. Deliberately NOT linked from the rest
 * of the explorer — reachable directly at /unilateral-exit.
 */
export function UnilateralExitPage() {
  const [screen, setScreen] = useState<Screen>('import');
  const [pkg, setPkg] = useState<ExitPackage | null>(null);
  const [feeKeyHex, setFeeKeyHex] = useState<string | null>(null);
  const [esplora, setEsplora] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    document.title = 'Unilateral Exit | Arkade Explorer';
    return () => {
      document.title = 'Arkade Explorer';
    };
  }, []);

  const reset = () => {
    setPkg(null);
    setFeeKeyHex(null);
    setEsplora('');
    setScreen('import');
    setConfirmingReset(false);
  };

  // Once execution has started, guard "Start over": it doesn't stop broadcasts
  // already made and it discards the live progress view.
  const onStartOver = () => {
    if (screen === 'run' && !confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    reset();
  };

  const currentIndex = STEPS.findIndex((s) => s.id === screen);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <DoorOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Unilateral Exit</h1>
              <p className="text-[11px] text-muted-foreground">
                keyless executor · your funds, onchain, no operator
              </p>
            </div>
          </div>
          {pkg &&
            (confirmingReset ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-[11px] text-muted-foreground sm:inline">
                  Broadcasts already sent won’t stop.
                </span>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Confirm start over
                </button>
                <button
                  onClick={() => setConfirmingReset(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={onStartOver}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Start over
              </button>
            ))}
        </div>

        <nav className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold tabular-nums',
                    i < currentIndex && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                    i === currentIndex && 'bg-primary text-primary-foreground',
                    i > currentIndex && 'border border-border text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn('text-xs', i === currentIndex ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={cn('h-px flex-1', i < currentIndex ? 'bg-emerald-500/40' : 'bg-border')} />
              )}
            </div>
          ))}
        </nav>

        <ScreenErrorBoundary key={screen}>
          {screen === 'import' && (
            <ImportScreen
              onImport={(loaded) => {
                setPkg(loaded.pkg);
                setFeeKeyHex(loaded.feeKeyHex ?? null);
                setScreen('review');
              }}
            />
          )}
          {screen === 'review' && pkg && (
            <ReviewScreen
              pkg={pkg}
              onContinue={(url) => {
                setEsplora(url);
                setScreen('run');
              }}
            />
          )}
          {screen === 'run' && pkg && esplora && (
            <RunScreen pkg={pkg} esploraUrl={esplora} embeddedFeeKeyHex={feeKeyHex} />
          )}
        </ScreenErrorBoundary>

        <p className="border-t border-border pt-4 text-[11px] text-muted-foreground">
          Runs entirely in your browser. Package secrets never leave this page except as
          transactions broadcast to your chosen Esplora endpoint.
        </p>
      </div>
    </PageTransition>
  );
}
