import type { Metadata, Viewport } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/layout/Navbar';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Sistem Pertanian Kecamatan Lembeyan - GIS & Penyaluran Pupuk',
  description:
    'Aplikasi Web Pemetaan Lahan Pertanian GIS, e-RDKK, dan Penyaluran Pupuk Bersubsidi Kecamatan Lembeyan - Dikembangkan oleh Supriyanto Abadi Jaya',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GIS Lembeyan',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800"
      >
        <AuthProvider>
          <Navbar />
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('PWA ServiceWorker registered successfully:', reg.scope);
                    },
                    function(err) {
                      console.log('PWA ServiceWorker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
