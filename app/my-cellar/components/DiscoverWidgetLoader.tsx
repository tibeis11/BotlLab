'use client'

import dynamic from 'next/dynamic'

// Dynamic import with ssr:false must live in a Client Component
const DiscoverWidget = dynamic(
  () => import('../../dashboard/components/DiscoverWidget'),
  { ssr: false, loading: () => <div className="h-40 bg-surface rounded-2xl animate-pulse" /> }
)

export default function DiscoverWidgetLoader() {
  return <DiscoverWidget />
}
