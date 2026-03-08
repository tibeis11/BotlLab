'use client';

import { Toaster } from 'sonner';
import { useTheme } from '@/app/context/ThemeContext';

export default function ThemedToaster() {
  const { resolved } = useTheme();

  return (
    <Toaster
      theme={resolved}
      position="top-center"
      closeButton
    />
  );
}
