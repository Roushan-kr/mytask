'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, Check, Sparkles, Monitor, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPwaButton({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  if (isInstalled) {
    return (
      <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium select-none ${className}`}>
        <Check className="w-3.5 h-3.5 shrink-0" />
        <span>Running as Native App</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`group relative flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] ${className}`}
        title="Install TaskFlow as a Progressive Web App"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
        <span>Install App</span>
        <Download className="w-3.5 h-3.5 text-indigo-200 group-hover:translate-y-0.5 transition-transform" />
      </button>

      {/* Manual / Fallback Install Instructions Modal */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-400">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  {isIOS ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </div>
                <h3 className="font-semibold text-white text-base">
                  {isIOS ? 'Install on iOS Safari' : 'Install on Desktop / Android'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  To install <strong>TaskFlow</strong> on your iPhone or iPad:
                </p>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                  <li>Tap the <strong>Share</strong> icon at the bottom of Safari (square with arrow).</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top-right corner.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Install <strong>TaskFlow</strong> directly to your desktop or device:
                </p>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                  <li>
                    Look at your browser&apos;s address bar (top right) and click the <strong>Install</strong> icon (<span className="font-mono text-indigo-300 font-bold">⊕</span> or <span className="font-mono text-indigo-300 font-bold">💻</span>).
                  </li>
                  <li>
                    Or click browser menu (<span className="font-bold">⋮</span>) &rarr; <strong>Install TaskFlow</strong>.
                  </li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
