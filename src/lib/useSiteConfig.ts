'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TourConfig, SiteConfig } from '@/types';

interface UseSiteConfigReturn {
  tours: TourConfig[];
  siteConfig: SiteConfig | null;
  loading: boolean;
  getWhatsAppLink: (message?: string) => string;
  getCurrentPrice: (tour: TourConfig) => { adult: number; child: number; label: string } | null;
}

export function useSiteConfig(): UseSiteConfigReturn {
  const [tours, setTours] = useState<TourConfig[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Carregar passeios ativos
        const toursSnapshot = await getDocs(collection(db, 'tourConfigs'));
        const toursData = toursSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as TourConfig[];
        
        // Filtrar apenas ativos e ordenar
        const activeTours = toursData
          .filter(t => t.isActive)
          .sort((a, b) => a.order - b.order);
        
        setTours(activeTours);

        // Carregar configurações gerais
        const configSnapshot = await getDocs(collection(db, 'siteConfig'));
        if (configSnapshot.docs.length > 0) {
          const configData = configSnapshot.docs[0];
          setSiteConfig({
            id: configData.id,
            ...configData.data(),
            updatedAt: configData.data().updatedAt?.toDate(),
          } as SiteConfig);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const getWhatsAppLink = (message?: string) => {
    const phone = siteConfig?.whatsappNumber || '5548999999999';
    const encodedMessage = message ? encodeURIComponent(message) : '';
    return `https://wa.me/${phone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
  };

  const getCurrentPrice = (tour: TourConfig) => {
    const currentPricing = tour.pricing.find(p => p.isCurrent && p.isActive);
    if (!currentPricing) {
      // Fallback para primeiro preço ativo
      const firstActive = tour.pricing.find(p => p.isActive);
      if (firstActive) {
        return {
          adult: firstActive.adultPrice,
          child: firstActive.childPrice,
          label: firstActive.label,
        };
      }
      return null;
    }
    return {
      adult: currentPricing.adultPrice,
      child: currentPricing.childPrice,
      label: currentPricing.label,
    };
  };

  return {
    tours,
    siteConfig,
    loading,
    getWhatsAppLink,
    getCurrentPrice,
  };
}

// Valores padrão para quando não há config (fallback)
export const DEFAULT_SITE_CONFIG = {
  whatsappNumber: '5548991377968',
  phone: '(48) 99137-7968',
  email: 'contato@vivalavida.com.br',
  address: 'Barra da Lagoa, Florianópolis - SC',
  instagramUrl: 'https://instagram.com/vivalavida',
  facebookUrl: 'https://facebook.com/vivalavida',
  googleRating: 5.0,
  googleReviews: 400,
};

export const DEFAULT_TOURS = {
  panoramico: {
    name: 'Tour Panorâmico',
    emoji: '🚤',
    duration: '5 horas',
    currentPrice: 200,
    seasonPrice: 250,
  },
  desembarque: {
    name: 'Com Desembarque',
    emoji: '🏝️',
    duration: '7 horas',
    currentPrice: 300,
    seasonPrice: 350,
  },
};

