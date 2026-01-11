'use client';

import { use } from 'react';
import BrewEditor from '@/app/team/[breweryId]/brews/components/BrewEditor';

export default function NewBrewPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  return <BrewEditor breweryId={breweryId} />;
}
