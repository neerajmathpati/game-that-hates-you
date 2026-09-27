import type { Metadata } from 'next';
import { GameShell } from '@/components/GameShell';

export const metadata: Metadata = {
  title: 'Play — The Game That Hates You',
  description: 'Start playing. Something is watching.',
};

export default function PlayPage() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GameShell />
    </div>
  );
}
