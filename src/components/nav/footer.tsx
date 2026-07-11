import { Sun, Moon } from "lucide-react";
import { EXTERNAL_LINKS } from "@/lib/constants";
import { INDEXER_URL } from "@/lib/api/indexer";
import { useTheme } from "@/hooks/use-theme";

export function Footer() {
    const { isDark, setTheme } = useTheme();

    return (
        <footer className="border-t border-border bg-card/40" role="contentinfo">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between py-4 gap-2 sm:gap-0 px-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-3 text-center sm:text-left">
                    <span>
                        Powered by{" "}
                        <a
                            href={EXTERNAL_LINKS.ARKADE}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors duration-200"
                            aria-label="Arkade (opens in new tab)"
                        >
                            Arkade
                        </a>
                    </span>
                    <span className="hidden sm:inline text-border">|</span>
                    <span className="hidden sm:inline">
                        Indexer:{" "}
                        <a
                            href={INDEXER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors duration-200 font-mono"
                        >
                            {INDEXER_URL.replace(/^https?:\/\//, "")}
                        </a>
                    </span>
                </div>
                <nav className="flex items-center gap-4" aria-label="Footer links">
                    <a
                        href={EXTERNAL_LINKS.DOCS}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors duration-200"
                        aria-label="Documentation (opens in new tab)"
                    >
                        Docs
                    </a>
                    <a
                        href={EXTERNAL_LINKS.GITHUB}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors duration-200"
                        aria-label="GitHub repository (opens in new tab)"
                    >
                        GitHub
                    </a>
                    <button
                        onClick={() => setTheme(isDark ? "dawn" : "midnight")}
                        className="hover:text-foreground transition-colors duration-200 p-1 rounded"
                        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? (
                            <Sun className="h-3.5 w-3.5" />
                        ) : (
                            <Moon className="h-3.5 w-3.5" />
                        )}
                    </button>
                </nav>
            </div>
        </footer>
    );
}
