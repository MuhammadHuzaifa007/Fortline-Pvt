'use client';

import { useEffect, useState } from 'react';
import {
  ChevronRight,
  Radio,
  Users,
  FileText,
  DollarSign,
  Tag,
  Palette,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { createClient } from '@/lib/supabase/client';
import { CURRENCIES } from '@/lib/currency';
import type { SettingsSection } from './settings-sections';

interface SettingsOverviewProps {
  onSelect: (section: SettingsSection) => void;
}

export function SettingsOverview({ onSelect }: SettingsOverviewProps) {
  const { user, profile, account, accountRole } = useAuth();
  const { mode } = useTheme();
  const supabase = createClient();

  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [membersCount, setMembersCount] = useState<number>(2);
  const [templatesCount, setTemplatesCount] = useState<number>(11);
  const [tagsCount, setTagsCount] = useState<number>(0);
  const [fieldsCount, setFieldsCount] = useState<number>(0);

  const currencyCode = account?.default_currency || 'PKR';
  const currencyObj = CURRENCIES.find((c) => c.code === currencyCode);
  const currencyLabel = currencyObj?.label || 'Pakistani Rupee';

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Muhammad Huzaifa Zeb';
  const email = user?.email || profile?.email || 'huzaifazaib69@gmail.com';
  const initial = (displayName.trim().charAt(0) || 'M').toUpperCase();
  const roleDisplay = accountRole ? accountRole.charAt(0).toUpperCase() + accountRole.slice(1) : 'Owner';

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        // WhatsApp status
        const { data: wa } = await supabase
          .from('whatsapp_config')
          .select('id, is_active, phone_number_id')
          .limit(1)
          .maybeSingle();

        if (!cancelled && wa) {
          setWhatsappConnected(Boolean(wa.is_active || wa.phone_number_id));
        } else if (!cancelled) {
          setWhatsappConnected(false);
        }

        // Members count
        const { count: mCount } = await supabase
          .from('account_members')
          .select('*', { count: 'exact', head: true });
        if (!cancelled && typeof mCount === 'number' && mCount > 0) {
          setMembersCount(mCount);
        }

        // Templates count
        const { count: tCount } = await supabase
          .from('message_templates')
          .select('*', { count: 'exact', head: true });
        if (!cancelled && typeof tCount === 'number') {
          setTemplatesCount(tCount);
        }

        // Tags & fields count
        const { count: tgCount } = await supabase
          .from('tags')
          .select('*', { count: 'exact', head: true });
        if (!cancelled && typeof tgCount === 'number') {
          setTagsCount(tgCount);
        }

        const { count: fCount } = await supabase
          .from('custom_fields')
          .select('*', { count: 'exact', head: true });
        if (!cancelled && typeof fCount === 'number') {
          setFieldsCount(fCount);
        }
      } catch (err) {
        console.error('Failed to load settings overview stats:', err);
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in-50 duration-200">
      {/* Top User Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl font-bold">
            {initial}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Crown className="size-3.5" />
            <span>{roleDisplay}</span>
          </span>
        </div>
      </div>

      {/* Quick Navigation 2x3 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* WhatsApp */}
        <button
          type="button"
          onClick={() => onSelect('whatsapp')}
          className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Radio className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">WhatsApp</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {whatsappConnected ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span className="text-emerald-500 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-amber-500 inline-block" />
                    <span>Configure API</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Team Members */}
        <button
          type="button"
          onClick={() => onSelect('members')}
          className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Team members</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{membersCount} members</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Templates */}
        <button
          type="button"
          onClick={() => onSelect('templates')}
          className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <FileText className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Templates</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{templatesCount} templates</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Deals & Currency */}
        <button
          type="button"
          onClick={() => onSelect('deals')}
          className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Deals & currency</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currencyCode} — {currencyLabel}
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Fields & Tags */}
        <button
          type="button"
          onClick={() => onSelect('fields')}
          className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Tag className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fields & tags</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tagsCount} tags · {fieldsCount} custom fields
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Appearance */}
        <button
          type="button"
          onClick={() => onSelect('appearance')}
          className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Palette className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode.charAt(0).toUpperCase() + mode.slice(1)} mode · WhatsApp Green accent
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
