'use client';

import { I18nextProvider } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <>{children}</>;

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
