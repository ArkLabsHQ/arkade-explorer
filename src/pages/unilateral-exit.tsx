import type { ExitPackage } from '@arkade-os/sdk';
import { DoorOpen, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServerInfo } from '@/providers/server-info-provider';
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
 * Self-contained, keyless unilateral-exit executor. Imports a pre-signed exit
 * package (from `@arkade-os/sdk`'s `UnilateralExit.prepare()`) and drives it
 * onchain with only an Esplora endpoint. Deliberately NOT linked from the rest
 * of the explorer — reachable directly at /unilateral-exit.
 */
export function UnilateralExitPage() {
  const { serverInfo } = useServerInfo();
  const [screen, setScreen] = useState<Screen>('import');
  const [pkg, setPkg] = useState<ExitPackage | null>(null);
  const [esplora, setEsplora] = useState('');

  useEffect(() => {
    document.title = 'Unilateral Exit | Arkade Explorer';
    return () => {
      document.title = 'Arkade Explorer';
    };
  }, []);

  const reset = () => {
    setPkg(null);
    setEsplora('');
    setScreen('import');
  };

  const currentIndex = STEPS.findIndex((s) => s.id === screen);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground">Unilateral Exit</span>
        </div>

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
          {pkg && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </button>
          )}
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

        {screen === 'import' && (
          <ImportScreen
            onImport={(p) => {
              setPkg(p);
              setScreen('review');
            }}
          />
        )}
        {screen === 'review' && pkg && (
          <ReviewScreen
            pkg={pkg}
            network={serverInfo?.network}
            onContinue={(url) => {
              setEsplora(url);
              setScreen('run');
            }}
          />
        )}
        {screen === 'run' && pkg && esplora && (
          <RunScreen pkg={pkg} esploraUrl={esplora} network={serverInfo?.network} />
        )}

        <p className="border-t border-border pt-4 text-[11px] text-muted-foreground">
          Runs entirely in your browser. Package secrets never leave this page except as
          transactions broadcast to your chosen Esplora endpoint.
        </p>
      </div>
    </PageTransition>
  );
}
