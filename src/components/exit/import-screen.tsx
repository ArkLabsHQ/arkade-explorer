import { FileUp, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
    decodePackageBlob,
    packageParamFromUrl,
    readFileText,
    type LoadedPackage,
} from "@/lib/exit/package";
import { Button, Card } from "@/components/exit/ui";
import { cn } from "@/lib/utils";

export function ImportScreen({ onImport }: { onImport: (loaded: LoadedPackage) => void }) {
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState("");
    const [dragging, setDragging] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    async function tryDecode(blob: string) {
        setError(null);
        try {
            onImport(await decodePackageBlob(blob));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }

    // Auto-load from ?pkg= / #pkg= on first mount.
    useEffect(() => {
        const param = packageParamFromUrl(new URL(window.location.href));
        if (param) void tryDecode(param);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col gap-5">
            <Card
                className={cn(
                    "border-dashed p-0 transition-colors",
                    dragging && "border-primary bg-primary/5",
                )}
            >
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={async (e) => {
                        e.preventDefault();
                        setDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (file) await tryDecode(await readFileText(file));
                    }}
                    className="flex flex-col items-center gap-4 py-12 text-center"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
                        <FileUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            Drop your exit package
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            a <span className="font-mono">.json</span> file, or paste it below
                        </p>
                    </div>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json,text/plain"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await tryDecode(await readFileText(file));
                        }}
                    />
                    <Button variant="outline" onClick={() => fileInput.current?.click()}>
                        Choose file
                    </Button>
                </div>
            </Card>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Or paste package / share link
                </label>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    spellCheck={false}
                    placeholder={'{"version":1,…}  or  base64url share blob'}
                    className="w-full resize-y rounded-lg border border-input bg-background p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
                <Button
                    className="self-start"
                    disabled={!text.trim()}
                    onClick={() => tryDecode(text)}
                >
                    Load package
                </Button>
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-medium">Could not read package</p>
                        <p className="mt-0.5 text-xs opacity-90">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
