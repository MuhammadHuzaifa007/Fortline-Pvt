import {
  Building2,
  UsersRound,
  PlugZap,
  Sliders,
  BellRing,
  ShieldCheck,
  FileText,
  Palette,
  type LucideIcon,
} from 'lucide-react';

/**
 * Settings information architecture for Fortline-Pvt Executive CRM.
 * Focused entirely on CEO operations, 30-member sales team oversight,
 * multi-channel WhatsApp configuration, and SLA compliance.
 */
export const SETTINGS_SECTIONS = [
  'company-profile',
  'sales-members',
  'whatsapp-channels',
  'kpi-config',
  'notification-rules',
  'security-audit',
  'templates',
  'appearance',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEFAULT_SECTION: SettingsSection = 'company-profile';

export interface SectionMeta {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
  group: 'organization' | 'governance' | 'workspace';
}

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  'company-profile': {
    id: 'company-profile',
    label: 'Company Profile',
    icon: Building2,
    group: 'organization',
  },
  'sales-members': {
    id: 'sales-members',
    label: 'Sales Reps Directory',
    icon: UsersRound,
    group: 'organization',
  },
  'whatsapp-channels': {
    id: 'whatsapp-channels',
    label: 'WhatsApp Channels',
    icon: PlugZap,
    group: 'organization',
  },
  'kpi-config': {
    id: 'kpi-config',
    label: 'KPI & SLA Controls',
    icon: Sliders,
    group: 'governance',
  },
  'notification-rules': {
    id: 'notification-rules',
    label: 'Executive Alerts',
    icon: BellRing,
    group: 'governance',
  },
  'security-audit': {
    id: 'security-audit',
    label: 'Security & Audit Log',
    icon: ShieldCheck,
    group: 'governance',
  },
  templates: {
    id: 'templates',
    label: 'Message Templates',
    icon: FileText,
    group: 'workspace',
  },
  appearance: {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    group: 'workspace',
  },
};

export const RAIL_GROUPS: { label: string; group: SectionMeta['group'] }[] = [
  { label: 'Executive Operations', group: 'organization' },
  { label: 'Compliance & Controls', group: 'governance' },
  { label: 'System & Tools', group: 'workspace' },
];

function isSection(value: string | null): value is SettingsSection {
  return !!value && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

/**
 * Resolve a raw `?tab=` value to a section.
 * Smoothly forwards legacy URLs to the corresponding Fortline executive view.
 */
export function resolveSection(raw: string | null): SettingsSection {
  if (!raw) return DEFAULT_SECTION;
  if (raw === 'overview' || raw === 'profile') return 'company-profile';
  if (raw === 'members') return 'sales-members';
  if (raw === 'whatsapp') return 'whatsapp-channels';
  if (raw === 'kpi' || raw === 'operations') return 'kpi-config';
  if (raw === 'notifications') return 'notification-rules';
  if (raw === 'security' || raw === 'api') return 'security-audit';
  if (isSection(raw)) return raw;
  return DEFAULT_SECTION;
}
