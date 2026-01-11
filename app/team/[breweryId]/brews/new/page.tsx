'use client';

import { use } from 'react';
import BrewEditor from '../components/BrewEditor';

export default function NewBrewPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  return <BrewEditor breweryId={breweryId} />;
}
