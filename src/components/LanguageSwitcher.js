'use client';

import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pt-BR' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      title={t('common.language')}
    >
      <span className="text-sm font-medium">
        {i18n.language === 'en' ? '🇺🇸' : '🇧🇷'}
      </span>
      <span className="text-xs">
        {i18n.language === 'en' ? 'EN' : 'PT'}
      </span>
    </button>
  );
}
