import Link from "next/link";
import {
  ShieldCheck,
  Server,
  Laptop,
  Cpu,
  Database,
  Headphones,
  UsersRound,
  ArrowRight,
  BarChart3,
  Clock,
  Radio,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070d0c] text-foreground font-sans antialiased selection:bg-emerald-500/30 selection:text-white relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-b from-emerald-600/15 via-teal-500/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[45%] right-[-10%] w-[600px] h-[600px] bg-emerald-700/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] bg-teal-600/10 blur-[160px] rounded-full" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070d0c]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-base shadow-md shadow-emerald-500/20">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                Fortline-Pvt <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Executive CRM</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium leading-none">
                Enterprise IT Infrastructure Sales Operations
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/5 text-xs font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 rounded-lg px-4 h-9 transition-all">
                Open Command Center <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-gray-200">
            Dedicated CEO Command Center
          </span>
          <span className="text-xs text-emerald-400 font-bold">• 30 Sales Reps Monitored</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Real-Time WhatsApp Oversight for <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Enterprise IT Sales</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Centralized executive monitoring for Fortline Pvt Ltd. Track 30 sales representatives across 5 corporate divisions, measure first-response SLAs, manage WhatsApp Cloud API channels, and detect client communication bottlenecks in real time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition-all">
              Launch Executive Dashboard <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-6 text-sm font-medium text-gray-200 border-white/15 bg-white/5 hover:bg-white/10 rounded-lg">
              CEO Sign In
            </Button>
          </Link>
        </div>

        {/* 4 Pillars Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto pt-8 border-t border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <UsersRound className="h-4 w-4" /> 30 Sales Reps
            </div>
            <p className="text-xs text-gray-400">Isolated channels with live presence & metrics</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Clock className="h-4 w-4" /> SLA Governance
            </div>
            <p className="text-xs text-gray-400">Response time tracking & breach alerts</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Radio className="h-4 w-4" /> Direct Meta API
            </div>
            <p className="text-xs text-gray-400">Direct WhatsApp Cloud API integration</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Lock className="h-4 w-4" /> CEO-Only Portal
            </div>
            <p className="text-xs text-gray-400">Single-seat executive oversight</p>
          </div>
        </div>
      </section>

      {/* 5 Enterprise Divisions Section */}
      <section className="py-16 bg-[#091110] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Fortline Business Units</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Operational Oversight Across 5 Enterprise Divisions
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">
              Each division operates dedicated WhatsApp business numbers with assigned sales engineers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Enterprise Servers</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Rackmount, blade servers, high-density computing clusters & enterprise storage systems.
              </p>
              <div className="text-[11px] font-semibold text-emerald-400">6 Sales Engineers</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Laptop className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Laptops & Fleet</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Corporate PC procurement, workstation deployments, and enterprise fleet leasing.
              </p>
              <div className="text-[11px] font-semibold text-emerald-400">6 Sales Specialists</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Hardware & Components</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                OEM parts, memory modules, GPUs, network interface cards, and high-speed switches.
              </p>
              <div className="text-[11px] font-semibold text-emerald-400">6 Component Reps</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Data Center Services</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Colocation engineering, power management, thermal cooling, and infrastructure planning.
              </p>
              <div className="text-[11px] font-semibold text-emerald-400">6 Data Center Engineers</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Headphones className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">IT Managed Services</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                SLA-driven maintenance contracts, 24/7 network monitoring, and enterprise warranty handling.
              </p>
              <div className="text-[11px] font-semibold text-emerald-400">6 Support Executives</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Fortline Pvt Ltd. All rights reserved. Confidential Executive System.</p>
      </footer>
    </div>
  );
}
