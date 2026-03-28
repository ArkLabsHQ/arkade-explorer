export const APP_NAME = 'Arkade Explorer';

export const EXTERNAL_LINKS = {
  DOCS: 'https://docs.arkadeos.com/',
  GITHUB: 'https://github.com/arkade-os',
  ARKADE: import.meta.env.VITE_ARKADE_URL || 'https://arkade.money',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
