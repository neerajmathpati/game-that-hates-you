import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'The Game That Hates You',
    template: '%s — The Game That Hates You',
  },
  description: 'A rage platformer that learns how you play — and uses it against you.',
  metadataBase: new URL('https://the-game-that-hates-you.vercel.app'),
  openGraph: {
    title: 'The Game That Hates You',
    description: 'A rage platformer that learns how you play.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ margin: 0, padding: 0, height: '100%', background: '#0a0a0f' }}>
        {children}
      </body>
    </html>
  );
}
