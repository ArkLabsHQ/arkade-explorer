# Arkade Explorer

A modern blockchain explorer for the Arkade Protocol with a retro Space Invaders theme.

## Features

- **Transaction Views**: Browse commitment and Arkade transactions
- **Address Explorer**: View all VTXOs associated with an address or script
- **Real-time Data**: Powered by the Arkade Indexer API
- **Retro UI**: Space Invaders-inspired design with purple, orange, and black color scheme
- **Responsive**: Built with TailwindCSS for mobile and desktop

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and HMR
- **React Router** for navigation
- **TanStack Query** for data fetching and caching
- **TailwindCSS** for styling
- **Lucide React** for icons
- **Arkade TS SDK** for API integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file (or use `.env.example`):

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173` with hot reload enabled.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Address/        # Address-specific components
│   ├── Layout/         # Layout components (Header, Footer)
│   ├── Transaction/    # Transaction display components
│   └── UI/            # Reusable UI components
├── lib/
│   ├── api/           # API client configuration
│   └── utils.ts       # Utility functions
├── pages/             # Page components
│   ├── HomePage.tsx
│   ├── TransactionPage.tsx
│   ├── CommitmentTxPage.tsx
│   └── AddressPage.tsx
└── App.tsx            # Main app with routing
```

## Routes

- `/` - Home page with search
- `/tx/:txid` - Transaction view (auto-redirects to commitment-tx if applicable)
- `/commitment-tx/:txid` - Commitment transaction details
- `/address/:address` - Address/script VTXO list

## Learn More

- [Arkade Protocol Documentation](https://docs.arkadeos.com/)
- [Arkade GitHub](https://github.com/arkade-os)

## License

MIT
