'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipos de idiomas suportados
export type Language = 'pt-BR' | 'en' | 'es' | 'de' | 'fr';

// Informações de cada idioma
export const LANGUAGES: Record<Language, { name: string; flag: string; nativeName: string }> = {
  'pt-BR': { name: 'Português', flag: '🇧🇷', nativeName: 'Português (Brasil)' },
  'en': { name: 'English', flag: '🇺🇸', nativeName: 'English' },
  'es': { name: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  'de': { name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
  'fr': { name: 'Français', flag: '🇫🇷', nativeName: 'Français' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Hook para usar o contexto
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Importar todas as traduções
import { translations as ptBR } from '@/lib/translations/pt-BR';
import { translations as en } from '@/lib/translations/en';
import { translations as es } from '@/lib/translations/es';
import { translations as de } from '@/lib/translations/de';
import { translations as fr } from '@/lib/translations/fr';

const allTranslations: Record<Language, Record<string, string>> = {
  'pt-BR': ptBR,
  'en': en,
  'es': es,
  'de': de,
  'fr': fr,
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('pt-BR');
  const [mounted, setMounted] = useState(false);

  // Carregar idioma salvo do localStorage
  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('vivalavida-language') as Language;
    if (savedLang && LANGUAGES[savedLang]) {
      setLanguageState(savedLang);
    } else {
      // Detectar idioma do navegador
      const browserLang = navigator.language;
      if (browserLang.startsWith('pt')) {
        setLanguageState('pt-BR');
      } else if (browserLang.startsWith('es')) {
        setLanguageState('es');
      } else if (browserLang.startsWith('de')) {
        setLanguageState('de');
      } else if (browserLang.startsWith('fr')) {
        setLanguageState('fr');
      } else {
        setLanguageState('en');
      }
    }
  }, []);

  // Função para mudar o idioma
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vivalavida-language', lang);
  };

  // Função de tradução
  const t = (key: string): string => {
    const translations = allTranslations[language];
    return translations[key] || allTranslations['pt-BR'][key] || key;
  };

  // Evitar hydration mismatch
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: 'pt-BR', setLanguage, t: (key) => ptBR[key] || key }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

