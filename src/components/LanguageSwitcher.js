'use client';

import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const isEnglish = i18n.resolvedLanguage === 'en' || i18n.language === 'en';

  const toggleLanguage = () => {
    const newLang = isEnglish ? 'pt-BR' : 'en';
    localStorage.setItem('language', newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 shadow-sm transition hover:border-cyan-300/30 hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
      title={t('common.language')}
      aria-label={t('common.language')}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-300/30 bg-slate-950/60 text-[10px] font-bold text-cyan-200">
        {isEnglish ? 'EN' : 'PT'}
      </span>
      <span className="text-xs text-slate-200">
        {isEnglish ? t('common.english') : t('common.portuguese')}
      </span>
    </button>
  );
}
