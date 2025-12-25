'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage, LANGUAGES, Language } from '@/contexts/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'light' | 'dark';
  compact?: boolean;
}

export default function LanguageSelector({ variant = 'light', compact = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES[language];
  const isDark = variant === 'dark';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do seletor */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full
          transition-all duration-200 font-semibold text-xs sm:text-sm
          ${isDark 
            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' 
            : 'bg-viva-blue/10 hover:bg-viva-blue/20 text-viva-blue-dark border border-viva-blue/20'
          }
        `}
        aria-label="Selecionar idioma"
      >
        <span className="text-sm sm:text-base">🌍</span>
        <span className={compact ? 'text-[11px]' : ''}>{currentLang.name}</span>
        <ChevronDown 
          size={12} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} sm:w-[14px] sm:h-[14px]`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={`
            absolute top-full right-0 mt-2 w-48 sm:w-56
            rounded-xl overflow-hidden shadow-2xl z-[100]
            animate-fade-in-up
            ${isDark 
              ? 'bg-viva-blue-dark/95 backdrop-blur-md border border-white/20' 
              : 'bg-white border border-gray-100'
            }
          `}
          style={{ animationDuration: '0.2s' }}
        >
          {/* Lista de idiomas */}
          <div className="py-1">
            {(Object.entries(LANGUAGES) as [Language, typeof LANGUAGES[Language]][]).map(([code, lang]) => (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 sm:py-3
                  transition-all duration-150
                  ${language === code 
                    ? isDark 
                      ? 'bg-viva-yellow/20 text-viva-yellow' 
                      : 'bg-viva-blue/10 text-viva-blue'
                    : isDark 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className="text-xl sm:text-2xl">{lang.flag}</span>
                <span className="font-semibold text-sm">{lang.nativeName}</span>
                {language === code && (
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-viva-yellow/30 text-viva-yellow' : 'bg-viva-blue/20 text-viva-blue'
                  }`}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

