"use client"

import { useState, useEffect } from 'react'
import { Building2, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CompanyProfileData {
  company_name: string
  legal_name: string
  business_type: string
  headquarters_address: string
  contact_email: string
  contact_phone: string
  timezone: string
  default_currency: string
}

export function FortlineCompanyProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<CompanyProfileData>({
    company_name: 'Fortline-Pvt',
    legal_name: 'Fortline Pvt Ltd',
    business_type: 'Enterprise IT Infrastructure & Hardware Solutions',
    headquarters_address: 'Main Executive Tower, Technology Park',
    contact_email: 'ceo@fortline.net',
    contact_phone: '+92 300 1234567',
    timezone: 'Asia/Karachi',
    default_currency: 'PKR',
  })

  useEffect(() => {
    // In production, loads from fortline_company_profile or auth account
    setLoading(false)
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Simulate/post save
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success('Company profile updated successfully')
    } catch {
      toast.error('Failed to update company profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2.5 pb-4 border-b border-border">
        <span className="p-2 rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Fortline Corporate Profile
          </h2>
          <p className="text-xs text-muted-foreground">
            Corporate identification, IT infrastructure divisions, and executive headquarters settings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Brand Name</Label>
            <Input
              value={profile.company_name}
              onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Legal Entity Name</Label>
            <Input
              value={profile.legal_name}
              onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
              className="bg-muted border-border"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Primary Business Domain</Label>
          <Input
            value={profile.business_type}
            onChange={(e) => setProfile({ ...profile, business_type: e.target.value })}
            className="bg-muted border-border"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Headquarters Address</Label>
          <Input
            value={profile.headquarters_address}
            onChange={(e) => setProfile({ ...profile, headquarters_address: e.target.value })}
            className="bg-muted border-border"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CEO / Executive Email</Label>
            <Input
              type="email"
              value={profile.contact_email}
              onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Headquarters Phone</Label>
            <Input
              value={profile.contact_phone}
              onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
              className="bg-muted border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Operating Timezone</Label>
            <Input
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Operational Currency</Label>
            <Input
              value={profile.default_currency}
              onChange={(e) => setProfile({ ...profile, default_currency: e.target.value })}
              className="bg-muted border-border"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>Save Company Profile</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
