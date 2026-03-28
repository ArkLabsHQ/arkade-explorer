import { EXTERNAL_LINKS } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40" role="contentinfo">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between py-4 gap-2 sm:gap-0 px-4 text-xs text-muted-foreground">
        <span className="text-center sm:text-left">
          Powered by{' '}
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
        </nav>
      </div>
    </footer>
  );
}
