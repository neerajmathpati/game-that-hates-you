'use client';

// ─── ObservationToast — adaptive psychological reveal toast ──────────────────
import { useEffect, useRef, useState } from 'react';

export interface ObservationToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function ObservationToast({ message, onDismiss }: ObservationToastProps) {
  const [visible, setVisible] = useState(false);
  const prevMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (message === prevMessageRef.current) return;
    prevMessageRef.current = message;

    if (!message) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }

    const showTimer = setTimeout(() => setVisible(true), 20);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 350);
    }, 3600);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      id="observation-toast"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: '12%',
        left: '50%',
        transform: `translate(-50%, ${visible ? '0px' : '-24px'})`,
        background: 'rgba(12, 10, 22, 0.95)',
        border: '1px solid rgba(239, 68, 68, 0.6)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(239, 68, 68, 0.25)',
        borderRadius: 8,
        padding: '12px 24px',
        zIndex: 500,
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'none',
        maxWidth: 440,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 2.5,
          color: '#ef4444',
          marginBottom: 4,
          fontFamily: 'monospace',
          fontWeight: 700,
        }}
      >
        {'// SYSTEM OBSERVATION'}
      </div>
      <p
        style={{
          color: '#f9fafb',
          fontFamily: 'monospace',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.5,
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        &ldquo;{message}&rdquo;
      </p>
    </div>
  );
}
