import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSettings } from '@/lib/settings';
import SwRegister from '@/components/SwRegister';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = `${s.name} — груминг для собак и кошек`;
  const description = 'Комплекс, стрижка, мытьё и когти. Рассчитайте стоимость онлайн и оставьте заявку.';
  return {
    metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
    title, description,
    openGraph: { title, description, type: 'website', locale: 'ru_RU' },
    icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
  };
}
export const viewport: Viewport = { themeColor: '#FAF8FF', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}<SwRegister /></body>
    </html>
  );
}
