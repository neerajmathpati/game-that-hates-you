import type { Metadata } from 'next';
import { Landing } from '@/components/Landing';

export const metadata: Metadata = {
  title: 'The Game That Hates You',
  description: 'A rage platformer that learns how you play — and uses it against you.',
};

export default function HomePage() {
  return <Landing />;
}
