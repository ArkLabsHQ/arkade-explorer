# Contributing to Arkade Explorer

Thank you for your interest in contributing to Arkade Explorer!

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd arkade-explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   npm run dev
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

1. Ensure the app builds without errors: `npm run build`
2. Check for TypeScript errors: `npm run lint`
3. Test your changes in the browser

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request with a clear description
5. Wait for review

## Questions?

Feel free to open an issue for any questions or concerns.
