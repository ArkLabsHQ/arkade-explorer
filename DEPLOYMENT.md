# Deployment Guide

## Environment Variables

Before deploying, ensure you have set up the following environment variable:

```env
VITE_INDEXER_URL=https://indexer.arkadeos.com
```

## Build for Production

```bash
npm run build
```

This will create an optimized production build in the `dist` directory.

## Preview Production Build Locally

```bash
npm run preview
```

## Deployment Options

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### Static Hosting (GitHub Pages, etc.)

1. Build the project: `npm run build`
2. Upload the contents of the `dist` directory to your hosting provider

## Environment-Specific Configuration

For different environments, create separate `.env` files:

- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.staging` - Staging environment

Vite will automatically load the correct file based on the mode.
