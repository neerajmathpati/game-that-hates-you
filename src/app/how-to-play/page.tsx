import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Play — The Game That Hates You',
  description: 'Controls and core rules.',
};

export default function HowToPlayPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: 'monospace',
      }}
    >
      <h1
        style={{
          color: '#e5e7eb',
          fontSize: 18,
          letterSpacing: 6,
          marginBottom: 32,
          textTransform: 'uppercase',
        }}
      >
        HOW TO PLAY
      </h1>

      <div
        style={{
          border: '1px solid #1f2937',
          borderRadius: 8,
          padding: '28px 36px',
          maxWidth: 420,
          width: '100%',
          background: 'rgba(15, 15, 30, 0.7)',
        }}
      >
        <InstructionRow label="MOVE" detail="Arrow keys or A / D" />
        <InstructionRow label="JUMP" detail="Space, W, or Up arrow" />
        <InstructionRow label="RETRY" detail="Press R to instantly reset" />
        <InstructionRow label="EXIT" detail="Reach the green door at the end" />
      </div>

      <div style={{ marginTop: 36, display: 'flex', gap: 20 }}>
        <Link
          href="/play"
          id="btn-play-htp"
          style={{
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid #7c3aed',
            borderRadius: 4,
            color: '#a78bfa',
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 4,
            padding: '12px 36px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          PLAY
        </Link>
        <Link
          href="/"
          id="btn-back-htp"
          style={{
            color: '#6b7280',
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 3,
            textDecoration: 'none',
            padding: '12px 16px',
            display: 'inline-block',
          }}
        >
          BACK
        </Link>
      </div>
    </main>
  );
}

function InstructionRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid rgba(31, 41, 55, 0.6)',
      }}
    >
      <span
        style={{
          color: '#a78bfa',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: '#d1d5db',
          fontSize: 13,
          textAlign: 'right',
        }}
      >
        {detail}
      </span>
    </div>
  );
}
