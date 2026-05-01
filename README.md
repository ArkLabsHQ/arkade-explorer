# Arkade Explorer

A modern blockchain explorer for the Ark protocol, built with React and TypeScript.

## Features

- **Transaction Views**: Browse virtual and commitment transactions with decoded inputs/outputs
- **Address Explorer**: View VTXOs, balances, and assets associated with an Arkade address
- **Asset Browser**: Inspect individual asset details and metadata
- **Batch & Tree Visualization**: Explore batched VTXOs and connector trees
- **Real-time Activity**: Live stream of recent Arkade transactions
- **Theming**: Light (Dawn) and Dark (Midnight) themes
- **Responsive**: Fully responsive layout for mobile and desktop

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and builds
- **React Router** for client-side routing
- **TanStack Query** for data fetching and caching
- **Tailwind CSS v4** for styling
- **Radix UI** primitives (dialog, select)
- **Lucide React** for icons
- **@arkade-os/sdk** for Ark indexer API integration
- **@scure/btc-signer** for transaction decoding

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or pnpm)

### Installation

```bash
pnpm install
```

### Configuration

Copy `.env.example` to `.env` and adjust as needed:

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json
```

### Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `VITE_INDEXER_URL` | Ark indexer API URL | No | `https://arkade.computer` |
| `VITE_ARK_URL` | Ark server URL (falls back to indexer URL) | No | same as `VITE_INDEXER_URL` |
| `VITE_ARKADE_URL` | Arkade website link | No | `https://arkade.money` |
| `VITE_VERIFIED_ASSETS_URL` | URL to fetch verified asset IDs (JSON array). When set, only verified or user-approved assets show icons. | No | — |

### Development

```bash
pnpm dev
```

The app will be available at `http://localhost:5173` with hot reload.

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

### Docker

Run the pre-built image from GHCR:

```bash
docker run -p 8080:80 ghcr.io/arklabshq/arkade-explorer:latest
```

The app will be available at `http://localhost:8080`.

To build locally:

```bash
docker build -t arkade-explorer .
docker run -p 8080:80 arkade-explorer
```

## Project Structure

```
src/
├── components/
│   ├── nav/               # Top nav bar and footer
│   ├── shared/            # Reusable components (search, badges, lists, etc.)
│   └── dynamic-layout.tsx # Layout wrapper with nav + footer
├── hooks/                 # Custom React hooks
├── lib/
│   ├── api/               # Indexer API client
│   ├── arkAddress.ts      # Arkade address construction from scripts
│   ├── decode.ts          # Transaction decoding utilities
│   ├── formatters.ts      # Number/date formatting
│   └── utils.ts           # General utilities
├── pages/
│   ├── home.tsx           # Home page with search + activity stream
│   ├── tx.tsx             # Virtual transaction detail
│   ├── commitment-tx.tsx  # Commitment (on-chain) transaction detail
│   ├── address.tsx        # Address VTXOs and balances
│   └── asset.tsx          # Asset detail page
├── providers/             # React context providers
├── themes/                # Dawn (light) and Midnight (dark) CSS themes
└── App.tsx                # Route definitions
```

## Routes

| Path | Description |
|---|---|
| `/` | Home — search and recent activity |
| `/tx/:txid` | Virtual transaction detail |
| `/commitment-tx/:txid` | Commitment transaction detail |
| `/address/:address` | Address VTXOs, balances, and assets |
| `/asset/:assetId` | Asset detail |

## License

MIT
