"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Lock, AlertCircle, CheckCircle, Eye, EyeOff, Building2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const passwordResetSuccess = searchParams.get("password-reset") === "success";
  const queryError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    queryError === "expired"
      ? "Your link has expired or is invalid. Please sign in below."
      : null
  );
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInError) {
      setError(mapAuthError(signInError));
      setLoading(false);
      return;
    }

    // Full-page navigation so browser sends freshly set cookies to middleware
    window.location.href = "/dashboard";
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#070d0c] px-4 py-12">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Header Badge */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <Shield className="h-4 w-4" />
          <span>Executive Security Gateway</span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          CEO Access Only
        </span>
      </div>

      <Card className="w-full max-w-md border-white/10 bg-[#0d1615]/95 shadow-2xl backdrop-blur-xl z-10">
        <CardHeader className="items-center text-center pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-lg shadow-md shadow-emerald-500/20">
              F
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-white text-lg tracking-tight">Fortline-Pvt</span>
              <span className="text-[11px] text-emerald-400 font-semibold">Executive Sales Operations CRM</span>
            </div>
          </div>
          <CardTitle className="text-xl text-white font-bold">
            CEO Portal Sign In
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            Access executive oversight across all 30 sales members, enterprise WhatsApp channels, and SLAs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {passwordResetSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Password updated successfully. Sign in with your new password.</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs">
                CEO Account Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ceo@fortline.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-muted/60 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-muted-foreground text-xs">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-muted/60 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Command Center"}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="size-3 text-emerald-400" />
              Restricted executive system. Sales reps do not require CRM login credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
