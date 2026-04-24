'use client';

import { I18nextProvider } from 'react-i18next';
import { useEffect } from 'react';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }) {
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');

    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }

    document.documentElement.lang = i18n.language;

    const handleLanguageChange = (language) => {
      document.documentElement.lang = language;
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
