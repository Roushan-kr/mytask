import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'TaskFlow Pro - Dynamic Thread & Kanban Task Manager',
  description:
    'Dynamic multi-thread task management board with customizable status tags, drag & drop, timestamped audit logs, Web Push reminders, and instant JSON/CSV backups.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TaskFlow',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
