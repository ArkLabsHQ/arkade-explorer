import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { EXTERNAL_LINKS } from "@/lib/constants";
import { ArkadeLogo } from "@/components/shared/arkade-logo";
import { SearchCommandPaletteOverlay } from "@/components/shared/search-bar";
export function TopNav() {
    const [isMac, setIsMac] = useState(true);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    useEffect(() => {
        setIsMac(navigator.platform?.toLowerCase().includes("mac") ?? true);
    }, []);

    // Cmd+K opens command palette on all screen sizes
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <header
            className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm"
            role="banner"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4">
                <Link to="/" className="shrink-0" aria-label="Arkade Explorer home">
                    <ArkadeLogo size="md" />
                </Link>

                {/* Mobile search icon */}
                <button
                    onClick={() => setCommandPaletteOpen(true)}
                    className="sm:hidden p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
                    aria-label="Open search"
                >
                    <Search className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Mobile command palette overlay */}
                <SearchCommandPaletteOverlay
                    open={commandPaletteOpen}
                    onOpenChange={setCommandPaletteOpen}
                />

                <button
                    onClick={() => setCommandPaletteOpen(true)}
                    className="hidden sm:flex items-center flex-1 max-w-lg mx-6 h-9 px-3 rounded-lg bg-secondary border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors duration-200 cursor-text"
                    aria-label="Open search (Cmd+K)"
                >
                    <Search className="h-4 w-4 shrink-0 mr-2" aria-hidden="true" />
                    <span className="flex-1 text-left">Search txid, address, or outpoint...</span>
                    <kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {isMac ? "\u2318" : "Ctrl+"}K
                    </kbd>
                </button>

                <div className="flex items-center gap-3 shrink-0">
                    <a
                        href={EXTERNAL_LINKS.ARKADE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors duration-200 active:scale-[0.97]"
                        aria-label="Try Arkade (opens in new tab)"
                    >
                        Try Arkade
                    </a>
                </div>
            </div>
        </header>
    );
}
