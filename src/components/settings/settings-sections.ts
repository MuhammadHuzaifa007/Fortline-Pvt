import {
  LayoutGrid,
  User,
  Shield,
  Palette,
  Radio,
  FileText,
  Zap,
  Tag,
  DollarSign,
  Users,
  Key,
  type LucideIcon,
} from 'lucide-react';

export const SETTINGS_SECTIONS = [
  'overview',
  'profile',
  'security',
  'appearance',
  'whatsapp',
  'sales-members',
  'templates',
  'quick-replies',
  'fields',
  'deals',
  'members',
  'api',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEFAULT_SECTION: SettingsSection = 'overview';

export interface SectionMeta {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
  group: 'overview' | 'account' | 'workspace';
}

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  overview: {
    id: 'overview',
    label: 'Overview',
    icon: LayoutGrid,
    group: 'overview',
  },
  profile: {
    id: 'profile',
    label: 'Your profile',
    icon: User,
    group: 'account',
  },
  security: {
    id: 'security',
    label: 'Login & security',
    icon: Shield,
    group: 'account',
  },
  appearance: {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    group: 'account',
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: Radio,
    group: 'workspace',
  },
  'sales-members': {
    id: 'sales-members',
    label: 'Sales Roster (30 Reps)',
    icon: Users,
    group: 'workspace',
  },
  templates: {
    id: 'templates',
    label: 'Templates',
    icon: FileText,
    group: 'workspace',
  },
  'quick-replies': {
    id: 'quick-replies',
    label: 'Quick replies',
    icon: Zap,
    group: 'workspace',
  },
  fields: {
    id: 'fields',
    label: 'Fields & tags',
    icon: Tag,
    group: 'workspace',
  },
  deals: {
    id: 'deals',
    label: 'Deals & currency',
    icon: DollarSign,
    group: 'workspace',
  },
  members: {
    id: 'members',
    label: 'Team members',
    icon: Users,
    group: 'workspace',
  },
  api: {
    id: 'api',
    label: 'API keys',
    icon: Key,
    group: 'workspace',
  },
};

export const RAIL_GROUPS: { label: string; group: SectionMeta['group'] }[] = [
  { label: '', group: 'overview' },
  { label: 'ACCOUNT', group: 'account' },
  { label: 'WORKSPACE', group: 'workspace' },
];

function isSection(value: string | null): value is SettingsSection {
  return !!value && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

/**
 * Resolve a raw `?tab=` value to a section.
 */
export function resolveSection(raw: string | null): SettingsSection {
  if (!raw) return DEFAULT_SECTION;
  if (raw === 'company-profile') return 'profile';
  if (raw === 'sales-members') return 'sales-members';
  if (raw === 'whatsapp-channels') return 'whatsapp';
  if (isSection(raw)) return raw;
  return DEFAULT_SECTION;
}
