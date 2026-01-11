'use client';

import { use } from 'react';
import BrewEditor from '../../components/BrewEditor';

export default function EditBrewPage({ params }: { params: Promise<{ breweryId: string, brewId: string }> }) {
  const { breweryId, brewId } = use(params);
  return <BrewEditor breweryId={breweryId} brewId={brewId} />;
}
