export const STRUCTURE_NAMES = [
  'classic', 'blocks-horizon', 'explorer', 'sidebar',
  'blocks-split', 'blocks-tabs', 'blocks-timeline',
  'terminal', 'kanban', 'treemap',
] as const;

export type StructureName = typeof STRUCTURE_NAMES[number];

export type ListStyle = 'table' | 'cards' | 'dense-rows';
export type StatVariant = 'grid' | 'inline-row' | 'sidebar-compact' | 'minimal';
export type NavVariant = 'top' | 'sidebar' | 'minimal' | 'hidden';
export type SearchVariant = 'header' | 'hero' | 'sidebar' | 'command-palette';
export type DetailLayout = 'full-width' | 'centered' | 'split-pane';
export type ActivityVariant = 'feed' | 'compact-list' | 'ticker' | 'hidden';

export interface StructurePreferences {
  listStyle: ListStyle;
  statVariant: StatVariant;
  navVariant: NavVariant;
  searchVariant: SearchVariant;
  detailLayout: DetailLayout;
  activityVariant: ActivityVariant;
  maxWidth: string | null;
  contentPadding: string;
}

export interface StructureDefinition {
  name: StructureName;
  label: string;
  description: string;
  preferences: StructurePreferences;
}

export const STRUCTURES: Record<StructureName, StructureDefinition> = {
  classic: {
    name: 'classic',
    label: 'Classic',
    description: 'Top nav, centered content, standard flow',
    preferences: {
      listStyle: 'table',
      statVariant: 'grid',
      navVariant: 'top',
      searchVariant: 'header',
      detailLayout: 'centered',
      activityVariant: 'feed',
      maxWidth: 'max-w-6xl',
      contentPadding: 'px-4 py-8',
    },
  },
  'blocks-horizon': {
    name: 'blocks-horizon',
    label: 'Blocks horizon',
    description: 'Commitment TXs as visual blocks with batch mosaics',
    preferences: {
      listStyle: 'cards',
      statVariant: 'minimal',
      navVariant: 'minimal',
      searchVariant: 'header',
      detailLayout: 'full-width',
      activityVariant: 'hidden',
      maxWidth: null,
      contentPadding: 'px-4 py-6',
    },
  },
  explorer: {
    name: 'explorer',
    label: 'Explorer',
    description: 'Interactive tree navigator for batches and VTXOs',
    preferences: {
      listStyle: 'cards',
      statVariant: 'grid',
      navVariant: 'minimal',
      searchVariant: 'hero',
      detailLayout: 'full-width',
      activityVariant: 'hidden',
      maxWidth: 'max-w-7xl',
      contentPadding: 'px-4 py-8',
    },
  },
  sidebar: {
    name: 'sidebar',
    label: 'Sidebar',
    description: 'Fixed left sidebar, content right',
    preferences: {
      listStyle: 'table',
      statVariant: 'sidebar-compact',
      navVariant: 'sidebar',
      searchVariant: 'sidebar',
      detailLayout: 'full-width',
      activityVariant: 'compact-list',
      maxWidth: null,
      contentPadding: 'p-6',
    },
  },
  'blocks-split': {
    name: 'blocks-split',
    label: 'Blocks split',
    description: 'Mempool.space-style split: virtual mempool above, settled blocks below',
    preferences: {
      listStyle: 'cards',
      statVariant: 'minimal',
      navVariant: 'minimal',
      searchVariant: 'header',
      detailLayout: 'centered',
      activityVariant: 'hidden',
      maxWidth: null,
      contentPadding: 'px-0 py-0',
    },
  },
  'blocks-tabs': {
    name: 'blocks-tabs',
    label: 'Blocks tabs',
    description: 'Tabbed view switching between settled blocks grid and virtual mempool',
    preferences: {
      listStyle: 'cards',
      statVariant: 'minimal',
      navVariant: 'minimal',
      searchVariant: 'header',
      detailLayout: 'centered',
      activityVariant: 'hidden',
      maxWidth: 'max-w-6xl',
      contentPadding: 'px-4 py-6',
    },
  },
  'blocks-timeline': {
    name: 'blocks-timeline',
    label: 'Blocks timeline',
    description: 'Vertical timeline with pending items at top and settled milestones below',
    preferences: {
      listStyle: 'cards',
      statVariant: 'minimal',
      navVariant: 'minimal',
      searchVariant: 'header',
      detailLayout: 'centered',
      activityVariant: 'hidden',
      maxWidth: 'max-w-3xl',
      contentPadding: 'px-4 py-6',
    },
  },
  terminal: {
    name: 'terminal',
    label: 'Terminal',
    description: 'Command-line aesthetic with real-time event stream',
    preferences: {
      listStyle: 'dense-rows',
      statVariant: 'minimal',
      navVariant: 'hidden',
      searchVariant: 'header',
      detailLayout: 'centered',
      activityVariant: 'hidden',
      maxWidth: 'max-w-5xl',
      contentPadding: 'px-4 py-6',
    },
  },
  kanban: {
    name: 'kanban',
    label: 'Kanban',
    description: 'VTXO lifecycle board with columns for each state',
    preferences: {
      listStyle: 'cards',
      statVariant: 'minimal',
      navVariant: 'minimal',
      searchVariant: 'header',
      detailLayout: 'centered',
      activityVariant: 'hidden',
      maxWidth: null,
      contentPadding: 'px-4 py-6',
    },
  },
  treemap: {
    name: 'treemap',
    label: 'Treemap',
    description: 'Proportional rectangles showing commitment TX sizes',
    preferences: {
      listStyle: 'cards',
      statVariant: 'minimal',
      navVariant: 'minimal',
      searchVariant: 'header',
      detailLayout: 'centered',
      activityVariant: 'hidden',
      maxWidth: null,
      contentPadding: 'px-4 py-6',
    },
  },
};
