'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, Loader2 } from 'lucide-react';
import { savePushSubscriptionAction, removePushSubscriptionAction, getVapidPublicKeyAction } from '@/app/actions/push';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationBell() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Check existing subscription
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      alert('Web Push Notifications are not supported in this browser.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await removePushSubscriptionAction(endpoint);
        }
        setIsSubscribed(false);
      } else {
        // Request permission
        const perm = await Notification.requestPermission();
        setPermission(perm);

        if (perm !== 'granted') {
          alert('Notification permission was denied. Please allow notifications in browser settings.');
          setIsLoading(false);
          return;
        }

        // Register Service Worker
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Fetch Public VAPID key
        const { publicKey } = await getVapidPublicKeyAction();
        if (!publicKey) {
          alert('VAPID public key not found. Please configure NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local.');
          setIsLoading(false);
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(publicKey);
        const newSubscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        const jsonSub = newSubscription.toJSON();
        if (jsonSub.endpoint && jsonSub.keys?.p256dh && jsonSub.keys?.auth) {
          await savePushSubscriptionAction({
            endpoint: jsonSub.endpoint,
            keys: {
              p256dh: jsonSub.keys.p256dh,
              auth: jsonSub.keys.auth,
            },
            userAgent: navigator.userAgent,
          });
          setIsSubscribed(true);
        }
      }
    } catch (err: any) {
      console.error('[WebPush] Subscription error:', err);
      alert(err?.message || 'Failed to update notification subscription.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={handleToggleNotifications}
      disabled={isLoading}
      className={`relative p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
        isSubscribed
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
          : permission === 'denied'
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
      }`}
      title={
        isSubscribed
          ? 'Push Notifications Active (Click to disable)'
          : permission === 'denied'
          ? 'Notifications Blocked in Browser'
          : 'Enable Push Notifications for Todo tasks'
      }
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
      ) : isSubscribed ? (
        <>
          <BellRing className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span className="hidden sm:inline text-[11px] font-semibold">Alerts On</span>
        </>
      ) : permission === 'denied' ? (
        <>
          <BellOff className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline text-[11px]">Blocked</span>
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px]">Enable Alerts</span>
        </>
      )}
    </button>
  );
}
