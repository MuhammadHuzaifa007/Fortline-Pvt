"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Bot,
  Zap,
  Kanban,
  PhoneCall,
  Radio,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Users,
  Lock,
  Check,
  X,
  Menu,
  Plus,
  Paperclip,
  Camera,
  Mic,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Send,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
} from "lucide-react";
import { WhatsAppBadgeLogo, WhatsAppPhoneIcon } from "@/components/icons/whatsapp-business-logo";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Live Demo Player States
  const [demoView, setDemoView] = useState<"video" | "interactive">("video");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
        setVideoPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setVideoPlaying(true);
      }
    } else {
      setVideoPlaying(!videoPlaying);
    }
  };

  const whatsappDirectUrl = "https://wa.me/923309998880?text=Hello%20iTechSkill%20Team,%20I%20am%20interested%20in%20iTechSkill%20WhatsApp%20CRM";

  return (
    <div className="min-h-screen bg-[#070d0c] text-foreground selection:bg-[#008069]/30 selection:text-white font-sans antialiased relative">
      {/* Ambient background glow accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#008069]/20 via-[#25D366]/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[#008069]/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#25D366]/10 blur-[160px] rounded-full" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. STICKY NAVBAR */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070d0c]/80 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <WhatsAppBadgeLogo className="h-9 w-9 shadow-lg shadow-[#008069]/25 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                iTechSkill <span className="text-[#25D366] text-xs font-semibold px-1.5 py-0.5 rounded bg-[#25D366]/10 border border-[#25D366]/20">CRM</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium leading-none">
                WhatsApp Business Cloud API
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#live-demo" className="hover:text-white transition-colors flex items-center gap-1.5 text-[#25D366]">
              <Film className="h-3.5 w-3.5" /> Video Demo
            </a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#ai-agent" className="hover:text-white transition-colors flex items-center gap-1">
              AI Agent <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" />
            </a>
            <a href="#pipeline" className="hover:text-white transition-colors">Pipelines</a>
            <a href="#broadcasts" className="hover:text-white transition-colors">Broadcasts</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-[#008069] hover:bg-[#006d59] text-white text-sm font-semibold shadow-md shadow-[#008069]/30 rounded-full px-5 h-9 transition-all hover:scale-105">
                Get Started Free <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#0c1615] px-4 pt-3 pb-6 space-y-3">
            <a href="#live-demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[#25D366] hover:text-white font-medium">Video Demo</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white font-medium">Features</a>
            <a href="#ai-agent" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white font-medium">AI Agent</a>
            <a href="#pipeline" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white font-medium">Pipelines</a>
            <a href="#broadcasts" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white font-medium">Broadcasts</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white font-medium">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-300 hover:text-white font-medium">FAQ</a>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full justify-center text-white border-white/10 bg-white/5">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup" className="w-full">
                <Button className="w-full justify-center bg-[#008069] text-white">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION */}
      {/* ------------------------------------------------------------- */}
      <section className="relative z-10 pt-16 pb-16 md:pt-24 md:pb-20 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-inner animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-[#25D366] animate-ping" />
          <span className="text-xs font-semibold text-gray-200">
            Next-Gen WhatsApp Cloud API & AI CRM for Businesses
          </span>
          <span className="text-xs text-[#25D366] font-bold">Official Meta API</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Convert <span className="bg-gradient-to-r from-[#25D366] via-[#00a884] to-[#008069] bg-clip-text text-transparent">10x More Leads</span> on WhatsApp with AI
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          iTechSkill WhatsApp CRM empowers your sales & support team with a <strong className="text-gray-200 font-semibold">Shared Team Inbox</strong>, <strong className="text-gray-200 font-semibold">24/7 AI Smart Auto-Replies</strong>, <strong className="text-gray-200 font-semibold">Official Meta Broadcasts</strong>, <strong className="text-gray-200 font-semibold">Kanban Pipelines</strong>, and <strong className="text-gray-200 font-semibold">Team Call Analytics</strong>.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-13 px-8 text-base font-bold bg-[#008069] hover:bg-[#006d59] text-white rounded-full shadow-lg shadow-[#008069]/30 transition-all hover:scale-105 active:scale-95">
              Launch Free Trial <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <a href="#live-demo" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-13 px-7 text-base font-medium text-gray-200 border-white/15 bg-white/5 hover:bg-white/10 hover:text-white rounded-full transition-all flex items-center justify-center gap-2">
              <Play className="h-4 w-4 fill-current text-[#25D366]" /> Watch Demo Video
            </Button>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto pt-6 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#25D366] shrink-0" />
            <span className="text-xs text-gray-300 font-medium">Meta Cloud API Verified</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Zap className="h-5 w-5 text-[#25D366] shrink-0" />
            <span className="text-xs text-gray-300 font-medium">Instant 24/7 AI Auto-Reply</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-[#25D366] shrink-0" />
            <span className="text-xs text-gray-300 font-medium">Zero Ban Risk Guarantee</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-[#25D366] shrink-0" />
            <span className="text-xs text-gray-300 font-medium">Unlimited Multi-Agent Inbox</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. LIVE DEMO VIDEO & INTERACTIVE SHOWCASE */}
      {/* ------------------------------------------------------------- */}
      <section id="live-demo" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Section Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-[#25D366] flex items-center justify-center sm:justify-start gap-1.5">
              <Film className="h-4 w-4" /> Live Product Showcase
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              See iTechSkill WhatsApp CRM in Action
            </h2>
          </div>

          {/* Video / Interactive Switcher Tabs */}
          <div className="inline-flex items-center p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setDemoView("video")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                demoView === "video"
                  ? "bg-[#008069] text-white shadow-md shadow-[#008069]/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Watch Video Walkthrough
            </button>
            <button
              type="button"
              onClick={() => setDemoView("interactive")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                demoView === "interactive"
                  ? "bg-[#008069] text-white shadow-md shadow-[#008069]/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Interactive Simulation
            </button>
          </div>
        </div>

        {/* Video Showcase Card */}
        {demoView === "video" ? (
          <div className="relative rounded-2xl md:rounded-3xl border border-white/10 bg-[#0d1615]/95 shadow-2xl shadow-[#008069]/25 backdrop-blur-2xl overflow-hidden group">
            {/* Titlebar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a1110] border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="text-xs font-semibold text-gray-300 ml-2">iTechSkill WhatsApp CRM — Full Product Demo Walkthrough</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#008069] text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> 4K 60FPS
                </span>
              </div>
            </div>

            {/* Video Player Container */}
            <div className="relative aspect-video w-full bg-[#050a09] flex items-center justify-center overflow-hidden">
              {/* Optional HTML5 Video (Auto-loop fallback or user upload) */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                loop
                muted={videoMuted}
                playsInline
                poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
              >
                {/* Fallback sample MP4 video / users can replace with their demo video */}
                <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
              </video>

              {/* Video Overlay / Big Centered Play Button */}
              {!videoPlaying && (
                <div className="absolute inset-0 bg-[#070d0c]/70 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 transition-opacity">
                  {/* Glowing Play Button */}
                  <button
                    type="button"
                    onClick={toggleVideoPlay}
                    aria-label="Play Walkthrough Video"
                    className="relative group/play flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[#25D366] text-[#070d0c] shadow-2xl shadow-[#25D366]/50 transition-all hover:scale-110 active:scale-95 mb-5 cursor-pointer"
                  >
                    <span className="absolute -inset-2 rounded-full bg-[#25D366]/30 animate-ping pointer-events-none" />
                    <Play className="h-9 w-9 sm:h-10 sm:w-10 fill-current ml-1 text-[#070d0c]" />
                  </button>

                  <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                    Watch the 2-Minute iTechSkill CRM Walkthrough
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 max-w-lg mb-4">
                    Learn how to connect Meta Cloud API, deploy 24/7 AI bots, send broadcast campaigns, and assign team chats.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVideoModalOpen(true)}
                      className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-colors flex items-center gap-1.5"
                    >
                      <Maximize2 className="h-3.5 w-3.5" /> Fullscreen Theater Mode
                    </button>
                    <a
                      href="https://www.youtube.com/@itechskill-6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-1.5 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold border border-red-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <Film className="h-3.5 w-3.5" /> Watch on YouTube Channel
                    </a>
                  </div>
                </div>
              )}

              {/* Bottom Custom Video Controls Bar */}
              <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleVideoPlay}
                    className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {videoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !videoMuted;
                      }
                      setVideoMuted(!videoMuted);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {videoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <span className="text-[11px] text-gray-300 font-mono">01:24 / 02:45</span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 mx-4 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                  <div className="h-full bg-[#25D366] rounded-full w-[45%]" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVideoModalOpen(true)}
                    className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Video Chapters / Feature Highlights Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10 bg-[#091110] text-left text-xs p-3">
              <div className="px-3 py-1">
                <span className="text-[10px] text-[#25D366] font-bold">0:00 - 0:35</span>
                <p className="font-semibold text-gray-200 truncate">Meta API 2-Min Setup</p>
              </div>
              <div className="px-3 py-1">
                <span className="text-[10px] text-[#25D366] font-bold">0:35 - 1:15</span>
                <p className="font-semibold text-gray-200 truncate">24/7 AI Knowledge Base</p>
              </div>
              <div className="px-3 py-1">
                <span className="text-[10px] text-[#25D366] font-bold">1:15 - 1:55</span>
                <p className="font-semibold text-gray-200 truncate">Multi-Agent Team Inbox</p>
              </div>
              <div className="px-3 py-1">
                <span className="text-[10px] text-[#25D366] font-bold">1:55 - 2:45</span>
                <p className="font-semibold text-gray-200 truncate">50,000 Bulk Broadcasts</p>
              </div>
            </div>
          </div>
        ) : (
          /* Interactive Chat Simulation (Matching Screenshot 3) */
          <div className="relative rounded-2xl md:rounded-3xl border border-white/10 bg-[#0d1615]/90 shadow-2xl shadow-[#008069]/20 backdrop-blur-2xl overflow-hidden">
            {/* Titlebar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a1110] border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="text-xs font-semibold text-gray-400 ml-2">iTechSkill WhatsApp CRM — Team Live Console</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#008069] text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> AI Agent: ACTIVE
                </span>
              </div>
            </div>

            {/* CRM Mock Interface Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
              {/* Left Column: Mock Conversation List */}
              <div className="md:col-span-4 border-r border-white/10 bg-[#091110]/80 p-3 space-y-2 hidden md:block">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 flex justify-between">
                  <span>Active Chats</span>
                  <span className="text-[#25D366]">3 Unassigned</span>
                </div>
                
                {/* Active Item */}
                <div className="p-2.5 rounded-xl bg-white/10 border border-[#25D366]/30 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                      Muhammad Huzaifa <span className="h-2 w-2 rounded-full bg-[#25D366]" />
                    </span>
                    <span className="text-[10px] text-[#25D366] font-medium">Just now</span>
                  </div>
                  <p className="text-xs text-gray-300 truncate mt-1">
                    Hi, I need WhatsApp API integration for my enterprise store...
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">Enterprise Deal</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Pipeline: Proposal</span>
                  </div>
                </div>

                {/* Other Items */}
                <div className="p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer opacity-75">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200">Sarah Jenkins (CEO)</span>
                    <span className="text-[10px] text-gray-400">12m</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-1">Payment receipt confirmed for annual plan.</p>
                </div>

                <div className="p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer opacity-75">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200">Apex Retail Group</span>
                    <span className="text-[10px] text-gray-400">1h</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-1">Broadcast campaign delivered to 12,500 contacts.</p>
                </div>
              </div>

              {/* Right Column: Live Chat & AI Auto-Reply Simulation */}
              <div className="md:col-span-8 p-4 sm:p-6 flex flex-col justify-between bg-gradient-to-b from-[#091211] to-[#0d1817]">
                {/* Chat Messages */}
                <div className="space-y-4">
                  {/* Incoming Customer Message */}
                  <div className="flex flex-col items-start max-w-[85%]">
                    <div className="bg-[#1f2c34] text-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm shadow-md border border-white/5">
                      <p className="font-semibold text-xs text-[#25D366] mb-0.5">Muhammad Huzaifa</p>
                      <p>Hello! We want to automate WhatsApp customer inquiries and broadcast offers to 50,000 customers. Can your CRM handle this?</p>
                      <span className="text-[10px] text-gray-400 float-right mt-1">10:42 AM</span>
                    </div>
                  </div>

                  {/* AI Instant Auto-Reply */}
                  <div className="flex flex-col items-end max-w-[85%] ml-auto">
                    <div className="bg-[#005c4b] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm shadow-md border border-emerald-500/20">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                        <Sparkles className="h-3 w-3" /> iTechSkill AI Agent • Instant Reply
                      </div>
                      <p>Yes absolutely! iTechSkill WhatsApp CRM supports verified Meta Cloud API broadcasts with 98% open rates, multi-agent inbox, and 24/7 AI qualification. Would you like me to book a 1-on-1 demo call with our solution engineer?</p>
                      <span className="text-[10px] text-emerald-200 float-right mt-1">10:42 AM • Delivered</span>
                    </div>
                  </div>

                  {/* Call Logged Chip */}
                  <div className="flex justify-center my-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                      <PhoneCall className="h-3.5 w-3.5 text-[#25D366]" />
                      <span>Outbound Call Logged: <strong>4m 32s</strong> (Result: Qualified Lead)</span>
                    </div>
                  </div>
                </div>

                {/* Exact WhatsApp Composer Structure matching Screenshot 3 */}
                <div className="mt-6 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Left Button 1: Plus icon */}
                    <div className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                      <Plus className="h-5 w-5" />
                    </div>

                    {/* Left Button 2: AI Sparkles icon */}
                    <div className="h-8 w-8 rounded-full text-gray-400 hover:text-[#25D366] hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>

                    {/* Center: Standalone Text Input Box Capsule */}
                    <div className="flex-1 bg-[#182229]/90 border border-white/10 rounded-[24px] px-4 py-2 text-xs sm:text-sm text-gray-300 flex items-center shadow-inner">
                      <span>Type a message... (Shift+Enter for new line)</span>
                    </div>

                    {/* Right Button 1: Paperclip */}
                    <div className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                      <Paperclip className="h-5 w-5" />
                    </div>

                    {/* Right Button 2: Camera (Enlarged) */}
                    <div className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                      <Camera className="h-[21px] w-[21px]" />
                    </div>

                    {/* Far Right: WhatsApp Green Circular FAB */}
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/30 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                      <Mic className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Hint text below input */}
                  <p className="mt-1 pl-10 sm:pl-16 text-[10px] text-gray-400">
                    Tap the ✨ to draft a reply with AI you can edit it before sending
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Fullscreen Video Modal (Theater Mode) */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="relative w-full max-w-5xl bg-[#0c1615] rounded-2xl sm:rounded-3xl border border-white/15 overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#091110] border-b border-white/10">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Film className="h-4 w-4 text-[#25D366]" /> iTechSkill WhatsApp CRM — Full Video Walkthrough
              </span>
              <button
                type="button"
                onClick={() => setVideoModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black">
              <video
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. CORE FEATURES (6 Power Modules) */}
      {/* ------------------------------------------------------------- */}
      <section id="features" className="py-20 bg-[#091110] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">Enterprise-Grade Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
              Everything Your Team Needs to Scale on WhatsApp
            </h2>
            <p className="text-gray-400 text-base">
              Replace disorganized phones and manual chats with a high-performance WhatsApp CRM designed for conversion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#008069]/50 transition-all hover:translate-y-[-2px] group">
              <div className="h-12 w-12 rounded-xl bg-[#008069]/20 text-[#25D366] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Unified Multi-Agent Inbox</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Connect your WhatsApp Business number to multiple team members. Real-time typing indicators, collision detection, and automated conversation routing.
              </p>
            </div>

            {/* Feature 2 */}
            <div id="ai-agent" className="p-6 rounded-2xl bg-white/[0.03] border border-[#25D366]/30 hover:border-[#25D366] transition-all hover:translate-y-[-2px] relative overflow-hidden group">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30">
                AI POWERED
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">24/7 AI Smart Auto-Reply</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Intelligent knowledge-base integration powered by n8n & OpenAI. Answers customer questions in seconds, qualifies leads, and hands off to human agents.
              </p>
            </div>

            {/* Feature 3 */}
            <div id="broadcasts" className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#008069]/50 transition-all hover:translate-y-[-2px] group">
              <div className="h-12 w-12 rounded-xl bg-[#008069]/20 text-[#25D366] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Radio className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Official Bulk Broadcasts</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Reach thousands of opted-in customers with rich media templates, CTA buttons, and location cards. 98% open rates without risk of phone number bans.
              </p>
            </div>

            {/* Feature 4 */}
            <div id="pipeline" className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#008069]/50 transition-all hover:translate-y-[-2px] group">
              <div className="h-12 w-12 rounded-xl bg-[#008069]/20 text-[#25D366] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Kanban className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Visual Kanban Sales Pipelines</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Track deals from first message to closed deal. Drag-and-drop leads across custom stages, calculate projected revenue, and identify bottlenecks.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#008069]/50 transition-all hover:translate-y-[-2px] group">
              <div className="h-12 w-12 rounded-xl bg-[#008069]/20 text-[#25D366] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Team Call Analytics</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Log and monitor outbound & inbound customer calls with duration timestamps, agent notes, and team leader monitoring dashboards.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#008069]/50 transition-all hover:translate-y-[-2px] group">
              <div className="h-12 w-12 rounded-xl bg-[#008069]/20 text-[#25D366] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Interactive WhatsApp Messages</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Send interactive button replies, list pickers, audio voice notes, and instant quick-response templates to eliminate typing friction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. COMPARISON SECTION */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">Why Switch?</span>
          <h2 className="text-3xl font-extrabold text-white mt-1">Traditional WhatsApp vs. iTechSkill CRM</h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1615] overflow-hidden shadow-xl">
          <div className="grid grid-cols-3 p-4 bg-white/5 border-b border-white/10 text-xs sm:text-sm font-bold">
            <span className="text-gray-300">Feature</span>
            <span className="text-gray-400 text-center">Standard WhatsApp Web</span>
            <span className="text-[#25D366] text-center font-extrabold">iTechSkill WhatsApp CRM</span>
          </div>

          <div className="divide-y divide-white/5 text-xs sm:text-sm">
            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-semibold text-gray-200">Multi-Agent Team Login</span>
              <div className="flex justify-center text-red-400"><X className="h-5 w-5" /></div>
              <div className="flex justify-center text-[#25D366] font-bold"><Check className="h-5 w-5" /> Unlimited Agents</div>
            </div>

            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-semibold text-gray-200">24/7 AI Smart Auto-Reply</span>
              <div className="flex justify-center text-red-400"><X className="h-5 w-5" /></div>
              <div className="flex justify-center text-[#25D366] font-bold"><Check className="h-5 w-5" /> Built-in Knowledge Base</div>
            </div>

            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-semibold text-gray-200">Sales Pipeline (Kanban)</span>
              <div className="flex justify-center text-red-400"><X className="h-5 w-5" /></div>
              <div className="flex justify-center text-[#25D366] font-bold"><Check className="h-5 w-5" /> Drag & Drop Deals</div>
            </div>

            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-semibold text-gray-200">Official Broadcasts</span>
              <div className="flex justify-center text-yellow-400 text-center">High Ban Risk (Manual)</div>
              <div className="flex justify-center text-[#25D366] font-bold"><Check className="h-5 w-5" /> 100% Ban Proof Meta API</div>
            </div>

            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-semibold text-gray-200">Team Call Tracking</span>
              <div className="flex justify-center text-red-400"><X className="h-5 w-5" /></div>
              <div className="flex justify-center text-[#25D366] font-bold"><Check className="h-5 w-5" /> Duration & Agent Stats</div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. HOW IT WORKS */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 bg-[#091110] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">Get Live in Minutes</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">How It Works in 3 Simple Steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
              <div className="h-12 w-12 rounded-full bg-[#008069] text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Connect Meta Cloud API</h3>
              <p className="text-xs text-gray-400">
                Plug in your WhatsApp Business API credentials in 2 minutes. Instant webhook synchronization.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
              <div className="h-12 w-12 rounded-full bg-[#008069] text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Enable AI & Invite Team</h3>
              <p className="text-xs text-gray-400">
                Upload your business FAQs to train the 24/7 AI Agent and add your sales reps with role permissions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
              <div className="h-12 w-12 rounded-full bg-[#008069] text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Close Deals 10x Faster</h3>
              <p className="text-xs text-gray-400">
                Send rich broadcasts, manage deals on your Kanban pipeline, and track conversions seamlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. PRICING SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">Predictable & Transparent</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
            Simple Plans Built for Scaling Businesses
          </h2>
          <p className="text-gray-400 text-sm">
            Choose the plan that fits your team size and message volume. No hidden setup fees.
          </p>

          {/* Billing Switch */}
          <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-full bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !annualBilling ? "bg-[#008069] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                annualBilling ? "bg-[#008069] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Annual Billing <span className="text-[10px] text-[#25D366] font-bold ml-1">(Save 20%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-xs text-gray-400 mb-6">Ideal for small teams and solopreneurs starting on WhatsApp.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">{annualBilling ? "$29" : "$39"}</span>
                <span className="text-xs text-gray-400">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-gray-300 mb-8">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> 3 Team Agent Seats</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> 5,000 Contacts</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Shared Team Inbox</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Basic AI Draft Assistance</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Visual Kanban Pipeline</li>
              </ul>
            </div>
            <Link href="/signup">
              <Button variant="outline" className="w-full text-white border-white/10 bg-white/5 hover:bg-white/10 rounded-xl">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Professional Plan (Featured) */}
          <div className="p-8 rounded-3xl bg-[#0e1c1a] border-2 border-[#25D366] shadow-2xl shadow-[#008069]/30 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#25D366] text-[#070d0c] text-[11px] font-extrabold uppercase tracking-wide">
              MOST POPULAR
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
              <p className="text-xs text-gray-300 mb-6">For growing businesses needing 24/7 AI & broadcasts.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">{annualBilling ? "$79" : "$99"}</span>
                <span className="text-xs text-gray-400">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-gray-200 mb-8">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> 10 Team Agent Seats</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> 25,000 Contacts</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> <strong>24/7 AI Smart Auto-Reply Bot</strong></li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Official Meta Broadcasts & Templates</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Team Call Duration & Monitoring</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Interactive Button & List Messages</li>
              </ul>
            </div>
            <Link href="/signup">
              <Button className="w-full bg-[#008069] hover:bg-[#006d59] text-white font-bold rounded-xl shadow-lg shadow-[#008069]/30">
                Start 14-Day Free Trial
              </Button>
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-xs text-gray-400 mb-6">High volume operations with custom automations & webhooks.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">{annualBilling ? "$199" : "$249"}</span>
                <span className="text-xs text-gray-400">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-gray-300 mb-8">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Unlimited Agent Seats</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Unlimited Contacts & Broadcasts</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Dedicated AI Agent Knowledge Base</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Custom Webhooks & n8n Workflows</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#25D366]" /> Priority 24/7 Dedicated Support</li>
              </ul>
            </div>
            <Link href="/signup">
              <Button variant="outline" className="w-full text-white border-white/10 bg-white/5 hover:bg-white/10 rounded-xl">
                Contact Enterprise
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. FAQ SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-20 bg-[#091110] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">Got Questions?</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Is this CRM using the official WhatsApp Business Cloud API?",
                a: "Yes! iTechSkill WhatsApp CRM connects directly to the official Meta WhatsApp Cloud API, ensuring high delivery speed, 99.9% uptime, and complete ban protection."
              },
              {
                q: "How does the 24/7 AI Smart Auto-Reply Agent work?",
                a: "You can configure your business details, return policy, and FAQs in the Knowledge Base. When a customer sends a message, our AI agent uses semantic search and OpenAI/n8n to construct accurate, polite answers and can route complex chats to human agents."
              },
              {
                q: "Can multiple team members reply from the same WhatsApp number?",
                a: "Yes! Your entire sales and support team can log in simultaneously on their own laptops or phones. You can assign conversations, tag team members, and prevent collision replies."
              },
              {
                q: "What makes iTechSkill WhatsApp CRM safe from number bans?",
                a: "We utilize Meta-approved message templates and respect WhatsApp's 24-hour customer service window policies. Broadcasts are delivered via Meta's tiering system with zero spam risk."
              },
              {
                q: "Can I migrate my existing WhatsApp contacts and pipeline data?",
                a: "Yes! You can import your contacts via CSV or Excel in 1 click, sync existing Meta chat histories, and configure custom deal pipeline stages immediately."
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4.5 sm:p-5 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-white hover:text-[#25D366] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      activeFaq === idx ? "rotate-180 text-[#25D366]" : ""
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 9. BOTTOM FINAL CALL TO ACTION */}
      {/* ------------------------------------------------------------- */}
      <section className="py-24 relative overflow-hidden text-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-[#0e211e] to-[#0a1614] border border-[#008069]/40 shadow-2xl shadow-[#008069]/30 relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            Ready to Supercharge Your WhatsApp Sales?
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto mb-8">
            Join hundreds of businesses converting leads 10x faster with iTechSkill WhatsApp CRM. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-13 px-8 text-base font-bold bg-[#25D366] hover:bg-[#20bd5a] text-[#070d0c] rounded-full shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105">
                Get Started Now — It's Free <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-13 px-7 text-base font-medium text-white border-white/20 bg-white/5 hover:bg-white/10 rounded-full">
                Sign In to Console
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 10. COMPREHENSIVE FOOTER */}
      {/* ------------------------------------------------------------- */}
      <footer className="border-t border-white/10 bg-[#050a09] pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 pb-12 border-b border-white/10">
            {/* Col 1 & 2: Branding, Contact Info & Socials */}
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <WhatsAppBadgeLogo className="h-8 w-8 shadow-md shadow-[#008069]/30" />
                <div className="flex flex-col text-left">
                  <span className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
                    iTechSkill <span className="text-[#25D366] text-xs font-semibold px-1.5 py-0.5 rounded bg-[#25D366]/10 border border-[#25D366]/20">CRM</span>
                  </span>
                  <span className="text-[10px] text-gray-400">WhatsApp Business Platform</span>
                </div>
              </Link>

              <div className="space-y-1.5 text-xs text-gray-400 pt-1">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
                  <a href="mailto:itechskill6@gmail.com" className="hover:text-white transition-colors">
                    itechskill6@gmail.com
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
                  <a href="tel:+923309998880" className="hover:text-white transition-colors">
                    UAN & WhatsApp: +92 3309998880
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
                  <a href="https://itechskill.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    https://itechskill.com
                  </a>
                </p>
              </div>

              {/* Social Media Buttons Row */}
              <div className="flex items-center flex-wrap gap-2 pt-2">
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/itech_skill"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="h-8 w-8 rounded-lg bg-[#008069]/30 hover:bg-[#008069] border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/company/itechskill"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="h-8 w-8 rounded-lg bg-[#008069]/30 hover:bg-[#008069] border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/profile.php?id=61586540587111"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="h-8 w-8 rounded-lg bg-[#008069]/30 hover:bg-[#008069] border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@itechskill-6"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="h-8 w-8 rounded-lg bg-[#008069]/30 hover:bg-[#008069] border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@itechskill"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="h-8 w-8 rounded-lg bg-[#008069]/30 hover:bg-[#008069] border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.07 1.17 1.9 2.25 2.01.56.07 1.14-.02 1.66-.23.86-.35 1.54-1.07 1.83-1.95.2-1.02.13-2.08.14-3.12V.02h.83z" />
                  </svg>
                </a>
              </div>

              {/* Join WhatsApp Channel Button */}
              <div className="pt-2">
                <a
                  href={whatsappDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#008069] hover:bg-[#006d59] text-white text-xs font-bold shadow-md shadow-[#008069]/30 transition-all hover:scale-105"
                >
                  <WhatsAppPhoneIcon className="h-4 w-4" />
                  <span>Join WhatsApp Channel</span>
                </a>
              </div>

              {/* Meta Business Partner Badge */}
              <div className="pt-3">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm">
                  <svg className="h-5 w-5 text-[#0081FB] fill-current" viewBox="0 0 24 24">
                    <path d="M16.96 5.86a6.11 6.11 0 0 0-4.96 2.56 6.11 6.11 0 0 0-4.96-2.56C3.12 5.86 0 8.98 0 12.89c0 3.92 3.12 7.03 7.04 7.03a6.11 6.11 0 0 0 4.96-2.56 6.11 6.11 0 0 0 4.96 2.56c3.92 0 7.04-3.11 7.04-7.03 0-3.91-3.12-7.03-7.04-7.03zm-9.92 12.1c-2.8 0-5.07-2.27-5.07-5.07s2.27-5.07 5.07-5.07c1.84 0 3.46 1 4.34 2.51-.88 1.51-2.5 2.51-4.34 2.51zm9.92 0c-1.84 0-3.46-1-4.34-2.51.88-1.51 2.5-2.51 4.34-2.51 2.8 0 5.07 2.27 5.07 5.07s-2.27 5.07-5.07 5.07z" />
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-white text-[11px] leading-tight">Meta</span>
                    <span className="text-[9px] text-gray-400 font-medium">Business Partner</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-3 text-left">
              <h4 className="font-bold text-white text-sm">Company</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><a href="#live-demo" className="hover:text-white transition-colors">Video Walkthrough</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Why iTechSkill</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Competitor Comparison</a></li>
                <li><a href="https://itechskill.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">About iTechSkill <ExternalLink className="h-3 w-3" /></a></li>
              </ul>
            </div>

            {/* Col 4: Collaboration */}
            <div className="space-y-3 text-left">
              <h4 className="font-bold text-white text-sm">Collaboration</h4>
              <ul className="space-y-2 text-xs">
                <li><a href={whatsappDirectUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Affiliates</a></li>
                <li><a href={whatsappDirectUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Partner Program</a></li>
                <li><a href={whatsappDirectUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Agency Solutions</a></li>
                <li><a href={whatsappDirectUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Enterprise API</a></li>
              </ul>
            </div>

            {/* Col 5: Resources */}
            <div className="space-y-3 text-left">
              <h4 className="font-bold text-white text-sm">Resources</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ&apos;s</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a></li>
                <li><a href="#broadcasts" className="hover:text-white transition-colors">Broadcasts Guide</a></li>
                <li><a href="#pipeline" className="hover:text-white transition-colors">Sales Pipelines</a></li>
              </ul>
            </div>

            {/* Col 6: Support */}
            <div className="space-y-3 text-left">
              <h4 className="font-bold text-white text-sm">Support</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#faq" className="hover:text-white transition-colors">Use Official WhatsApp API</a></li>
                <li><a href={whatsappDirectUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="mailto:itechskill6@gmail.com" className="hover:text-white transition-colors">Email Us</a></li>
                <li><a href="tel:+923309998880" className="hover:text-white transition-colors">UAN Helpline</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Agent Console Login</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Legal */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>
              Copyright © 2026 iTechSkill LLC. All rights reserved. Powered by{" "}
              <a href="https://itechskill.com" target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline font-semibold">
                iTechSkill
              </a>.
            </p>
            <div className="flex items-center gap-6">
              <a href="#faq" className="hover:text-white transition-colors">Terms &amp; Conditions</a>
              <a href="#faq" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* 11. FLOATING BOTTOM-RIGHT WHATSAPP WIDGET */}
      {/* ------------------------------------------------------------- */}
      <aside aria-label="WhatsApp Support Widget" className="fixed bottom-6 right-6 z-50 flex items-center group">
        <a
          href={whatsappDirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat with iTechSkill on WhatsApp (+92 3309998880)"
          className="relative flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-2xl shadow-[#25D366]/40 transition-all hover:scale-110 active:scale-95 group"
        >
          {/* Animated pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-[#25D366]/40 animate-ping pointer-events-none" />

          {/* Official WhatsApp Phone Icon with Handset */}
          <WhatsAppPhoneIcon className="h-7 w-7 text-white" />
        </a>

        {/* Floating Tooltip Pill */}
        <div className="absolute right-16 px-3 py-1.5 rounded-xl bg-[#0c1615] border border-white/10 text-white text-xs font-semibold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          💬 Need Help? Chat with Us!
        </div>
      </aside>
    </div>
  );
}
