'use client';

// ─── EndingScreen — memorable final resolution ──────────────────────────────
import type { PlayerProfile } from '@/game/types';

export interface EndingScreenProps {
  profile: PlayerProfile;
  onPlayAgain: () => void;
}

export function EndingScreen({ profile, onPlayAgain }: EndingScreenProps) {
  const totalChoices = profile.leftChoices + profile.rightChoices;
  const leftPct = totalChoices > 0 ? Math.round((profile.leftChoices / totalChoices) * 100) : 50;

  // 1. Preferred direction
  let directionSummary = 'Adaptive / Balanced';
  if (totalChoices >= 2) {
    if (leftPct >= 65) directionSummary = `Left-favored (${leftPct}%)`;
    else if (leftPct <= 35) directionSummary = `Right-favored (${100 - leftPct}%)`;
  }

  // 2. Jump tendency
  let jumpSummary = 'Grounded platforming';
  if (profile.jumps >= 35) jumpSummary = `High aerial frequency (${profile.jumps} jumps)`;
  else if (profile.jumps >= 15) jumpSummary = `Balanced jumping (${profile.jumps} jumps)`;
  else if (profile.jumps > 0) jumpSummary = `Low jump tendency (${profile.jumps} jumps)`;

  // 3. Speed / hesitation behavior
  let speedSummary = 'Steady pacing';
  if (profile.avgHesitationMs > 0 && profile.avgHesitationMs < 350) {
    speedSummary = 'Fast & decisive entry';
  } else if (profile.avgHesitationMs > 1000) {
    speedSummary = 'Cautious & deliberate';
  }

  // 4. Repetition behavior
  const hasRepetitive = profile.traits.some(t => t.id === 'REPETITIVE' && t.score >= 0.65);
  const repetitionSummary = (hasRepetitive || profile.attempts >= 6)
    ? 'Habit-driven route repetition'
    : 'Dynamic route variation';

  // 5. Number of attempts
  const attemptsSummary = `${profile.attempts || 1} attempt(s) across 5 levels`;

  return (
    <div
      id="ending-screen"
      role="region"
      aria-label="Game completion summary"
      style={{
        position: 'absolute',
        inset: 0,
        background: '#07070c',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        padding: '32px 24px',
        overflowY: 'auto',
      }}
    >
      <p
        style={{
          color: '#ef4444',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: 6,
          marginBottom: 20,
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        THE GAME THAT HATES YOU
      </p>

      <h1
        style={{
          color: '#f9fafb',
          fontFamily: 'monospace',
          fontSize: 'clamp(20px, 3.5vw, 28px)',
          letterSpacing: 4,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        I don&apos;t hate you.
      </h1>

      <h2
        style={{
          color: '#a78bfa',
          fontFamily: 'monospace',
          fontSize: 'clamp(16px, 2.5vw, 22px)',
          letterSpacing: 3,
          marginBottom: 36,
          textAlign: 'center',
          textShadow: '0 0 15px rgba(124, 58, 237, 0.4)',
        }}
      >
        I just know you.
      </h2>

      {/* Concise behavioral summary */}
      <div
        style={{
          border: '1px solid #1f2937',
          borderRadius: 8,
          padding: '24px 32px',
          marginBottom: 36,
          background: 'rgba(15, 15, 26, 0.85)',
          maxWidth: 460,
          width: '100%',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <SummaryRow label="Preferred direction" value={directionSummary} />
        <SummaryRow label="Jump tendency" value={jumpSummary} />
        <SummaryRow label="Speed / hesitation" value={speedSummary} />
        <SummaryRow label="Repetition behavior" value={repetitionSummary} />
        <SummaryRow label="Total attempts" value={attemptsSummary} />
      </div>

      <button
        id="btn-play-again"
        onClick={onPlayAgain}
        aria-label="Play Again and reset session"
        style={{
          background: 'rgba(124, 58, 237, 0.15)',
          border: '1px solid #7c3aed',
          borderRadius: 4,
          color: '#c4b5fd',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 13,
          letterSpacing: 4,
          padding: '14px 48px',
          transition: 'all 0.2s ease',
          fontWeight: 700,
        }}
        onMouseEnter={e => {
          (e.target as HTMLButtonElement).style.background = 'rgba(124, 58, 237, 0.35)';
          (e.target as HTMLButtonElement).style.borderColor = '#a78bfa';
        }}
        onMouseLeave={e => {
          (e.target as HTMLButtonElement).style.background = 'rgba(124, 58, 237, 0.15)';
          (e.target as HTMLButtonElement).style.borderColor = '#7c3aed';
        }}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid rgba(31, 41, 55, 0.5)',
        gap: 16,
      }}
    >
      <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: 12, letterSpacing: 1 }}>
        {label}
      </span>
      <span
        style={{
          color: '#f3f4f6',
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}
