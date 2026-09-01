'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bot, Sparkles, Settings2, BarChart3, ShieldCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AiPlayground } from '@/components/agents/ai-playground';
import { AiUsageCard } from '@/components/agents/ai-usage';
import { AiConfig } from '@/components/settings/ai-config';
import { AiHealthPanel } from '@/components/operations/ai-health-panel';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings, canManageOperations } from '@/lib/auth/roles';

type Tab = 'playground' | 'setup' | 'usage' | 'health';

export default function AgentsPage() {
  return (
    <Suspense fallback={null}>
      <AgentsPageInner />
    </Suspense>
  );
}

function AgentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as Tab | null;

  const { accountRole } = useAuth();
  const canViewUsage = accountRole ? canEditSettings(accountRole) : false;
  const canViewHealth = accountRole ? canManageOperations(accountRole) : false;

  const [tab, setTab] = useState<Tab>(urlTab && ['playground', 'setup', 'usage', 'health'].includes(urlTab) ? urlTab : 'playground');
  const [decided, setDecided] = useState(!!urlTab);

  // Land first-time users on Setup, returning users on the Playground if no URL tab is set.
  useEffect(() => {
    if (urlTab) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/config');
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setTab(data?.configured ? 'playground' : 'setup');
      } catch {
        if (!cancelled) setTab('setup');
      } finally {
        if (!cancelled) setDecided(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlTab]);

  const handleTabChange = (next: string) => {
    setTab(next as Tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/agents?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          AI Agents & Advisor
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Live student advisor agent, bring-your-own-key configuration, usage analytics, and automated regression health.
      </p>

      {decided && (
        <Tabs
          value={tab}
          onValueChange={handleTabChange}
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="playground">
              <Sparkles className="mr-1.5 h-4 w-4" /> Playground
            </TabsTrigger>
            <TabsTrigger value="setup">
              <Settings2 className="mr-1.5 h-4 w-4" /> Setup
            </TabsTrigger>
            {canViewUsage && (
              <TabsTrigger value="usage">
                <BarChart3 className="mr-1.5 h-4 w-4" /> Usage
              </TabsTrigger>
            )}
            {canViewHealth && (
              <TabsTrigger value="health">
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Health & Regression
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="playground" className="mt-4">
            <AiPlayground onGoToSetup={() => handleTabChange('setup')} />
          </TabsContent>

          <TabsContent value="setup" className="mt-4">
            <AiConfig />
          </TabsContent>

          {canViewUsage && (
            <TabsContent value="usage" className="mt-4">
              <AiUsageCard />
            </TabsContent>
          )}

          {canViewHealth && (
            <TabsContent value="health" className="mt-4">
              <AiHealthPanel />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
