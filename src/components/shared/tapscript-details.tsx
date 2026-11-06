import { ChevronRight } from "lucide-react";
import type { ScriptView, SpendPath } from "@/lib/arkadeScript";
import { CopyButton } from "@/components/shared/copy-button";

function ScriptOpcodes({ caption, script }: { caption: string; script: ScriptView }) {
    return (
        <div className="min-w-0 space-y-2 rounded-lg bg-secondary/35 p-3">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">{caption}</span>
                <CopyButton text={script.scriptHex} />
            </div>
            <div className="flex max-h-64 flex-wrap gap-x-2 gap-y-1 overflow-y-auto font-mono text-xs leading-relaxed">
                {script.asm.length === 0 ? (
                    <code className="break-all text-muted-foreground">{script.scriptHex}</code>
                ) : (
                    script.asm.map((op, index) => (
                        <span
                            key={index}
                            className={`break-all ${op.startsWith("OP_") ? "text-foreground" : "text-muted-foreground"}`}
                        >
                            {op}
                        </span>
                    ))
                )}
            </div>
            {script.asm.length > 0 && (
                <details className="text-xs text-muted-foreground">
                    <summary className="w-fit cursor-pointer py-1 hover:text-foreground">
                        Raw hex
                    </summary>
                    <code className="mt-2 block max-h-40 overflow-y-auto break-all font-mono leading-relaxed">
                        {script.scriptHex}
                    </code>
                </details>
            )}
        </div>
    );
}

export function TapscriptDetails({ spendPath }: { spendPath: SpendPath }) {
    if (spendPath.kind !== "script-path") {
        return (
            <p className="mt-3 text-xs text-muted-foreground">
                {spendPath.kind === "key-path" ? "Key-path signature" : "Tapscript unavailable"}
            </p>
        );
    }

    return (
        <details className="group mt-3 min-w-0 border-t border-border pt-2">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded py-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                />
                <span>Tapscripts</span>
                <span className="tabular-nums">({spendPath.scripts.length})</span>
            </summary>
            <div className="mt-2 space-y-3">
                {spendPath.scripts.map((script, index) => (
                    <div key={`${script.scriptHex}-${index}`} className="min-w-0 space-y-2">
                        <ScriptOpcodes
                            caption={
                                spendPath.scripts.length > 1
                                    ? `Tapscript ${index + 1}`
                                    : "Tapscript"
                            }
                            script={script}
                        />
                        {script.arkadeScript && (
                            <ScriptOpcodes
                                caption="Bound Arkade Script"
                                script={script.arkadeScript}
                            />
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
}
