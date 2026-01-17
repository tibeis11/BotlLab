'use client';

import { SessionProvider } from './SessionContext';
import { useParams } from 'next/navigation';

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  if (!sessionId) return <>{children}</>;

  return (
    <SessionProvider sessionId={sessionId}>
      {children}
    </SessionProvider>
  );
}
