import { ExitFlow } from "@arkade-os/exit-ui";
import { DoorOpen } from "lucide-react";
import { useEffect } from "react";
import { PageTransition } from "@/components/shared/page-transition";

/**
 * Self-contained, keyless unilateral-exit executor. Imports a pre-signed exit
 * package (from `@arkade-os/sdk`'s `UnilateralExit.prepare()`) and drives it
 * onchain with only an Esplora endpoint. Deliberately NOT linked from the rest
 * of the explorer — reachable directly at /unilateral-exit.
 *
 * The flow itself lives in `@arkade-os/exit-ui`, shared with the standalone
 * tool at arkade-os.github.io/arkade-unilateral-exit so the two cannot drift
 * apart again. This page supplies only what is explorer-specific: the route
 * chrome, the page heading, and the Esplora override from Vite's env. Colours
 * come from the `--color-exit-*` aliases in `globals.css`, which follow the
 * active theme.
 */
export function UnilateralExitPage() {
    useEffect(() => {
        document.title = "Unilateral Exit | Arkade Explorer";
        return () => {
            document.title = "Arkade Explorer";
        };
    }, []);

    return (
        <PageTransition>
            <div className="space-y-6">
                <ExitFlow
                    // Read here rather than in the package, which must not
                    // assume a bundler — the standalone tool passes its own.
                    esploraOverride={import.meta.env.VITE_ESPLORA_URL}
                    header={
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                                <DoorOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-heading text-xl font-bold text-foreground">
                                    Unilateral Exit
                                </h1>
                                <p className="text-[11px] text-muted-foreground">
                                    keyless executor · your funds, onchain, no operator
                                </p>
                            </div>
                        </div>
                    }
                    footer={
                        <p className="border-t border-border pt-4 text-[11px] text-muted-foreground">
                            Runs entirely in your browser. Package secrets never leave this page
                            except as transactions broadcast to your chosen Esplora endpoint.
                        </p>
                    }
                />
            </div>
        </PageTransition>
    );
}
