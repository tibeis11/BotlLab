import BottleLabelSkeleton from './components/BottleLabelSkeleton';

/**
 * Next.js Suspense Loading-Boundary für /b/[id].
 * Wird von Next.js automatisch während des Seitenladens gezeigt (Phase 1.3).
 */
export default function Loading() {
  return <BottleLabelSkeleton />;
}
