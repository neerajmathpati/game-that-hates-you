'use client';

// ─── Landing component ────────────────────────────────────────────────────────
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '@/lib/settings';

export function Landing() {
  const [muted, setMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMuted(loadSettings().muted);
    setMounted(true);
  }, []);

  const handleToggleMute = () => {
    setMuted(prev => {
      saveSettings({ muted: !prev });
      return !prev;
    });
  };

  return (
    <main
      id="landing"
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BackgroundGrid />

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <p style={{
          color: '#4b5563',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 8,
          marginBottom: 16,
          textTransform: 'uppercase',
        }}>
          A rage platformer
        </p>

        <h1 style={{
          color: '#e5e7eb',
          fontFamily: 'monospace',
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 700,
          letterSpacing: 'clamp(4px, 1vw, 8px)',
          lineHeight: 1.2,
          marginBottom: 12,
          textTransform: 'uppercase',
        }}>
          THE GAME THAT<br />
          <span style={{ color: '#7c3aed' }}>HATES YOU</span>
        </h1>

        <p style={{
          color: '#6b7280',
          fontFamily: 'monospace',
          fontSize: 13,
          letterSpacing: 2,
          margin: '0 auto 56px',
          maxWidth: 340,
          lineHeight: 1.6,
        }}>
          You&apos;ll lose. Again and again.<br />
          But something is watching.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Link
            href="/play"
            id="btn-play"
            style={{
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid #7c3aed',
              borderRadius: 4,
              color: '#a78bfa',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 14,
              letterSpacing: 6,
              padding: '16px 56px',
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease',
              display: 'block',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = 'rgba(124,58,237,0.3)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'rgba(124,58,237,0.15)';
            }}
          >
            PLAY
          </Link>

          <Link
            href="/how-to-play"
            id="btn-how-to-play"
            style={{
              color: '#4b5563',
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: 4,
              textDecoration: 'none',
              padding: '8px 16px',
            }}
          >
            HOW TO PLAY
          </Link>
        </div>

        <div style={{ marginTop: 48 }}>
          <button
            id="btn-mute-landing"
            onClick={handleToggleMute}
            aria-label={mounted && muted ? 'Unmute' : 'Mute'}
            style={{
              background: 'none',
              border: 'none',
              color: '#4b5563',
              cursor: 'pointer',
              fontSize: 18,
              padding: 8,
              visibility: mounted ? 'visible' : 'hidden', // Avoid hydration mismatch while preventing layout shift
            }}
          >
            {mounted && muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <footer style={{
        position: 'absolute',
        bottom: 16,
        color: '#1f2937',
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 3,
      }}>
        v{process.env.NEXT_PUBLIC_GAME_VERSION ?? '0.1.0'}
      </footer>
    </main>
  );
}

function BackgroundGrid() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }}
    />
  );
}
