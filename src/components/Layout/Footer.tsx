declare const __COMMIT_HASH__: string;

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || 'https://arkade.computer';
const COMMIT_HASH = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev';

export function Footer() {
  return (
    <footer className="border-t-2 border-arkade-purple bg-arkade-black py-6 mt-auto">
      <div className="container mx-auto px-4 flex items-center justify-center gap-3">
        <p className="text-arkade-gray text-sm">
          YOU CAN JUST DO THINGS © | POWERED BY ARKADE
        </p>
        <a
          href={INDEXER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono
            bg-arkade-purple/10 border border-arkade-purple/40 text-arkade-gray
            hover:text-arkade-purple hover:border-arkade-purple transition-colors rounded"
        >
          Indexer: {INDEXER_URL.replace(/^https?:\/\//, '')}
        </a>
        <span className="px-2 py-0.5 text-xs font-mono
          bg-arkade-purple/10 border border-arkade-purple/40 text-arkade-gray rounded">
          {COMMIT_HASH}
        </span>
      </div>
    </footer>
  );
}
