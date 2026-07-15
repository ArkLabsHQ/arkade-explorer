# Contributing to Arkade Explorer

Thank you for your interest in contributing to Arkade Explorer!

## Prerequisites

- **Node.js 24.15.0** (see `.nvmrc`; e.g. `nvm use`)
- **pnpm** — this project is **pnpm-only** (pinned to `pnpm@10.29.2`). Do not use `npm` or `yarn`.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd arkade-explorer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Address/     # Address-specific components
│   ├── Home/        # Home page components
│   ├── Layout/      # Layout components
│   ├── Transaction/ # Transaction components
│   ├── UI/          # Generic UI components
│   └── NotFound/    # 404 page
├── hooks/           # Custom React hooks
├── lib/             # Utilities and API clients
│   ├── api/         # API client implementations
│   └── utils.ts     # Helper functions
├── pages/           # Page components (routes)
└── App.tsx          # Main application component
```

## Code Style

- Use TypeScript for all new files
- Follow existing naming conventions
- Use functional components with hooks
- Keep components small and focused
- Write descriptive variable and function names
- **Formatting is enforced by Prettier** (double quotes, 4-space indent, 100-char width). Run
  `pnpm run format` before committing; `pnpm run lint` (`prettier --check .`) must pass. There is no
  ESLint.

## Component Guidelines

1. **Reusable Components**: Place in `src/components/UI/`
2. **Feature Components**: Place in feature-specific folders
3. **Page Components**: Place in `src/pages/`
4. **Export Pattern**: Use named exports for components

## Styling

- Use TailwindCSS utility classes
- Follow the retro Space Invaders theme
- Use custom color palette defined in `tailwind.config.js`
- Avoid inline styles when possible

## Testing

Before submitting a PR:

1. Ensure the app builds without errors: `pnpm build`
2. Check formatting: `pnpm run lint` (and `pnpm run format` to fix)
3. Check for TypeScript errors: `pnpm run typecheck`
4. Run unit tests: `pnpm test`
5. Test your changes in the browser

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request with a clear description
5. Wait for review

## Questions?

Feel free to open an issue for any questions or concerns.
