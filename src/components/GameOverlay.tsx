'use client';

// ─── GameOverlay — minimal HUD, touch controls, and pause modal ──────────────
import { useSyncExternalStore } from 'react';

export interface GameOverlayProps {
  isPaused: boolean;
  currentLevel: number;
  attempts: number;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onPause?: () => void;
}

const KEY_CODES: Record<string, number> = {
  ArrowLeft: 37,
  ArrowRight: 39,
  ArrowUp: 38,
  Space: 32,
  KeyW: 87,
  KeyA: 65,
  KeyD: 68,
  KeyR: 82,
};

function dispatchKey(type: 'keydown' | 'keyup', code: string, key: string) {
  const keyCode = KEY_CODES[code] ?? KEY_CODES[key] ?? 0;
  const evt = new KeyboardEvent(type, {
    code,
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(evt, 'keyCode', { value: keyCode });
  Object.defineProperty(evt, 'which', { value: keyCode });
  window.dispatchEvent(evt);
}

function subscribeTouch(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('touchstart', callback, { once: true });
  return () => window.removeEventListener('touchstart', callback);
}

function getTouchSnapshot() {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function getTouchServerSnapshot() {
  return false;
}

export function GameOverlay({
  isPaused,
  currentLevel,
  attempts,
  muted,
  onResume,
  onRestart,
  onToggleMute,
  onPause,
}: GameOverlayProps) {
  const isTouchDevice = useSyncExternalStore(subscribeTouch, getTouchSnapshot, getTouchServerSnapshot);

  return (
    <>
      {/* ── Top Minimal HUD ────────────────────────────────────────────────── */}
      <header
        id="game-hud"
        role="region"
        aria-label="Game HUD"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          zIndex: 100,
          pointerEvents: 'none',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <span
            id="hud-level"
            style={{
              color: '#f9fafb',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              textShadow: '0 0 10px rgba(0,0,0,0.8)',
            }}
          >
            LEVEL {currentLevel}
          </span>
          <span
            id="hud-attempts"
            style={{
              color: '#9ca3af',
              fontSize: 12,
              letterSpacing: 1.5,
              textShadow: '0 0 10px rgba(0,0,0,0.8)',
            }}
          >
            ATTEMPT {attempts}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
          <button
            id="btn-mute-hud"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            style={{
              background: 'rgba(15, 15, 26, 0.75)',
              border: '1px solid #374151',
              borderRadius: 4,
              color: '#d1d5db',
              cursor: 'pointer',
              fontSize: 14,
              padding: '6px 12px',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          <button
            id="btn-pause-hud"
            onClick={onPause ?? onResume}
            aria-label="Pause game"
            style={{
              background: 'rgba(15, 15, 26, 0.75)',
              border: '1px solid #374151',
              borderRadius: 4,
              color: '#d1d5db',
              cursor: 'pointer',
              fontSize: 12,
              letterSpacing: 2,
              padding: '6px 14px',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              backdropFilter: 'blur(4px)',
            }}
          >
            PAUSE
          </button>
        </div>
      </header>

      {/* ── Mobile / Touch Controls Overlay ─────────────────────────────────── */}
      {isTouchDevice && !isPaused && (
        <nav
          id="touch-controls"
          aria-label="Touch game controls"
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 20px',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {/* D-Pad Left / Right */}
          <div style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
            <TouchButton
              id="btn-touch-left"
              label="←"
              ariaLabel="Move left"
              onStart={() => dispatchKey('keydown', 'ArrowLeft', 'ArrowLeft')}
              onEnd={() => dispatchKey('keyup', 'ArrowLeft', 'ArrowLeft')}
            />
            <TouchButton
              id="btn-touch-right"
              label="→"
              ariaLabel="Move right"
              onStart={() => dispatchKey('keydown', 'ArrowRight', 'ArrowRight')}
              onEnd={() => dispatchKey('keyup', 'ArrowRight', 'ArrowRight')}
            />
          </div>

          {/* Jump / Retry */}
          <div style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
            <TouchButton
              id="btn-touch-retry"
              label="R"
              ariaLabel="Retry"
              size={50}
              onStart={() => dispatchKey('keydown', 'KeyR', 'r')}
              onEnd={() => dispatchKey('keyup', 'KeyR', 'r')}
            />
            <TouchButton
              id="btn-touch-jump"
              label="JUMP"
              ariaLabel="Jump"
              size={64}
              primary
              onStart={() => dispatchKey('keydown', 'Space', ' ')}
              onEnd={() => dispatchKey('keyup', 'Space', ' ')}
            />
          </div>
        </nav>
      )}

      {/* ── Pause Dialog Modal ──────────────────────────────────────────────── */}
      {isPaused && (
        <div
          id="game-overlay-pause"
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(7, 7, 14, 0.88)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              border: '1px solid rgba(124, 58, 237, 0.4)',
              borderRadius: 8,
              padding: '32px 48px',
              textAlign: 'center',
              background: 'rgba(15, 15, 28, 0.95)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            }}
          >
            <p
              style={{
                color: '#9ca3af',
                fontFamily: 'monospace',
                fontSize: 11,
                letterSpacing: 4,
                marginBottom: 8,
              }}
            >
              LEVEL {currentLevel}
            </p>
            <h2
              style={{
                color: '#f9fafb',
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: 6,
                marginBottom: 16,
              }}
            >
              PAUSED
            </h2>
            <p
              style={{
                color: '#6b7280',
                fontFamily: 'monospace',
                fontSize: 12,
                marginBottom: 28,
              }}
            >
              Attempts: {attempts}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <PauseButton id="btn-resume" onClick={onResume} primary>
                RESUME
              </PauseButton>
              <PauseButton id="btn-mute" onClick={onToggleMute}>
                {muted ? '🔇 UNMUTE' : '🔊 MUTE'}
              </PauseButton>
              <PauseButton id="btn-restart" onClick={onRestart}>
                RESTART
              </PauseButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PauseButton({
  id,
  children,
  onClick,
  primary,
}: {
  id: string;
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        background: primary ? 'rgba(124, 58, 237, 0.25)' : 'none',
        border: `1px solid ${primary ? '#7c3aed' : '#374151'}`,
        borderRadius: 4,
        color: primary ? '#c4b5fd' : '#d1d5db',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 12,
        letterSpacing: 3,
        padding: '12px 36px',
        minHeight: 48,
        transition: 'all 0.15s ease',
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function TouchButton({
  id,
  label,
  ariaLabel,
  onStart,
  onEnd,
  size = 56,
  primary,
}: {
  id: string;
  label: string;
  ariaLabel: string;
  onStart: () => void;
  onEnd: () => void;
  size?: number;
  primary?: boolean;
}) {
  return (
    <button
      id={id}
      aria-label={ariaLabel}
      onPointerDown={e => {
        e.preventDefault();
        onStart();
      }}
      onPointerUp={e => {
        e.preventDefault();
        onEnd();
      }}
      onPointerLeave={e => {
        e.preventDefault();
        onEnd();
      }}
      style={{
        width: size,
        height: size,
        minWidth: 48,
        minHeight: 48,
        borderRadius: size / 2,
        background: primary ? 'rgba(124, 58, 237, 0.4)' : 'rgba(15, 15, 26, 0.8)',
        border: `2px solid ${primary ? '#a78bfa' : 'rgba(156, 163, 175, 0.4)'}`,
        color: '#f9fafb',
        fontSize: primary ? 11 : 16,
        fontFamily: 'monospace',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.6)',
      }}
    >
      {label}
    </button>
  );
}
