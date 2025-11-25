/**
 * Application constants
 */

export const APP_NAME = 'Arkade Explorer';
export const APP_VERSION = '1.0.0';

export const COLORS = {
  PURPLE: '#4318FF',
  ORANGE: '#FF3D00',
  GRAY: '#E0E0E0',
  BLACK: '#1A1A1A',
} as const;

export const ROUTES = {
  HOME: '/',
  TRANSACTION: '/tx/:txid',
  COMMITMENT_TX: '/commitment-tx/:txid',
  ADDRESS: '/address/:address',
} as const;

export const EXTERNAL_LINKS = {
  DOCS: 'https://docs.arkadeos.com/',
  GITHUB: 'https://github.com/arkade-os',
  INDEXER: 'https://indexer.arkadeos.com',
} as const;

export const TX_TYPES = {
  COMMITMENT: 'commitment',
  ARKADE: 'arkade',
} as const;

export const VTXO_STATUS = {
  ACTIVE: 'active',
  SPENT: 'spent',
  SWEPT: 'swept',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
