# Changelog

All notable changes to Arkade Explorer will be documented in this file.

## [1.0.0] - 2025-11-24

### Added
- Initial release of Arkade Explorer
- Transaction explorer for commitment and Arkade transactions
- Address explorer with VTXO list and statistics
- Smart search functionality (auto-detect txid vs address)
- Retro Space Invaders theme with purple, orange, gray, and black colors
- Responsive design with TailwindCSS v4
- React Router for client-side navigation
- TanStack Query for data fetching and caching
- Reusable UI components (Card, Badge, CopyButton, etc.)
- Loading states and error handling
- Copy-to-clipboard functionality
- Transaction hex viewer
- VTXO tree viewer component
- Pagination component
- Tooltip and Tabs components
- Bitcoin transaction decoding utilities
- Input validation and sanitization
- Multiple formatters for amounts, timestamps, and hashes
- Environment variable support for indexer URL
- Hot module replacement (HMR) for development
- Production build optimization
- Deployment configurations for Vercel and Netlify
- Comprehensive documentation (README, DEPLOYMENT, CONTRIBUTING, FEATURES)
- TypeScript support with strict mode
- ESLint configuration
- Custom favicon
- 404 Not Found page

### Technical Details
- React 18.2.0
- TypeScript 5.2.2
- Vite 5.1.0
- TailwindCSS 4.1.17
- React Router 7.9.6
- TanStack Query 5.90.10
- @scure/btc-signer 2.0.1
- @scure/base 2.0.0

### Performance
- Bundle size: 261 KB (gzipped: 82 KB)
- CSS size: 16 KB (gzipped: 4 KB)
- Build time: ~5-6 seconds

### Routes
- `/` - Home page
- `/tx/:txid` - Transaction view (auto-redirects)
- `/commitment-tx/:txid` - Commitment transaction details
- `/address/:address` - Address VTXO list
- `/*` - 404 page

[1.0.0]: https://github.com/arkade-os/arkade-explorer/releases/tag/v1.0.0
