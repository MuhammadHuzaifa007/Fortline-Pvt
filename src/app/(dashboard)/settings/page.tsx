'use client';

import { Suspense, useMemo, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useTheme } from '@/hooks/use-theme';
import { SettingsRail } from '@/components/settings/settings-rail';
import { FortlineCompanyProfile } from '@/components/settings/fortline-company-profile';
import { FortlineSalesMembersSettings } from '@/components/settings/fortline-sales-members-settings';
import { FortlineChannelsSettings } from '@/components/settings/fortline-channels-settings';
import { FortlineKpiSettings } from '@/components/settings/fortline-kpi-settings';
import { FortlineNotificationsSettings } from '@/components/settings/fortline-notifications-settings';
import { FortlineSecurityAudit } from '@/components/settings/fortline-security-audit';
import { TemplateManager } from '@/components/settings/template-manager';
import { AppearancePanel } from '@/components/settings/appearance-panel';
import {
  resolveSection,
  type SettingsSection,
} from '@/components/settings/settings-sections';

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode } = useTheme();

  const section = resolveSection(searchParams.get('tab'));

  const go = (next: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  const hints: Partial<Record<SettingsSection, ReactNode>> = useMemo(
    () => ({
      appearance: mode.charAt(0).toUpperCase() + mode.slice(1),
    }),
    [mode],
  );

  const panel: Record<SettingsSection, ReactNode> = {
    'company-profile': <FortlineCompanyProfile />,
    'sales-members': <FortlineSalesMembersSettings />,
    'whatsapp-channels': <FortlineChannelsSettings />,
    'kpi-config': <FortlineKpiSettings />,
    'notification-rules': <FortlineNotificationsSettings />,
    'security-audit': <FortlineSecurityAudit />,
    templates: <TemplateManager />,
    appearance: <AppearancePanel />,
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Executive Settings & Controls
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage Fortline corporate profile, 30 sales team channels, SLA thresholds, alerts, and audit trail.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <SettingsRail active={section} onSelect={go} hints={hints} />
        <div className="min-w-0">{panel[section]}</div>
      </div>
    </div>
  );
}
