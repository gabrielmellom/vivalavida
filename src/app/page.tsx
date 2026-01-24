'use client';

import Image from 'next/image';
import { 
  Phone, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  MapPin, 
  Clock, 
  Mail, 
  Anchor, 
  Ship, 
  Waves, 
  Sun, 
  Music, 
  Utensils, 
  Shield, 
  Users, 
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Camera,
  Palmtree,
  Navigation,
  LogIn
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PublicReservationModal from '@/components/PublicReservationModal';
import LanguageSelector from '@/components/LanguageSelector';
import { useSiteConfig, DEFAULT_SITE_CONFIG, DEFAULT_TOURS } from '@/lib/useSiteConfig';
import { TourConfig, SiteConfig } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

// Interface para props compartilhadas entre componentes
interface SharedProps {
  tours: TourConfig[];
  siteConfig: SiteConfig | null;
  getWhatsAppLink: (message?: string) => string;
  getCurrentPrice: (tour: TourConfig) => { adult: number; child: number; label: string } | null;
  t: (key: string) => string;
  openReservationModal?: (tourType?: 'panoramico' | 'desembarque') => void;
}

// Header Component
function Header({ siteConfig, getWhatsAppLink, t }: SharedProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: t('nav.home'), href: '#inicio' },
    { label: t('nav.tours'), href: '#passeios' },
    { label: t('nav.routes'), href: '#roteiros' },
    { label: t('nav.about'), href: '#sobre' },
    { label: t('nav.contact'), href: '#contato' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' 
        : 'bg-black/30 backdrop-blur-md py-4'
    }`}>
      {/* Main nav */}
      <div className="container mx-auto px-4">
        {/* Mobile Nav - Logo centralizada */}
        <nav className="lg:hidden flex items-center justify-between py-2">
          {/* Mobile menu button - left com largura fixa para balancear */}
          <div className="w-24 flex justify-start">
            <button 
              className="z-10 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className={`w-6 h-0.5 transition-all duration-300 ${scrolled ? 'bg-viva-blue-dark' : 'bg-white'} ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-6 h-0.5 mt-1.5 transition-all duration-300 ${scrolled ? 'bg-viva-blue-dark' : 'bg-white'} ${menuOpen ? 'opacity-0' : ''}`} />
              <div className={`w-6 h-0.5 mt-1.5 transition-all duration-300 ${scrolled ? 'bg-viva-blue-dark' : 'bg-white'} ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>

          {/* Logo - centered */}
          <a href="#inicio" className="z-10 flex-shrink-0">
            <Image 
              src="/imagemlogo1.png" 
              alt="Viva la Vida" 
              width={scrolled ? 110 : 130} 
              height={scrolled ? 44 : 52}
              className="transition-all duration-300"
              style={{ width: scrolled ? '110px' : '130px', height: 'auto' }}
            />
          </a>

          {/* Language selector - right com largura fixa para balancear */}
          <div className="w-24 flex justify-end z-10">
            <LanguageSelector variant={scrolled ? 'light' : 'dark'} compact />
          </div>
        </nav>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center justify-between">
          {/* Logo */}
          <a href="#inicio" className="relative z-10">
            <Image 
              src="/imagemlogo1.png" 
              alt="Viva la Vida" 
              width={scrolled ? 140 : 180} 
              height={scrolled ? 56 : 72}
              className="transition-all duration-300"
            />
          </a>

          {/* Desktop Navigation */}
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <a 
                  href={item.href}
                  className={`px-4 py-2 rounded-full font-semibold transition-all duration-300 ${
                    scrolled 
                      ? 'text-viva-blue-dark hover:bg-viva-blue/10 hover:text-viva-blue' 
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a 
                href="/login"
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-300 ${
                  scrolled 
                    ? 'text-viva-blue-dark hover:bg-viva-blue/10 hover:text-viva-blue' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <LogIn size={18} />
                {t('nav.login')}
              </a>
            </li>
            {/* Language Selector - Desktop */}
            <li>
              <LanguageSelector variant={scrolled ? 'light' : 'dark'} />
            </li>
          </ul>

          {/* CTA Button - Desktop */}
          <a 
            href={getWhatsAppLink()}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 shimmer ${
              scrolled 
                ? 'bg-gradient-to-r from-viva-orange to-viva-yellow text-white hover:shadow-lg hover:scale-105' 
                : 'bg-white text-viva-blue-dark hover:bg-viva-yellow'
            }`}
          >
            <MessageCircle size={18} />
            {t('nav.bookNow')}
          </a>
        </nav>

        {/* Mobile Menu */}
        <div className={`lg:hidden transition-all duration-500 overflow-hidden ${menuOpen ? 'max-h-[500px] py-4' : 'max-h-0'}`}>
          <ul className="flex flex-col gap-2 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl">
            {navItems.map((item) => (
              <li key={item.href}>
                <a 
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-viva-blue-dark font-semibold hover:bg-viva-blue/10 rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a 
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-viva-blue-dark font-semibold hover:bg-viva-blue/10 rounded-lg transition-colors"
              >
                <LogIn size={18} />
                {t('nav.login')}
              </a>
            </li>
            <li className="mt-2">
              <a 
                href={getWhatsAppLink()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-bold"
              >
                <MessageCircle size={18} />
                {t('nav.bookNow')}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

// Hero Section with Fixed Video Background
function Hero({ siteConfig, getWhatsAppLink, t, openReservationModal }: SharedProps & { openReservationModal?: (tourType?: 'panoramico' | 'desembarque') => void }) {
  return (
    <>
      {/* Fixed Video Background - Fica fixo enquanto o conteúdo rola */}
      <div className="fixed inset-0 w-screen max-w-[100vw] h-[100svh] overflow-hidden z-0">
        {/* Fallback gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-viva-blue-navy via-viva-blue-dark to-viva-teal" />
        
        {/* Video */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videoback.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Hero Content Section - Rola sobre o vídeo */}
      <section id="inicio" className="relative min-h-screen flex items-center justify-center z-10">
        {/* Animated floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-viva-yellow/30 rounded-full blur-xl floating" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-32 h-32 bg-viva-orange/30 rounded-full blur-xl floating" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-viva-green/30 rounded-full blur-xl floating" style={{ animationDelay: '4s' }} />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center pt-40 sm:pt-44 pb-16 sm:pb-20">
          <div className="max-w-5xl mx-auto">
            {/* Badge - menor no mobile */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 sm:px-6 py-2 mb-6 sm:mb-8 animate-fade-in-up mt-6 sm:mt-0">
              <Sparkles className="text-viva-yellow" size={16} />
              <span className="text-white font-medium text-xs sm:text-sm">{t('hero.badge')}</span>
            </div>

            {/* Main heading - responsivo com animação */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-tight drop-shadow-lg" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span className="inline-block opacity-0 animate-word-appear" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                {t('hero.title1')}
              </span>{' '}
              <span className="inline-block opacity-0 animate-word-appear" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                {t('hero.title2')}
              </span>
              <span className="block gradient-text opacity-0 animate-word-appear" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
                {t('hero.title3')}
              </span>
              <span className="block text-viva-yellow opacity-0 animate-word-appear drop-shadow-lg" style={{ animationDelay: '1.1s', animationFillMode: 'forwards' }}>
                {t('hero.title4')}
              </span>
            </h1>

            {/* Subheading - texto menor no mobile */}
            <p className="text-base sm:text-lg md:text-xl text-white max-w-3xl mx-auto mb-6 sm:mb-8 px-2 animate-fade-in-up drop-shadow-md" style={{ animationDelay: '0.4s' }}>
              {t('hero.subtitle')} <strong className="text-viva-yellow">{t('hero.boatName')}</strong> {t('hero.and')} 
              <strong className="text-viva-yellow"> {t('hero.island')}</strong>!
              <br className="hidden sm:block" />
              <span className="text-viva-green"> {t('hero.activities')}</span> {t('hero.andMore')}
            </p>


            {/* CTAs - GRANDE e fácil de tocar no mobile */}
            <div className="flex flex-col gap-3 sm:gap-4 px-2 sm:px-0 mb-8 sm:mb-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <a 
                href={getWhatsAppLink(t('whatsapp.moreInfo'))}
                className="group relative bg-gradient-to-r from-green-500 to-green-600 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-full font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-500/30 active:scale-95 transition-all shimmer"
              >
                <MessageCircle size={24} />
                {t('hero.ctaWhatsapp')}
              </a>
              <a
                href="#passeios"
                className="bg-viva-yellow text-viva-blue-dark px-6 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-full font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl shadow-viva-yellow/30 active:scale-95 transition-all hover:brightness-105"
              >
                {t('nav.bookNow')}
              </a>
              <a 
                href="#detalhes"
                className="bg-white/20 backdrop-blur-sm border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-full font-bold text-base sm:text-lg flex items-center justify-center gap-2 active:bg-white active:text-viva-blue-dark transition-all"
              >
                {t('hero.ctaTours')}
                <ChevronDown size={20} />
              </a>
            </div>

            {/* Trust badges - grid no mobile */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-8 mt-10 sm:mt-16 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-white drop-shadow-md">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="text-viva-yellow fill-viva-yellow sm:w-[18px] sm:h-[18px]" />
                  ))}
                </div>
                <span className="font-semibold text-xs sm:text-base">5.0 {t('hero.google')}</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-white/30" />
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-white drop-shadow-md">
                <Shield size={18} className="text-viva-green sm:w-5 sm:h-5" />
                <span className="font-semibold text-xs sm:text-base">{t('hero.safe')}</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-white/30" />
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-white drop-shadow-md">
                <Users size={18} className="text-viva-yellow sm:w-5 sm:h-5" />
                <span className="font-semibold text-xs sm:text-base">{t('hero.clients')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <ChevronDown size={32} className="text-white/60 drop-shadow-lg" />
        </div>

        {/* Scroll indicator arrow - sem wave para continuar o vídeo */}
      </section>
    </>
  );
}

// Features Section - Chamada para os roteiros (com dados dinâmicos)
function Features({ tours, getWhatsAppLink, t, openReservationModal }: { tours: TourConfig[]; getWhatsAppLink: (msg?: string) => string; t: (key: string) => string; openReservationModal: (tourType?: 'panoramico' | 'desembarque') => void }) {
  const [selectedTour, setSelectedTour] = useState<TourDetail | null>(null);

  // Encontrar passeios ou usar defaults
  const tourPanoramico = tours.find(t => t.type === 'panoramico');
  const tourDesembarque = tours.find(t => t.type === 'desembarque');
  
  // Preços atuais
  const precoPanoramico = tourPanoramico?.pricing.find(p => p.isCurrent)?.adultPrice || DEFAULT_TOURS.panoramico.currentPrice;
  const precoDesembarque = tourDesembarque?.pricing.find(p => p.isCurrent)?.adultPrice || DEFAULT_TOURS.desembarque.currentPrice;

  const toDetail = (tour: TourConfig | null, fallback: 'panoramico' | 'desembarque'): TourDetail => {
    const fb = DEFAULT_TOURS[fallback];
    const currentPrice = tour?.pricing?.find(p => p.isCurrent && p.isActive) || tour?.pricing?.find(p => p.isActive);
    const price = currentPrice?.adultPrice ?? fb.currentPrice;
    const priceLabel = currentPrice?.label ?? 'A partir de';

    const name =
      fallback === 'panoramico'
        ? tour?.name || 'Ilha do Campeche com Atividades (Sem Desembarque)'
        : tour?.name || 'Passeio com Desembarque na Ilha do Campeche';

    return {
      id: tour?.id || `${fallback}-default`,
      name,
      subtitle: tour?.subtitle || 'Ilha do Campeche',
      duration: tour?.duration || fb.duration,
      images: tour?.images?.length ? tour.images : ['/panoramico1.jpeg', '/panoramico2.jpeg', '/panoramico3.jpeg', '/panoramico4.jpeg'],
      description:
        tour?.description ||
        (fallback === 'panoramico'
          ? 'Passeio até a Ilha do Campeche com atividades a bordo, comida e bebida inclusos. Sem desembarque na praia.'
          : 'Desembarque na Ilha do Campeche e aproveite algumas horas em terra para explorar praias de areia branca e águas cristalinas.'),
      price,
      priceLabel,
      emoji: tour?.emoji || (fallback === 'panoramico' ? '🚤' : '🏝️'),
      features: tour?.features || [],
      drinks: tour?.drinks || fb.drinks,
      food: tour?.food || fb.food,
      spots: tour?.spots || fb.spots,
      isHighlight: !!tour?.isHighlighted,
      whatsappMessage: tour?.whatsappMessage || `Olá! Quero reservar o passeio: ${name}`,
    };
  };

  const campechePanoramico = toDetail(tourPanoramico || null, 'panoramico');
  const campecheDesembarque = toDetail(tourDesembarque || null, 'desembarque');

  return (
    <section id="passeios" className="py-12 sm:py-20 bg-gradient-to-br from-viva-blue-dark via-viva-blue to-viva-blue-dark relative overflow-hidden z-10">
      {/* Background decorativo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-8xl">⭐</div>
        <div className="absolute top-20 right-20 text-6xl">🌊</div>
        <div className="absolute bottom-20 left-1/4 text-7xl">🏝️</div>
        <div className="absolute bottom-32 right-10 text-5xl">☀️</div>
      </div>
      
      <div className="container mx-auto px-3 sm:px-4 relative z-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base mb-4 sm:mb-6">
            <span>🏝️</span>
            <span>ILHA DO CAMPECHE</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight">
            Quer ir para a <span className="text-viva-yellow">Ilha do Campeche</span>?
          </h2>

          <p className="text-white/80 text-base sm:text-xl max-w-2xl mx-auto mb-6 sm:mb-8">
            Temos <strong className="text-white">2 opções</strong> de passeio para a ilha. Escolha a ideal pra você:
          </p>

          {/* Opções sempre visíveis */}
          <div className="w-full max-w-5xl mx-auto text-left mt-8 sm:mt-10">
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:gap-6">
              {[
                { tour: campechePanoramico, badge: 'SEM DESEMBARQUE', price: precoPanoramico, isRecommended: true },
                { tour: campecheDesembarque, badge: 'COM DESEMBARQUE', price: precoDesembarque, isRecommended: false },
              ].map(({ tour, badge, price, isRecommended }) => (
                <div key={tour.id} className={`bg-white rounded-xl sm:rounded-2xl shadow-lg relative ${isRecommended ? 'ring-4 sm:ring-[6px] ring-yellow-400 ring-offset-2 sm:ring-offset-4 ring-offset-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.5)] overflow-visible' : 'border border-white/20 overflow-hidden'}`}>
                  {/* Badge Super Recomendado - Topo Sobreposto na Borda */}
                  {isRecommended && (
                    <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 z-30">
                      <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-amber-900 font-black text-[10px] sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-2xl animate-pulse border-2 border-white whitespace-nowrap">
                        ⭐ MAIS VENDIDO ⭐
                      </div>
                    </div>
                  )}
                  <div className="relative aspect-square">
                    <CardCarousel images={tour.images} altText={tour.name} />
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                      <span className="inline-flex items-center gap-1 sm:gap-2 bg-viva-blue text-white font-black text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
                        <span className="hidden sm:inline">{tour.emoji}</span> {badge}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 sm:p-4 md:p-5">
                    <div className="inline-block w-full text-center py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-lg font-bold text-white text-xs sm:text-sm bg-viva-blue mb-2 sm:mb-3">
                      {tour.name}
                    </div>

                    <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
                      <p className="text-[11px] sm:text-sm"><strong className="text-viva-blue-dark">Destino:</strong> Ilha do Campeche</p>
                      <p className="text-[11px] sm:text-sm"><strong className="text-viva-blue-dark">Duração total:</strong> 6h</p>
                      <p className="font-black text-sm sm:text-lg text-viva-blue">
                        A partir de <span className="text-viva-blue-dark">R${price}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTour(tour)}
                      className="w-full bg-viva-yellow hover:bg-viva-yellow/90 text-viva-blue-dark py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-colors"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TourDetailModal
        tour={selectedTour}
        isOpen={!!selectedTour}
        onClose={() => setSelectedTour(null)}
        getWhatsAppLink={getWhatsAppLink}
        openReservationModal={openReservationModal}
      />
      
    </section>
  );
}


// Carousel Component para Tour Panorâmico
function ImageCarousel({ images: propImages, altText = 'Tour Panorâmico Viva La Vida' }: { images?: string[]; altText?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Usar imagens da prop ou fallback para imagens estáticas padrão
  const defaultImages = [
    '/panoramico1.jpeg',
    '/panoramico2.jpeg',
    '/panoramico3.jpeg',
    '/panoramico4.jpeg',
  ];
  const images = propImages && propImages.length > 0 ? propImages : defaultImages;

  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000); // Troca a cada 4 segundos

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-64 sm:h-80 lg:h-full min-h-[300px] overflow-hidden">
      {images.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`${altText} ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      
      {/* Indicadores - micro */}
      {images.length > 1 && (
        <div className="absolute bottom-1 right-1">
          <div className="flex gap-[1px] bg-black/50 rounded-full px-1 py-[2px]">
            {images.map((_, index) => (
              <span
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`block rounded-full cursor-pointer ${
                  index === currentIndex
                    ? 'bg-white w-[6px] h-[2px]'
                    : 'bg-white/60 w-[2px] h-[2px]'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Carrossel compacto para cards
function CardCarousel({ images, altText = 'Passeio' }: { images: string[]; altText?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Troca a cada 3 segundos

    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400">Sem imagem</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {images.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`${altText} ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      
      {/* Indicadores - micro */}
      {images.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <div className="flex gap-[1px] bg-black/50 rounded-full px-1 py-[2px]">
            {images.map((_, index) => (
              <span
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`block rounded-full cursor-pointer transition-all ${
                  index === currentIndex
                    ? 'bg-white w-[6px] h-[2px]'
                    : 'bg-white/60 w-[2px] h-[2px]'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de Detalhes do Passeio
interface TourDetail {
  id: string;
  name: string;
  subtitle: string;
  duration: string;
  images: string[];
  description: string;
  price: number;
  priceLabel: string;
  emoji: string;
  features: { icon: string; label: string }[];
  drinks: string;
  food: string;
  spots: string[];
  isHighlight: boolean;
  whatsappMessage: string;
}

function TourDetailModal({ 
  tour, 
  isOpen, 
  onClose, 
  getWhatsAppLink,
  openReservationModal
}: { 
  tour: TourDetail | null; 
  isOpen: boolean; 
  onClose: () => void;
  getWhatsAppLink: (msg?: string) => string;
  openReservationModal?: (tourType?: 'panoramico' | 'desembarque') => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!tour || tour.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % tour.images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [tour]);

  const handleSwipe = () => {
    if (touchStartX === null || touchEndX === null || !tour || tour.images.length <= 1) return;
    const delta = touchStartX - touchEndX;
    if (Math.abs(delta) < 40) return;
    setCurrentImageIndex((prev) => {
      if (delta > 0) {
        return (prev + 1) % tour.images.length;
      }
      return (prev - 1 + tour.images.length) % tour.images.length;
    });
    setTouchStartX(null);
    setTouchEndX(null);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentImageIndex(0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !tour || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal - layout vertical único (mobile-first) */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors text-lg"
        >
          ✕
        </button>

        {/* Imagem principal - mais quadrada e clicável */}
        <div
          className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl"
          onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
          onTouchMove={(e) => setTouchEndX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={handleSwipe}
        >
          {tour.images.map((img, idx) => (
            <img
              key={img}
              src={img}
              alt={`${tour.name} ${idx + 1}`}
              onClick={() => setImageZoomed(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 cursor-zoom-in ${
                idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          {/* Indicadores - pequenos */}
          {tour.images.length > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-[2px] bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
              {tour.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`rounded-full transition-all !min-w-0 !min-h-0 p-0 ${
                    idx === currentImageIndex ? 'bg-white w-[10px] h-[3px]' : 'bg-white/60 w-[4px] h-[4px]'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Nome do passeio */}
          <div className="absolute bottom-2 left-2">
            <span className="inline-block bg-viva-blue text-white font-bold px-2.5 py-1 rounded-lg shadow-lg text-xs">
              {tour.emoji} {tour.name}
            </span>
          </div>
        </div>

        {/* Modal de Imagem Ampliada */}
        {imageZoomed && (
          <div
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setImageZoomed(false)}
            onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
            onTouchMove={(e) => setTouchEndX(e.touches[0]?.clientX ?? null)}
            onTouchEnd={handleSwipe}
          >
            <button
              onClick={() => setImageZoomed(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors text-xl"
            >
              ✕
            </button>
            <img
              src={tour.images[currentImageIndex]}
              alt={t('tourDetails.imageAltZoomed').replace('{name}', tour.name)}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Indicadores na imagem ampliada - pequenos */}
            {tour.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-[2px] bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
                {tour.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`rounded-full transition-all !min-w-0 !min-h-0 p-0 ${
                      idx === currentImageIndex ? 'bg-white w-[10px] h-[3px]' : 'bg-white/60 w-[4px] h-[4px]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo em coluna única */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Preço + duração + info rápida */}
          <div className="rounded-xl border border-gray-100 p-3 sm:p-4 bg-gradient-to-r from-viva-blue/5 to-white">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-gray-500">{tour.priceLabel}</p>
                <p className="text-2xl sm:text-3xl font-black text-viva-blue">
                  R$ {tour.price}<span className="text-sm font-normal text-gray-500"> {t('tourDetails.perPerson')}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-500">{t('tourDetails.durationLabel')}</p>
                <p className="text-lg sm:text-xl font-bold text-viva-blue-dark">{tour.duration}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-viva-blue/10 text-viva-blue-dark px-3 py-1.5 rounded-full font-semibold">
                📍 {t('tourDetails.destinationLabel')}: {t('tourDetails.destinationValue')}
              </span>
              <span className="bg-viva-blue/10 text-viva-blue-dark px-3 py-1.5 rounded-full font-semibold">
                ⏱ {tour.duration}
              </span>
            </div>
          </div>

          {/* Descrição curta */}
          <p className="text-gray-700 text-sm leading-relaxed">{tour.description}</p>

          {/* Atividades Inclusas */}
          {tour.features.length > 0 && (
            <div className="rounded-xl border border-gray-100 p-3 sm:p-4 bg-viva-blue/5">
              <h4 className="font-bold text-viva-blue-dark mb-2 text-sm flex items-center gap-2">
                🎯 {t('tourDetails.includedActivities')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {tour.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-base">{feature.icon}</span>
                    <span>{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alimentação e bebidas */}
          <div className="rounded-xl border border-gray-100 p-3 sm:p-4 bg-viva-orange/10">
            <h4 className="font-bold text-viva-blue-dark mb-2 text-sm flex items-center gap-2">
              🍽 {t('tourDetails.foodAndDrinks')}
            </h4>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span>🍹</span>
                <span>{tour.drinks}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🍢</span>
                <span>{tour.food}</span>
              </div>
            </div>
          </div>

          {/* Roteiro */}
          {tour.spots.length > 0 && (
            <div className="rounded-xl border border-gray-100 p-3 sm:p-4 bg-viva-green/10">
              <h4 className="font-bold text-viva-blue-dark mb-2 text-sm flex items-center gap-2">
                🗺️ {t('tourDetails.visitedPlaces')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {tour.spots.map((spot, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="w-4 h-4 bg-viva-green text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    {spot}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações importantes */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <h4 className="font-bold text-amber-800 mb-2 text-sm flex items-center gap-2">
              ⚠️ {t('tourDetails.importantInfo')}
            </h4>
            <ul className="text-xs text-amber-900 space-y-1">
              <li>• {t('tourDetails.infoDoc')}</li>
              <li>• {t('tourDetails.infoBring')}</li>
              <li>• {t('tourDetails.infoNoPets')}</li>
              <li>• {t('tourDetails.infoWeather')}</li>
            </ul>
          </div>
        </div>

        {/* CTAs fixos no rodapé do modal */}
        <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 p-3 sm:p-4 rounded-b-2xl space-y-2">
          <button
            onClick={() => {
              if (!openReservationModal) {
                console.error('openReservationModal não está disponível');
                return;
              }
              // Determinar tipo de passeio baseado no nome ou emoji
              const tourType = tour.emoji === '🏝️' || tour.name.toLowerCase().includes('desembarque') 
                ? 'desembarque' 
                : 'panoramico';
              // Primeiro abre o modal de reserva
              openReservationModal(tourType);
              // Depois fecha o modal de detalhes
              setTimeout(() => {
                onClose();
              }, 50);
            }}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
          >
            {t('tourDetails.bookNow')}
          </button>
          <a
            href={getWhatsAppLink(tour.whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
          >
            <MessageCircle size={20} />
            {t('tourDetails.bookWhatsapp')}
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Tours Section - ROTEIROS VIVA LA VIDA
function Tours({ tours, getWhatsAppLink, getCurrentPrice, t, openReservationModal }: SharedProps) {
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourDetail | null>(null);

  // Lista de todos os passeios - pega do Firebase/Admin dinamicamente
  // Se não houver passeios cadastrados, usa passeios padrão
  const mainTours = tours.length > 0 
    ? tours.map((tour) => {
        const currentPrice = getCurrentPrice(tour);
        const isPanoramico = tour.type === 'panoramico';
        
        return {
          id: tour.id,
          name: tour.name,
          subtitle: tour.subtitle || '',
          duration: tour.duration || '5 horas',
          images: tour.images?.length > 0 ? tour.images : ['/panoramico1.jpeg'],
          description: tour.description || '',
          price: currentPrice?.adult || tour.pricing?.[0]?.adultPrice || 0,
          priceLabel: currentPrice?.label || 'Preço atual',
          emoji: tour.emoji || '🚤',
          features: tour.features || [],
          drinks: tour.drinks || DEFAULT_TOURS.panoramico.drinks,
          food: tour.food || DEFAULT_TOURS.panoramico.food,
          spots: tour.spots || [],
          isHighlight: isPanoramico,
          whatsappMessage: `Olá! Tenho interesse no passeio: ${tour.name}`
        };
      })
    : [
        // Passeios padrão caso não haja nenhum cadastrado
        {
          id: 'panoramico-default',
          name: DEFAULT_TOURS.panoramico.name,
          subtitle: 'Viva La Vida',
          duration: DEFAULT_TOURS.panoramico.duration,
          images: ['/panoramico1.jpeg', '/panoramico2.jpeg', '/panoramico3.jpeg'],
          description: 'A experiência mais completa! 3 horas em frente à Ilha do Campeche com diversas atividades na água!',
          price: DEFAULT_TOURS.panoramico.currentPrice,
          priceLabel: 'Preço atual',
          emoji: DEFAULT_TOURS.panoramico.emoji,
          features: [],
          drinks: DEFAULT_TOURS.panoramico.drinks,
          food: DEFAULT_TOURS.panoramico.food,
          spots: DEFAULT_TOURS.panoramico.spots,
          isHighlight: true,
          whatsappMessage: t('whatsapp.bookPanoramic')
        },
        {
          id: 'desembarque-default',
          name: DEFAULT_TOURS.desembarque.name,
          subtitle: 'Ilha do Campeche',
          duration: DEFAULT_TOURS.desembarque.duration,
          images: ['/panoramico4.jpeg'],
          description: 'Desembarque na ilha e explore por 3 horas! Praias de areia branca, águas cristalinas.',
          price: DEFAULT_TOURS.desembarque.currentPrice,
          priceLabel: 'Preço atual',
          emoji: DEFAULT_TOURS.desembarque.emoji,
          features: [],
          drinks: DEFAULT_TOURS.desembarque.drinks,
          food: DEFAULT_TOURS.desembarque.food,
          spots: DEFAULT_TOURS.desembarque.spots,
          isHighlight: false,
          whatsappMessage: t('whatsapp.bookLanding')
        }
      ];

  return (
    <section id="detalhes" className="py-12 sm:py-20 relative z-10 overflow-hidden">
      {/* Video de fundo */}
      <div className="absolute inset-0">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videoback.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <span className="inline-block bg-viva-blue/90 backdrop-blur-sm text-white font-bold px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm mb-3 sm:mb-4 shadow-lg">
            {t('tours.badge')}
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {t('tours.title')} <span className="text-viva-yellow drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('tours.titleHighlight')}</span>
          </h2>
          <p className="text-white text-sm sm:text-lg px-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {t('tours.subtitle')}
          </p>
        </div>

        {/* Cards de Passeios - Layout estilo referência */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto">
          {mainTours.map((tour) => (
            <div key={tour.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all">
              {/* Carrossel de Imagens */}
              <div className="relative aspect-square rounded-xl overflow-hidden mb-4 shadow-md">
                <CardCarousel images={tour.images} altText={tour.name} />
              </div>

              {/* Título em Badge */}
              <div className="mb-4">
                <div className="inline-block w-full text-center py-2.5 px-4 rounded-lg font-bold text-white text-sm bg-viva-blue">
                  {tour.name}
                </div>
              </div>

              {/* Informações */}
              <div className="space-y-2 text-sm text-center mb-4">
                <p className="text-gray-700">
                  <span className="text-viva-blue">⏱</span> <strong className="text-viva-blue-dark">{t('tours.cardDurationLabel')}:</strong> {tour.duration}
                </p>
                <p className="text-gray-700">
                  <span className="text-viva-orange">🍹</span> <strong className="text-viva-blue-dark">{t('tours.cardDrinksLabel')}:</strong> {tour.drinks}
                </p>
                <p className="text-gray-700">
                  <span className="text-viva-orange">🍽</span> <strong className="text-viva-blue-dark">{t('tours.cardFoodLabel')}:</strong> {tour.food}
                </p>
              </div>

              {/* Roteiro - Lista de locais */}
              <div className="text-center text-xs text-gray-600 mb-4 leading-relaxed">
                {tour.spots.map((spot, idx) => (
                  <span key={idx}>
                    {spot}
                    {idx < tour.spots.length - 1 && <br />}
                  </span>
                ))}
              </div>

              {/* Botão CTA */}
              <button
                onClick={() => setSelectedTour(tour)}
                className="w-full bg-viva-yellow hover:bg-viva-yellow/90 text-viva-blue-dark py-3 rounded-lg font-bold text-sm transition-colors"
              >
                {t('tours.viewTour')}
              </button>
            </div>
          ))}
        </div>


        {/* Info importante */}
        <div className="mt-8 sm:mt-12 bg-viva-blue-dark/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl">
          <h4 className="font-bold text-white mb-3 text-sm sm:text-base">{t('info.title')}</h4>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs sm:text-sm text-white/90">
            <li>• {t('info.doc')}</li>
            <li>• {t('info.bring')}</li>
            <li>• {t('info.noPets')}</li>
            <li>• {t('info.noSmoke')}</li>
          </ul>
        </div>
      </div>

      {/* Modal de Reserva */}
      <PublicReservationModal
        isOpen={showReservationModal}
        onClose={() => setShowReservationModal(false)}
      />

      {/* Modal de Detalhes do Passeio */}
      <TourDetailModal
        tour={selectedTour}
        isOpen={!!selectedTour}
        onClose={() => setSelectedTour(null)}
        getWhatsAppLink={getWhatsAppLink}
        openReservationModal={openReservationModal}
      />
    </section>
  );
}

// Galeria de Fotos com Carrossel 3D
function Routes({ siteConfig, getWhatsAppLink, t }: SharedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = siteConfig?.galleryImages && siteConfig.galleryImages.length > 0 
    ? siteConfig.galleryImages 
    : DEFAULT_SITE_CONFIG.galleryImages;

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Calcula índices para as 3 imagens visíveis
  const getVisibleIndex = (offset: number) => {
    return (currentIndex + offset + images.length) % images.length;
  };

  const prevIndex = getVisibleIndex(-1);
  const nextIndex = getVisibleIndex(1);

  return (
    <section id="roteiros" className="py-12 sm:py-16 relative overflow-hidden z-10 bg-viva-blue-navy">
      <div className="container mx-auto px-4">
        {/* Título */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-2">
            {t('gallery.title')} <span className="text-viva-yellow">{t('gallery.titleHighlight')}</span>
          </h2>
          <p className="text-white/70 text-sm sm:text-base">{t('gallery.subtitle')}</p>
        </div>

        {/* Carrossel 3D */}
        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-2 sm:gap-4 h-[280px] sm:h-[350px] md:h-[450px]">
            
            {/* Imagem Esquerda */}
            <button
              onClick={() => setCurrentIndex(prevIndex)}
              className="relative w-[18%] sm:w-[22%] h-[65%] rounded-xl overflow-hidden opacity-40 hover:opacity-60 transition-all duration-500 transform scale-90 hover:scale-95 shadow-lg hidden sm:block"
            >
              <img
                src={images[prevIndex]}
                alt={`Galeria ${prevIndex + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </button>

            {/* Imagem Central (Principal) */}
            <div className="relative w-[90%] sm:w-[56%] h-full rounded-2xl overflow-hidden shadow-2xl z-10 ring-4 ring-white/20">
              <img
                src={images[currentIndex]}
                alt={`Galeria ${currentIndex + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Gradiente inferior */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Imagem Direita */}
            <button
              onClick={() => setCurrentIndex(nextIndex)}
              className="relative w-[18%] sm:w-[22%] h-[65%] rounded-xl overflow-hidden opacity-40 hover:opacity-60 transition-all duration-500 transform scale-90 hover:scale-95 shadow-lg hidden sm:block"
            >
              <img
                src={images[nextIndex]}
                alt={`Galeria ${nextIndex + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </button>
          </div>

          {/* Botões de navegação */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex(prevIndex)}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setCurrentIndex(nextIndex)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={14} className="sm:w-4 sm:h-4" />
              </button>
            </>
          )}

          {/* Indicadores */}
          {images.length > 1 && (
            <div className="flex justify-center gap-[3px] sm:gap-1 mt-3 sm:mt-4">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex 
                      ? 'bg-viva-yellow w-3 sm:w-5 h-1 sm:h-1.5' 
                      : 'bg-white/30 hover:bg-white/50 w-1 sm:w-1.5 h-1 sm:h-1.5'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <a 
            href={getWhatsAppLink(t('whatsapp.moreInfo'))}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-full font-bold text-sm sm:text-base shadow-lg active:scale-95 transition-all"
          >
            <MessageCircle size={20} />
            Quero Reservar!
          </a>
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function Testimonials({ siteConfig, t }: SharedProps) {
  const testimonials = [
    {
      name: 'Victor Sbeghen',
      date: '12/01/2025',
      text: 'Top! Passeio na Ilha do Campeche muito bom e valor ótimo! Super recomendo!',
      rating: 5,
    },
    {
      name: 'Aline Gomes',
      date: '12/01/2025',
      text: 'Foi incrível! Super cuidadoso e atencioso. Eu amei e super recomendo!',
      rating: 5,
    },
    {
      name: 'Lindsay Sakuma',
      date: '06/12/2024',
      text: 'Passeio muito legal! Além de fazer um churrasco maravilhoso! As praias são super bonitas e limpas. Ótima experiência!',
      rating: 5,
    },
    {
      name: 'Deivid Henrique',
      date: '01/02/2024',
      text: 'Passamos um excelente momento em família. Lancha perfeita para um belo passeio. Vale a pena passar o dia entre família e amigos!',
      rating: 5,
    },
  ];

  return (
    <section className="py-12 sm:py-20 bg-gradient-to-br from-gray-50 to-orange-50 relative z-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 sm:mb-12">
          <span className="inline-block bg-viva-yellow/20 text-viva-orange font-bold px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm mb-3 sm:mb-4">
            {t('testimonials.badge')}
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-viva-blue-dark mb-2 sm:mb-4">
            <span className="gradient-text">{t('testimonials.title')}</span>
          </h2>
        </div>

        {/* Cards (sem scroll horizontal no mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-viva-orange to-viva-yellow rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                  {testimonial.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-viva-blue-dark text-sm sm:text-base">{testimonial.name}</h4>
                  <p className="text-gray-400 text-xs sm:text-sm">{testimonial.date}</p>
                </div>
              </div>
              <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={14} className="text-viva-yellow fill-viva-yellow sm:w-4 sm:h-4" />
                ))}
              </div>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-3 sm:line-clamp-none">{testimonial.text}</p>
            </div>
          ))}
        </div>

        {/* Google rating - compacto no mobile */}
        <div className="text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-white rounded-2xl sm:rounded-full px-5 sm:px-8 py-3 sm:py-4 shadow-lg">
            <div className="flex items-center gap-1">
              <span className="text-xl sm:text-2xl font-black text-viva-blue-dark">5.0</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-viva-yellow fill-viva-yellow sm:w-5 sm:h-5" />
                ))}
              </div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-gray-600 text-xs sm:text-base"><strong>{siteConfig?.googleReviews || DEFAULT_SITE_CONFIG.googleReviews} {t('testimonials.reviews')}</strong> {t('testimonials.onGoogle')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// About Section
function About({ siteConfig, getWhatsAppLink, t }: SharedProps) {
  return (
    <section id="sobre" className="py-12 sm:py-20 bg-white relative z-10">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Imagem primeiro no mobile */}
          <div className="relative order-1 lg:order-2">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl">
              <img 
                src="/cadastur.jpg"
                alt="Cadastur - Fazendo o turismo legal"
                className="w-full h-[250px] sm:h-[500px] object-contain bg-white"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-viva-blue-dark/50 to-transparent" />
            </div>
            
          </div>

          {/* Texto */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <span className="inline-block bg-viva-blue/10 text-viva-blue font-bold px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm mb-3 sm:mb-4">
              {t('about.badge')}
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-viva-blue-dark mb-4 sm:mb-6">
              {t('about.title')} <span className="gradient-text">{t('about.titleHighlight')}</span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-lg mb-4 sm:mb-6 leading-relaxed">
              {t('about.description')} 
              <strong className="text-viva-blue"> {t('about.descHighlight')}</strong> {t('about.descEnd')}
            </p>

            {/* Stats grid - mais compacto no mobile */}
            <div className="grid grid-cols-4 sm:grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-viva-orange/10 to-viva-yellow/10 rounded-xl p-2 sm:p-4">
                <div className="text-xl sm:text-3xl font-black text-viva-orange">500+</div>
                <div className="text-gray-600 text-[10px] sm:text-sm">{t('about.clients')}</div>
              </div>
              <div className="bg-gradient-to-br from-viva-blue/10 to-viva-teal/10 rounded-xl p-2 sm:p-4">
                <div className="text-xl sm:text-3xl font-black text-viva-blue">5.0</div>
                <div className="text-gray-600 text-[10px] sm:text-sm">Google</div>
              </div>
              <div className="bg-gradient-to-br from-viva-green/10 to-viva-teal/10 rounded-xl p-2 sm:p-4">
                <div className="text-xl sm:text-3xl font-black text-viva-green">2</div>
                <div className="text-gray-600 text-[10px] sm:text-sm">{t('about.routes')}</div>
              </div>
              <div className="bg-gradient-to-br from-viva-blue-dark/10 to-viva-blue/10 rounded-xl p-2 sm:p-4">
                <div className="text-xl sm:text-3xl font-black text-viva-blue-dark">10+</div>
                <div className="text-gray-600 text-[10px] sm:text-sm">{t('about.routes')}</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <a 
                href={getWhatsAppLink()}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-full font-bold active:scale-95 transition-all shadow-lg"
              >
                <MessageCircle size={20} />
                {t('about.contactUs')}
              </a>
              <a 
                href="#contato"
                className="flex items-center justify-center gap-2 bg-viva-blue/10 text-viva-blue-dark px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-full font-bold active:bg-viva-blue/20 transition-colors"
              >
                <MapPin size={20} />
                {t('about.ourLocation')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Final CTA Section
function FinalCTA({ getWhatsAppLink, t }: SharedProps) {
  return (
    <section className="py-12 sm:py-20 bg-gradient-to-r from-viva-orange via-viva-yellow to-viva-green relative overflow-hidden z-10">
      {/* Background pattern - esconde no mobile */}
      <div className="absolute inset-0 opacity-20 hidden sm:block">
        <div className="absolute top-10 left-10 floating">
          <Sun size={60} className="text-white" />
        </div>
        <div className="absolute bottom-10 right-10 floating" style={{ animationDelay: '2s' }}>
          <Anchor size={80} className="text-white" />
        </div>
        <div className="absolute top-1/2 left-1/3 floating" style={{ animationDelay: '1s' }}>
          <Waves size={50} className="text-white" />
        </div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-white mb-4 sm:mb-6">
          {t('cta.title')}
        </h2>
        <p className="text-white/90 text-sm sm:text-xl mb-6 sm:mb-10 max-w-2xl mx-auto px-2">
          {t('cta.subtitle')}
          <br />
          <strong>{t('cta.support')}</strong>
        </p>
        <a 
          href={getWhatsAppLink(t('whatsapp.book'))}
          className="inline-flex items-center gap-2 sm:gap-3 bg-white text-viva-blue-dark px-8 sm:px-12 py-4 sm:py-6 rounded-2xl sm:rounded-full font-black text-lg sm:text-2xl shadow-xl active:scale-95 transition-all"
        >
          <MessageCircle size={28} />
          {t('cta.book')}
        </a>
      </div>
    </section>
  );
}

// Footer
function Footer({ siteConfig, getWhatsAppLink, t }: SharedProps) {
  const whatsappNumber = siteConfig?.whatsappNumber || DEFAULT_SITE_CONFIG.whatsappNumber;
  const displayPhone = siteConfig?.phone || DEFAULT_SITE_CONFIG.phone;
  const email = siteConfig?.email || DEFAULT_SITE_CONFIG.email;
  const instagramUrl = siteConfig?.instagramUrl || DEFAULT_SITE_CONFIG.instagramUrl;
  const facebookUrl = siteConfig?.facebookUrl || DEFAULT_SITE_CONFIG.facebookUrl;

  return (
    <footer id="contato" className="bg-viva-blue-navy text-white relative z-10">
      <div className="container mx-auto px-4 py-8">
        
        {/* Mapa - largura total no mobile */}
        <div className="mb-6 sm:hidden">
          <div className="w-full aspect-square rounded-xl overflow-hidden shadow-lg">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3536.5!2d-48.4235!3d-27.5742!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9527438a43fbe9e7%3A0x2a9d9c4c9e4b9c9c!2sR.%20Amaro%20Coelho%2C%2022%20-%20Barra%20da%20Lagoa%2C%20Florian%C3%B3polis%20-%20SC%2C%2088061-090!5e0!3m2!1spt-BR!2sbr!4v1704825600000!5m2!1spt-BR!2sbr"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              title="Localização"
            />
          </div>
        </div>

        {/* Grid compacto */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 items-start">
          
          {/* Logo - esconde no mobile */}
          <div className="hidden sm:block sm:col-span-1">
            <Image 
              src="/imagemlogo1.png" 
              alt="Viva la Vida" 
              width={140} 
              height={56}
              className="bg-white rounded-lg p-2"
            />
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white text-sm mb-2">Links</h4>
            <div className="flex flex-col gap-1 text-xs">
              <a href="#inicio" className="text-white/70 hover:text-white">{t('nav.home')}</a>
              <a href="#passeios" className="text-white/70 hover:text-white">{t('nav.tours')}</a>
              <a href="#sobre" className="text-white/70 hover:text-white">{t('nav.about')}</a>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-bold text-white text-sm mb-2">Contato</h4>
            <div className="flex flex-col gap-1 text-xs text-white/70">
              <a href={`tel:+55${whatsappNumber}`} className="hover:text-white flex items-center gap-1">
                <Phone size={12} /> {displayPhone}
              </a>
              <a href={`mailto:${email}`} className="hover:text-white flex items-center gap-1 break-all">
                <Mail size={12} className="shrink-0" /> <span className="truncate">{email}</span>
              </a>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h4 className="font-bold text-white text-sm mb-2">Endereço</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              R. Amaro Coelho, 22<br/>Barra da Lagoa<br/>Florianópolis/SC
            </p>
          </div>

          {/* Mapa - só aparece no desktop */}
          <div className="hidden lg:block">
            <h4 className="font-bold text-white text-sm mb-2">Mapa</h4>
            <div className="w-full aspect-square max-w-[120px] rounded-lg overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3536.5!2d-48.4235!3d-27.5742!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9527438a43fbe9e7%3A0x2a9d9c4c9e4b9c9c!2sR.%20Amaro%20Coelho%2C%2022%20-%20Barra%20da%20Lagoa%2C%20Florian%C3%B3polis%20-%20SC%2C%2088061-090!5e0!3m2!1spt-BR!2sbr!4v1704825600000!5m2!1spt-BR!2sbr"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title="Localização"
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
          <p className="text-white/50 text-xs">{t('footer.rights')}</p>
          
          {/* Redes + Cadastur */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <a href={getWhatsAppLink()} className="w-8 h-8 bg-white/10 hover:bg-green-500 rounded-full flex items-center justify-center transition-colors">
                <MessageCircle size={14} />
              </a>
              <a href={instagramUrl} className="w-8 h-8 bg-white/10 hover:bg-pink-500 rounded-full flex items-center justify-center transition-colors">
                <Instagram size={14} />
              </a>
              <a href={facebookUrl} className="w-8 h-8 bg-white/10 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors">
                <Facebook size={14} />
              </a>
            </div>
            <Image 
              src="/cadastur.jpg" 
              alt="Cadastur" 
              width={80} 
              height={32} 
              className="h-6 w-auto bg-white rounded px-1"
            />
          </div>
        </div>
      </div>

    </footer>
  );
}

// Splash Screen Component
function SplashScreen({ onComplete, t }: { onComplete: () => void; t: (key: string) => string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // 2.5 segundos para dar tempo de ler a frase
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-viva-blue-dark via-viva-blue to-viva-blue-dark flex items-center justify-center">
      {/* Ondas decorativas de fundo */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-viva-yellow/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Logo container + Tagline */}
      <div className="relative animate-splash-logo flex flex-col items-center">
        <Image 
          src="/imagemlogo1.png" 
          alt="Viva la Vida" 
          width={400} 
          height={160}
          className="w-72 sm:w-96 md:w-[450px] h-auto drop-shadow-2xl"
          priority
        />
        {/* Tagline */}
        <p 
          className="mt-6 text-white/90 text-[11px] sm:text-base md:text-lg font-medium text-center px-4 opacity-0 whitespace-nowrap"
          style={{ 
            animation: 'fadeIn 1s ease-out 0.5s forwards'
          }}
        >
          ⭐ {t('splash.tagline')} ⭐
        </p>
      </div>
      
      {/* Texto de loading */}
      <div className="absolute bottom-20 flex items-center gap-2 text-white/60">
        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

// Main Page Component
export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [preselectedTourType, setPreselectedTourType] = useState<'panoramico' | 'desembarque' | null>(null);
  
  // Carregar configurações dinâmicas do site
  const { tours, siteConfig, loading, getWhatsAppLink, getCurrentPrice } = useSiteConfig();
  
  // Hook de internacionalização
  const { t } = useLanguage();

  const handleSplashComplete = () => {
    setShowSplash(false);
    // Pequeno delay para começar a animação do conteúdo
    setTimeout(() => setIsVisible(true), 100);
  };

  const openReservationModal = (tourType?: 'panoramico' | 'desembarque') => {
    setPreselectedTourType(tourType || null);
    setShowReservationModal(true);
  };

  // Props compartilhadas para todos os componentes
  const sharedProps = {
    tours,
    siteConfig,
    getWhatsAppLink,
    getCurrentPrice,
    t,
    openReservationModal,
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} t={t} />}
      <main className={`transition-opacity duration-500 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <Header {...sharedProps} />
        <Hero {...sharedProps} />
        <Features tours={tours} getWhatsAppLink={getWhatsAppLink} t={t} openReservationModal={openReservationModal} />
        <Tours {...sharedProps} />
        <Routes {...sharedProps} />
        <Testimonials {...sharedProps} />
        <About {...sharedProps} />
        <FinalCTA {...sharedProps} />
        <Footer {...sharedProps} />
        <PublicReservationModal
          isOpen={showReservationModal}
          onClose={() => {
            setShowReservationModal(false);
            setPreselectedTourType(null);
          }}
          preselectedTourType={preselectedTourType}
        />
      </main>

    </>
  );
}



