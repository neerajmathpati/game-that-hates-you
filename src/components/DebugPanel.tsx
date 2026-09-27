'use client';

// ─── DebugPanel — development-only behavior inspector ─────────────────────────
// Visible only when NEXT_PUBLIC_ENABLE_DEBUG=true.
// Never shown in production without that flag.
// Shows: event count, attempts, deaths, left/right choices, extracted features.

import { useEffect, useState } from 'react';
import { sessionManager } from '@/game/systems/SessionManager';
import { extractFeatures } from '@/game/systems/FeatureExtractor';
import { BehaviorAnalyzer } from '@/game/systems/BehaviorAnalyzer';
import type { ExtractedFeatures } from '@/game/systems/FeatureExtractor';
import type { PlayerProfile } from '@/game/types';

const analyzer = new BehaviorAnalyzer();

interface DebugSnapshot {
  eventCount: number;
  profile: PlayerProfile;
  features: ExtractedFeatures;
}

function snap(): DebugSnapshot {
  const events   = sessionManager.getEvents();
  const profile  = sessionManager.profile;
  const features = extractFeatures(events);
  return { eventCount: events.length, profile, features };
}

function fmt(n: number, dec = 2): string {
  return n.toFixed(dec);
}

export function DebugPanel() {
  const [data, setData] = useState<DebugSnapshot>(snap);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Poll every 500ms — only in dev/debug mode, never real-time
    const id = setInterval(() => setData(snap()), 500);
    return () => clearInterval(id);
  }, []);

  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG !== 'true') return null;
  if (!visible) {
    return (
      <button
        id="debug-toggle"
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          zIndex: 9999,
          background: '#1a1a2e',
          color: '#7c3aed',
          border: '1px solid #7c3aed',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 10,
          cursor: 'pointer',
        }}
      >
        DEBUG
      </button>
    );
  }

  const { eventCount, profile, features } = data;
  const activeTraits = analyzer.activeTraits(
    analyzer.analyze(features, profile),
  );

  const row = (label: string, value: string) => (
    <tr key={label}>
      <td style={{ color: '#6b7280', paddingRight: 12 }}>{label}</td>
      <td style={{ color: '#e5e7eb', fontFamily: 'monospace' }}>{value}</td>
    </tr>
  );

  return (
    <div
      id="debug-panel"
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        zIndex: 9999,
        background: 'rgba(10,10,20,0.95)',
        border: '1px solid #374151',
        borderRadius: 6,
        padding: '10px 14px',
        fontSize: 11,
        color: '#9ca3af',
        minWidth: 240,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#7c3aed', fontWeight: 700, letterSpacing: 2, fontSize: 9 }}>
          ⚙ DEBUG PANEL
        </span>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}
        >
          ✕
        </button>
      </div>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {row('Events', String(eventCount))}
          {row('Attempts', String(profile.attempts))}
          {row('Deaths', String(profile.deaths))}
          {row('Jumps', String(profile.jumps))}
          {row('← Left', String(profile.leftChoices))}
          {row('→ Right', String(profile.rightChoices))}

          <tr><td colSpan={2} style={{ paddingTop: 6, paddingBottom: 2, color: '#4b5563', fontSize: 9, letterSpacing: 2 }}>FEATURES</td></tr>
          {row('leftRatio', fmt(features.leftRatio))}
          {row('jumpRate', fmt(features.jumpRate) + '/10s')}
          {row('hesitation', fmt(features.medianHesitationMs, 0) + 'ms')}
          {row('repeatScore', fmt(features.repeatScore))}
          {row('exploreScore', fmt(features.exploreScore))}
          {row('rushScore', fmt(features.rushScore))}

          <tr><td colSpan={2} style={{ paddingTop: 6, paddingBottom: 2, color: '#4b5563', fontSize: 9, letterSpacing: 2 }}>ACTIVE TRAITS</td></tr>
          <tr>
            <td colSpan={2} style={{ color: activeTraits.length ? '#10b981' : '#4b5563' }}>
              {activeTraits.length
                ? activeTraits.map(t => `${t.id} (${fmt(t.confidence)})`).join(', ')
                : 'none yet'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
