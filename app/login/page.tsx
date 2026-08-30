'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Layers,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Cpu,
  Clock,
  Kanban,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await loginAction({ email, pass: password });
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden bg-slate-950 p-4 sm:p-6 lg:p-10 select-none">
      {/* Background ambient lighting and mesh grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[32rem] h-[32rem] bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-[32rem] h-[32rem] bg-purple-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Side: Product Showcase / Value Prop */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-6">
          <div className="space-y-4">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next.js 16 • Dynamic Thread Kanban Workspace</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Manage tasks with <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
                dynamic thread workflows
              </span>
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed">
              Full-stack Kanban board featuring customizable thread tags, fractional float drag-and-drop, and timestamped movement logs built for calendar integration.
            </p>
          </div>

          {/* Interactive Feature Highlights */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Kanban className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Dynamic Thread-Level Columns</h2>
                <p className="text-[11px] text-slate-400">Custom statuses (todo, done, schedule latter) per thread.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Timestamped Audit History</h2>
                <p className="text-[11px] text-slate-400">Every card movement logged with exact date & time.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Constant-Time Security</h2>
                <p className="text-[11px] text-slate-400">Protected against timing attacks via crypto.timingSafeEqual.</p>
              </div>
            </div>
          </div>

          {/* System status pills */}
          <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Database Online
            </span>
            <span>•</span>
            <span>Edge JWT Protected</span>
          </div>
        </div>

        {/* Right Side: Professional Auth Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="glass-panel p-8 sm:p-9 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden bg-slate-900/80 backdrop-blur-xl">
            {/* Ambient top border line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

            {/* Mobile Header Branding */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  TaskFlow <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">Pro</span>
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">Admin Workspace Access</p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-center gap-2 mb-6 text-xs text-indigo-300 font-medium px-3.5 py-2 rounded-xl bg-indigo-950/50 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>TimingSafe Admin Verification Enabled</span>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <span className="font-bold text-red-400 uppercase mt-0.5">Error:</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@taskflow.local"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Custom Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 hover:from-indigo-600 via-purple-600 to-indigo-600 hover:to-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying session...</span>
                  </span>
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Information */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Single-admin node</span>
              </span>
              <span className="font-mono">v1.0.0 Pro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
