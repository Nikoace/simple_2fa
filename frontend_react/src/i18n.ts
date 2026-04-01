import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';

export const LANGUAGE_STORAGE_KEY = 'simple2fa.language';
export const supportedLanguages = ['zh-CN', 'en', 'ja'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage: SupportedLanguage = supportedLanguages.includes(stored as SupportedLanguage)
    ? (stored as SupportedLanguage)
    : 'zh-CN';

void i18n
    .use(initReactI18next)
    .init({
        resources: {
            'zh-CN': { translation: zhCN },
            en: { translation: en },
            ja: { translation: ja },
        },
        lng: initialLanguage,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

i18n.on('languageChanged', (lng) => {
    if (supportedLanguages.includes(lng as SupportedLanguage)) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    }
});

export default i18n;
