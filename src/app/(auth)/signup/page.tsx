"use client";

import Link from "next/link";
import { Shield, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#070d0c] px-4 py-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md border-white/10 bg-[#0d1615]/95 shadow-2xl backdrop-blur-xl z-10 text-center">
        <CardHeader className="items-center pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-2">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white font-bold">
            Executive Portal Restricted
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            Fortline-Pvt Executive Sales Operations CRM is a closed enterprise management interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Public self-registration is disabled. Account access is reserved for the Chief Executive Officer. All 30 sales representatives operate as assigned operational records via direct WhatsApp channels.
          </p>
          <Link href="/login" className="block w-full">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
              Return to CEO Sign In <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
