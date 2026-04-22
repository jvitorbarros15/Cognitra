import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../../public/locales/en/common.json';
import ptBrCommon from '../../public/locales/pt-BR/common.json';

const resources = {
  en: { common: enCommon },
  'pt-BR': { common: ptBrCommon },
};

if (!i18next.isInitialized) {
  i18next
    .use(initReactI18next)
    .init({
      resources,
      lng: typeof window !== 'undefined' ? localStorage.getItem('language') || 'en' : 'en',
      fallbackLng: 'en',
      defaultNS: 'common',
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18next;
