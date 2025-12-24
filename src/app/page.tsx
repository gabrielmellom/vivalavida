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
  Sparkles,
  Camera,
  Palmtree,
  Navigation,
  LogIn
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
        : 'bg-transparent py-4'
    }`}>
      {/* Top bar */}
      <div className={`transition-all duration-500 ${scrolled ? 'h-0 overflow-hidden' : 'h-auto'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2 text-sm border-b border-white/20">
            {/* Redes Sociais */}
            <div className="flex items-center gap-3">
              <a href={getWhatsAppLink()} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-green-500 transition-colors">
                <MessageCircle size={16} />
              </a>
              <a href={siteConfig?.instagramUrl || DEFAULT_SITE_CONFIG.instagramUrl} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-pink-500 transition-colors">
                <Instagram size={16} />
              </a>
              <a href={siteConfig?.facebookUrl || DEFAULT_SITE_CONFIG.facebookUrl} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                <Facebook size={16} />
              </a>
            </div>
            
            {/* Language Selector + Texto central */}
            <div className="flex items-center gap-4 flex-1 justify-center">
              <p className="text-white/90 hidden md:block text-center">{t('hero.badge')}</p>
            </div>
            
            {/* Botão Reservar */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a 
                href={getWhatsAppLink()} 
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-lg"
              >
                <MessageCircle size={16} />
                <span className="hidden sm:inline">{t('nav.book')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container mx-auto px-4">
        {/* Mobile Nav - Logo centralizada */}
        <nav className="lg:hidden flex items-center justify-center relative py-2">
          {/* Mobile menu button - absolute left */}
          <button 
            className="absolute left-0 z-10 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className={`w-6 h-0.5 transition-all duration-300 ${scrolled ? 'bg-viva-blue-dark' : 'bg-white'} ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <div className={`w-6 h-0.5 mt-1.5 transition-all duration-300 ${scrolled ? 'bg-viva-blue-dark' : 'bg-white'} ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 mt-1.5 transition-all duration-300 ${scrolled ? 'bg-viva-blue-dark' : 'bg-white'} ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>

          {/* Logo - centered */}
          <a href="#inicio" className="z-10">
            <Image 
              src="/imagemlogo1.png" 
              alt="Viva la Vida" 
              width={scrolled ? 120 : 140} 
              height={scrolled ? 48 : 56}
              className="transition-all duration-300"
              style={{ width: scrolled ? '120px' : '140px', height: 'auto' }}
            />
          </a>

          {/* Language selector - absolute right (mobile) */}
          <div className="absolute right-0 z-10">
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

// Hero Section
function Hero({ siteConfig, getWhatsAppLink, t }: SharedProps) {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0">
        {/* Fallback gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-viva-blue-navy via-viva-blue-dark to-viva-teal z-0" />
        
        {/* Video */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-10"
        >
          <source src="/videoback.mp4" type="video/mp4" />
        </video>
        
        {/* Overlay gradients para melhorar legibilidade do texto */}
        <div className="absolute inset-0 bg-viva-blue-navy/40 z-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-viva-blue-navy/90 via-viva-blue-navy/30 to-transparent z-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-viva-blue-navy/50 via-transparent to-viva-blue-navy/50 z-20" />
      </div>

      {/* Animated floating elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-viva-yellow/30 rounded-full blur-xl floating z-30" style={{ animationDelay: '0s' }} />
      <div className="absolute top-40 right-20 w-32 h-32 bg-viva-orange/30 rounded-full blur-xl floating z-30" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-viva-green/30 rounded-full blur-xl floating z-30" style={{ animationDelay: '4s' }} />

      {/* Content */}
      <div className="relative z-40 container mx-auto px-4 text-center pt-40 sm:pt-44 pb-16 sm:pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Badge - menor no mobile */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 sm:px-6 py-2 mb-6 sm:mb-8 animate-fade-in-up mt-6 sm:mt-0">
            <Sparkles className="text-viva-yellow" size={16} />
            <span className="text-white font-medium text-xs sm:text-sm">{t('hero.badge')}</span>
          </div>

          {/* Main heading - responsivo com animação */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            <span className="inline-block opacity-0 animate-word-appear" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              {t('hero.title1')}
            </span>{' '}
            <span className="inline-block opacity-0 animate-word-appear" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
              {t('hero.title2')}
            </span>
            <span className="block gradient-text opacity-0 animate-word-appear" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
              {t('hero.title3')}
            </span>
            <span className="block text-viva-yellow opacity-0 animate-word-appear" style={{ animationDelay: '1.1s', animationFillMode: 'forwards' }}>
              {t('hero.title4')}
            </span>
          </h1>

          {/* Subheading - texto menor no mobile */}
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-6 sm:mb-8 px-2 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
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
              className="bg-white/20 backdrop-blur-sm border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-full font-bold text-base sm:text-lg flex items-center justify-center gap-2 active:bg-white active:text-viva-blue-dark transition-all"
            >
              {t('hero.ctaTours')}
              <ChevronDown size={20} />
            </a>
          </div>

          {/* Trust badges - grid no mobile */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-8 mt-10 sm:mt-16 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-white/80">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className="text-viva-yellow fill-viva-yellow sm:w-[18px] sm:h-[18px]" />
                ))}
              </div>
              <span className="font-semibold text-xs sm:text-base">5.0 {t('hero.google')}</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-white/30" />
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-white/80">
              <Shield size={18} className="text-viva-green sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-base">{t('hero.safe')}</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-white/30" />
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-white/80">
              <Users size={18} className="text-viva-yellow sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-base">{t('hero.clients')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-40">
        <ChevronDown size={32} className="text-white/60" />
      </div>

      {/* Wave decoration - transição para seção azul escuro */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,48C840,43,960,53,1080,58.7C1200,64,1320,64,1380,64L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" 
            fill="#1e3a5f"
          />
        </svg>
      </div>
    </section>
  );
}

// Features Section - Chamada para os roteiros (com dados dinâmicos)
function Features({ tours, getWhatsAppLink, t }: { tours: TourConfig[]; getWhatsAppLink: (msg?: string) => string; t: (key: string) => string }) {
  // Encontrar passeios ou usar defaults
  const tourPanoramico = tours.find(t => t.type === 'panoramico');
  const tourDesembarque = tours.find(t => t.type === 'desembarque');
  
  // Preços atuais
  const precoPanoramico = tourPanoramico?.pricing.find(p => p.isCurrent)?.adultPrice || DEFAULT_TOURS.panoramico.currentPrice;
  const precoDesembarque = tourDesembarque?.pricing.find(p => p.isCurrent)?.adultPrice || DEFAULT_TOURS.desembarque.currentPrice;

  return (
    <section className="pt-10 sm:pt-20 pb-24 sm:pb-32 bg-gradient-to-br from-viva-blue-dark via-viva-blue to-viva-blue-dark relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-8xl">⭐</div>
        <div className="absolute top-20 right-20 text-6xl">🌊</div>
        <div className="absolute bottom-20 left-1/4 text-7xl">🏝️</div>
        <div className="absolute bottom-32 right-10 text-5xl">☀️</div>
      </div>
      
      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        {/* Título grandioso */}
        <div className="text-center">
          {/* Badge da ilha */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base mb-4 sm:mb-6">
            <span>🏝️</span>
            <span>{t('features.badge')}</span>
          </div>
          
          {/* Título principal */}
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-4 sm:mb-6 leading-tight">
            {t('features.title1')} <span className="text-viva-yellow">{t('features.title2')}</span><br/>
            {t('features.title3')}
          </h2>
          
          {/* Subtítulo */}
          <p className="text-white/80 text-base sm:text-xl max-w-2xl mx-auto mb-6 sm:mb-8">
            {tours.length > 0 ? `${tours.length} ${t('features.subtitle')}` : t('features.twoOptions')}
          </p>
          
          {/* Cards dos roteiros - Dinâmico */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto mb-8 sm:mb-10">
            {/* Tour Panorâmico */}
            <div className="relative bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-2xl p-5 sm:p-6">
              {tourPanoramico?.isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-viva-orange text-white font-black text-xs px-3 py-1 rounded-full shadow-lg">
                  ⭐ {t('routes.recommended').replace('⭐ ', '')}
                </div>
              )}
              <span className="text-4xl sm:text-5xl block mb-3">{tourPanoramico?.emoji || '🚤'}</span>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">{tourPanoramico?.name || t('features.panoramic')}</h3>
              <p className="text-white/70 text-sm mb-3">{tourPanoramico?.duration || '5h'} {t('features.tripToIsland')}</p>
              <p className="text-white/90 text-sm">{t('features.panoramicDesc')}</p>
              <p className="text-white font-black text-xl sm:text-2xl mt-3">{t('features.fromPrice')} <span className="text-viva-yellow">R${precoPanoramico}</span></p>
            </div>
            
            {/* Com Desembarque */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6">
              <span className="text-4xl sm:text-5xl block mb-3">{tourDesembarque?.emoji || '🏝️'}</span>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">{tourDesembarque?.name || t('features.landing')}</h3>
              <p className="text-white/70 text-sm mb-3">{t('features.landOnIsland')}</p>
              <p className="text-white/90 text-sm">{t('features.landingDesc')}</p>
              <p className="text-white font-black text-xl sm:text-2xl mt-3">{t('features.fromPrice')} <span className="text-viva-yellow">R${precoDesembarque}</span></p>
            </div>
          </div>
          
          {/* Tags de público */}
          <p className="text-white/60 text-sm mb-3">{t('features.perfectFor')}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <span className="bg-white/10 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              {t('features.babies')}
            </span>
            <span className="bg-white/10 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              {t('features.children')}
            </span>
            <span className="bg-white/10 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              {t('features.families')}
            </span>
            <span className="bg-white/10 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              {t('features.seniors')}
            </span>
            <span className="bg-white/10 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              {t('features.groups')}
            </span>
          </div>
          
          {/* CTA */}
          <a 
            href="#passeios"
            className="inline-flex items-center gap-2 bg-white text-viva-blue-dark font-black px-6 sm:px-10 py-3 sm:py-4 rounded-full text-base sm:text-xl shadow-2xl hover:scale-105 transition-transform"
          >
            <span>👇</span>
            {t('features.seeDetails')}
          </a>
        </div>
      </div>
      
      {/* Wave transition */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block" preserveAspectRatio="none">
          <path d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,90 1440,80 L1440,120 L0,120 Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
}


// Carousel Component para Tour Panorâmico
function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/panoramico1.jpeg',
    '/panoramico2.jpeg',
    '/panoramico3.jpeg',
    '/panoramico4.jpeg',
  ];

  useEffect(() => {
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
          alt={`Tour Panorâmico Viva La Vida ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      
      {/* Indicadores - pequenos */}
      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
        <div className="flex gap-[3px]">
          {images.map((_, index) => (
            <span
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`block rounded-full cursor-pointer ${
                index === currentIndex 
                  ? 'bg-white w-3 sm:w-4 h-1 sm:h-1.5' 
                  : 'bg-white/50 w-1 sm:w-1.5 h-1 sm:h-1.5'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Tours Section - ROTEIROS VIVA LA VIDA
function Tours({ tours, siteConfig, getWhatsAppLink, getCurrentPrice, t }: SharedProps) {
  const [showReservationModal, setShowReservationModal] = useState(false);
  
  // Encontrar passeios ou usar defaults
  const tourPanoramico = tours.find(tour => tour.type === 'panoramico');
  const tourDesembarque = tours.find(tour => tour.type === 'desembarque');
  
  // Obter preços atuais e todos os preços
  const pricePanoramico = tourPanoramico ? getCurrentPrice(tourPanoramico) : null;
  const priceDesembarque = tourDesembarque ? getCurrentPrice(tourDesembarque) : null;

  return (
    <section id="passeios" className="py-12 sm:py-20 bg-white relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <span className="inline-block bg-viva-orange/10 text-viva-orange font-bold px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm mb-3 sm:mb-4">
            {t('tours.badge')}
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-viva-blue-dark mb-3 sm:mb-4">
            {t('tours.title')} <span className="gradient-text">{t('tours.titleHighlight')}</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg px-2">
            {t('tours.subtitle')}
          </p>
        </div>

        {/* DESTAQUE - Tour Panorâmico (Opção 2) */}
        <div className="mb-8 sm:mb-12">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-viva-orange via-viva-yellow to-viva-green p-1">
            {/* Badge de destaque */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-viva-orange to-viva-yellow text-white text-center py-2 sm:py-3 font-black text-sm sm:text-lg">
              {t('tours.bestSeller')}
            </div>
            
            <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden mt-8 sm:mt-10">
              <div className="grid lg:grid-cols-2 gap-0">
                {/* Carrossel de Imagens */}
                <ImageCarousel />

                {/* Conteúdo */}
                <div className="p-5 sm:p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-viva-blue/10 text-viva-blue px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                      ⏱️ {tourPanoramico?.duration || '5 horas'}
                    </span>
                    <span className="bg-viva-green/10 text-viva-green px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                      3h na água
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-3xl font-black text-viva-blue-dark mb-3 sm:mb-4">
                    {tourPanoramico?.emoji || '🚤'} {tourPanoramico?.name || 'Tour Panorâmico'}<br/>
                    <span className="gradient-text">{tourPanoramico?.subtitle || 'VIVA LA VIDA'}</span>
                  </h3>

                  <p className="text-gray-600 text-sm sm:text-base mb-4">
                    {tourPanoramico?.description || 'A experiência mais completa! 3 horas em frente à Ilha do Campeche com diversas atividades na água!'}
                  </p>

                  {/* O que está incluso - Dinâmico */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    {(tourPanoramico?.features || [
                      { icon: '🍢', label: 'Choripán' },
                      { icon: '🍹', label: 'Caipirinha' },
                      { icon: '🛶', label: 'Caiaque' },
                      { icon: '🏄‍♂️', label: 'Stand Up' },
                      { icon: '🤿', label: 'Snorkel' },
                      { icon: '🫧', label: 'Piscina' },
                      { icon: '🪷', label: 'Flutuante' },
                      { icon: '📸', label: 'Foto Sub' },
                    ]).map((item: { icon: string; label: string }, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-xl p-2 sm:p-3 text-center">
                        <span className="text-lg sm:text-2xl">{item.icon}</span>
                        <p className="text-xs sm:text-sm font-semibold text-gray-700">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Horários */}
                  <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 text-xs sm:text-sm text-gray-600">
                    <span>🕘 Check-in: {tourPanoramico?.checkInTime || '8:00h'}</span>
                    <span>🚤 Saída: {tourPanoramico?.departureTime || '9:15h'}</span>
                  </div>

                  {/* Preços - Dinâmico */}
                  <div className="mb-4 sm:mb-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {/* Preço Atual */}
                      {pricePanoramico ? (
                        <div className="bg-gradient-to-br from-viva-green/20 to-viva-green/5 border-2 border-viva-green/30 rounded-2xl p-4 text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-viva-green text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                            ATUAL
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{pricePanoramico.label}</p>
                          <p className="text-3xl sm:text-4xl font-black text-viva-green">R${pricePanoramico.adult}</p>
                          <p className="text-[10px] text-gray-400">por pessoa</p>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-viva-green/20 to-viva-green/5 border-2 border-viva-green/30 rounded-2xl p-4 text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-viva-green text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                            ATUAL
                          </div>
                          <p className="text-xs text-gray-500 mb-1">Preço atual</p>
                          <p className="text-3xl sm:text-4xl font-black text-viva-green">R${DEFAULT_TOURS.panoramico.currentPrice}</p>
                          <p className="text-[10px] text-gray-400">por pessoa</p>
                        </div>
                      )}
                      
                      {/* Outros preços do passeio */}
                      {tourPanoramico?.pricing && tourPanoramico.pricing.length > 1 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">
                            {tourPanoramico.pricing.find(p => !p.isCurrent)?.label || 'Alta Temporada'}
                          </p>
                          <p className="text-3xl sm:text-4xl font-black text-gray-400">
                            R${tourPanoramico.pricing.find(p => !p.isCurrent)?.adultPrice || DEFAULT_TOURS.panoramico.seasonPrice}
                          </p>
                          <p className="text-[10px] text-gray-400">por pessoa</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Alta Temporada</p>
                          <p className="text-3xl sm:text-4xl font-black text-gray-400">R${DEFAULT_TOURS.panoramico.seasonPrice}</p>
                          <p className="text-[10px] text-gray-400">por pessoa</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Info crianças */}
                    <div className="flex justify-center gap-3 mt-3">
                      <span className="bg-viva-blue/10 text-viva-blue text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full">
                        👶 Até {pricePanoramico ? (tourPanoramico?.pricing.find(p => p.isCurrent)?.freeAgeLimit || 4) : 4} anos: GRÁTIS
                      </span>
                      <span className="bg-viva-orange/10 text-viva-orange text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full">
                        👧 {(pricePanoramico ? (tourPanoramico?.pricing.find(p => p.isCurrent)?.freeAgeLimit || 4) : 4) + 1}-{pricePanoramico ? (tourPanoramico?.pricing.find(p => p.isCurrent)?.halfPriceAgeLimit || 7) : 7} anos: MEIA
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => setShowReservationModal(true)}
                    className="block w-full text-center bg-gradient-to-r from-green-500 to-green-600 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-base sm:text-xl shadow-lg shadow-green-500/30 active:scale-95 transition-all"
                  >
                    <MessageCircle className="inline mr-2" size={20} />
                    {t('tours.bookPanoramic')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Opção 2 - COM Desembarque - Dinâmico */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-xl border border-gray-100">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Conteúdo */}
            <div className="p-5 sm:p-8 order-2 lg:order-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-viva-blue/10 text-viva-blue px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                  ⏱️ {tourDesembarque?.duration || '7 horas'}
                </span>
                <span className="bg-viva-teal/10 text-viva-teal px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                  3h na ilha
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-viva-blue-dark mb-3">
                {tourDesembarque?.emoji || '🌴'} {tourDesembarque?.name || 'Passeio com Desembarque'}<br/>
                <span className="text-viva-teal">{tourDesembarque?.subtitle || 'Ilha do Campeche'}</span>
              </h3>

              <p className="text-gray-600 text-sm sm:text-base mb-4">
                {tourDesembarque?.description || 'Desembarque na ilha e explore por 3 horas! Praias de areia branca, águas cristalinas e contato com a natureza.'}
              </p>

              {/* O que está incluso */}
              <ul className="space-y-2 mb-4 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-viva-green">✓</span>
                  Autorização de acesso à ilha inclusa
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-viva-green">✓</span>
                  3 horas para explorar em terra
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-viva-green">✓</span>
                  Embarque 9h • Retorno ~16h
                </li>
              </ul>

              {/* Preços - Dinâmico */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Preço Atual */}
                  {priceDesembarque ? (
                    <div className="bg-gradient-to-br from-viva-teal/20 to-viva-teal/5 border-2 border-viva-teal/30 rounded-xl p-3 text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-viva-teal text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                        ATUAL
                      </div>
                      <p className="text-[10px] text-gray-500 mb-1">{priceDesembarque.label}</p>
                      <p className="text-2xl sm:text-3xl font-black text-viva-teal">R${priceDesembarque.adult}</p>
                      <p className="text-[9px] text-gray-400">por pessoa</p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-viva-teal/20 to-viva-teal/5 border-2 border-viva-teal/30 rounded-xl p-3 text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-viva-teal text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                        ATUAL
                      </div>
                      <p className="text-[10px] text-gray-500 mb-1">Preço atual</p>
                      <p className="text-2xl sm:text-3xl font-black text-viva-teal">R${DEFAULT_TOURS.desembarque.currentPrice}</p>
                      <p className="text-[9px] text-gray-400">por pessoa</p>
                    </div>
                  )}
                  
                  {/* Outros preços */}
                  {tourDesembarque?.pricing && tourDesembarque.pricing.length > 1 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">
                        {tourDesembarque.pricing.find(p => !p.isCurrent)?.label || 'Alta Temporada'}
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-gray-400">
                        R${tourDesembarque.pricing.find(p => !p.isCurrent)?.adultPrice || DEFAULT_TOURS.desembarque.seasonPrice}
                      </p>
                      <p className="text-[9px] text-gray-400">por pessoa</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">Alta Temporada</p>
                      <p className="text-2xl sm:text-3xl font-black text-gray-400">R${DEFAULT_TOURS.desembarque.seasonPrice}</p>
                      <p className="text-[9px] text-gray-400">por pessoa</p>
                    </div>
                  )}
                </div>
                
                {/* Info crianças */}
                <div className="flex justify-center gap-2 mt-2">
                  <span className="bg-viva-blue/10 text-viva-blue text-[9px] sm:text-[10px] font-semibold px-2 py-1 rounded-full">
                    👶 Até {priceDesembarque ? (tourDesembarque?.pricing.find(p => p.isCurrent)?.freeAgeLimit || 4) : 4} anos: GRÁTIS
                  </span>
                  <span className="bg-viva-orange/10 text-viva-orange text-[9px] sm:text-[10px] font-semibold px-2 py-1 rounded-full">
                    👧 {(priceDesembarque ? (tourDesembarque?.pricing.find(p => p.isCurrent)?.freeAgeLimit || 4) : 4) + 1}-{priceDesembarque ? (tourDesembarque?.pricing.find(p => p.isCurrent)?.halfPriceAgeLimit || 7) : 7} anos: MEIA
                  </span>
                </div>
              </div>

              {/* CTA - Dinâmico */}
              <a 
                href={getWhatsAppLink(t('whatsapp.bookLanding'))}
                className="block w-full text-center bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base active:scale-95 transition-all"
              >
                <MessageCircle className="inline mr-2" size={18} />
                {t('tours.bookLanding')}
              </a>
            </div>

            {/* Imagem */}
            <div className="relative h-64 sm:h-80 lg:h-full min-h-[280px] order-1 lg:order-2">
              <img 
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073"
                alt="Ilha do Campeche - Com Desembarque"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:bg-gradient-to-l" />
              <div className="absolute bottom-4 left-4">
                <span className="bg-viva-teal text-white px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                  COM DESEMBARQUE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info importante */}
        <div className="mt-8 sm:mt-12 bg-viva-blue-navy/5 rounded-2xl p-4 sm:p-6">
          <h4 className="font-bold text-viva-blue-dark mb-3 text-sm sm:text-base">{t('info.title')}</h4>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
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
    </section>
  );
}

// Routes Section - Comparativo dos Roteiros
function Routes({ tours, siteConfig, getWhatsAppLink, getCurrentPrice, t }: SharedProps) {
  // Encontrar passeios ou usar defaults
  const tourPanoramico = tours.find(tour => tour.type === 'panoramico');
  const tourDesembarque = tours.find(tour => tour.type === 'desembarque');
  
  // Obter preços atuais
  const pricePanoramico = tourPanoramico ? getCurrentPrice(tourPanoramico) : null;
  const priceDesembarque = tourDesembarque ? getCurrentPrice(tourDesembarque) : null;

  return (
    <section id="roteiros" className="py-12 sm:py-20 bg-gradient-to-br from-viva-blue-dark via-viva-blue to-viva-teal relative overflow-hidden">
      {/* Animated background - esconde no mobile */}
      <div className="absolute inset-0 opacity-10 hidden sm:block">
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white/20 rounded-full animate-wave-slow"
              style={{
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                top: `${20 + i * 15}%`,
                left: `${i * 20}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4">
            {t('routes.title')} <span className="text-viva-yellow">{t('routes.titleHighlight')}</span>
          </h2>
          <p className="text-white/80 text-sm sm:text-lg max-w-2xl mx-auto px-2">
            {t('routes.subtitle')}
          </p>
        </div>

        {/* Comparativo em cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {/* Tour Panorâmico - DESTAQUE */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-viva-orange to-viva-yellow text-white text-center py-1.5 text-xs sm:text-sm font-bold">
              {t('routes.recommended')}
            </div>
            <div className="pt-6">
              <h3 className="text-lg sm:text-xl font-black text-viva-blue-dark mb-2">
                🚤 {t('features.panoramic')}
              </h3>
              <p className="text-viva-orange font-bold text-sm mb-3">{t('routes.onboard')}</p>
              
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('routes.tripHours')}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('routes.frontIsland')}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('routes.food')}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('routes.kayakSup')}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('routes.snorkelPhoto')}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('routes.inflatablePool')}</li>
              </ul>

              <div className="text-center">
                <p className="text-xs text-gray-500">{t('features.fromPrice')}</p>
                <p className="text-3xl font-black text-viva-green">R${pricePanoramico?.adult || DEFAULT_TOURS.panoramico.currentPrice}</p>
              </div>
            </div>
          </div>

          {/* Com Desembarque */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg sm:text-xl font-black text-white mb-2">
              {tourDesembarque?.emoji || '🌴'} {tourDesembarque?.name || t('features.landing')}
            </h3>
            <p className="text-viva-teal font-bold text-sm mb-3">{t('routes.onIsland')}</p>
            
            <ul className="space-y-2 text-sm text-white/80 mb-4">
              <li className="flex items-center gap-2"><span className="text-viva-teal">✓</span> {tourDesembarque?.duration || '7 horas'} {t('routes.totalHours')}</li>
              <li className="flex items-center gap-2"><span className="text-viva-teal">✓</span> {t('routes.hoursOnIsland')}</li>
              <li className="flex items-center gap-2"><span className="text-viva-teal">✓</span> {t('routes.authIncluded')}</li>
              <li className="flex items-center gap-2"><span className="text-viva-teal">✓</span> {t('routes.exploreOnLand')}</li>
              <li className="flex items-center gap-2 text-white/50"><span>—</span> {t('routes.noActivities')}</li>
              <li className="flex items-center gap-2 text-white/50"><span>—</span> {t('routes.noFood')}</li>
            </ul>

            <div className="text-center">
              <p className="text-xs text-white/60">{t('features.fromPrice')}</p>
              <p className="text-3xl font-black text-white">R${priceDesembarque?.adult || DEFAULT_TOURS.desembarque.currentPrice}</p>
            </div>
          </div>
        </div>

        {/* Big CTA */}
        <div className="mt-10 sm:mt-16 text-center px-2">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4">
              {t('routes.doubt')} 🤔
            </h3>
            <p className="text-white/80 text-sm sm:text-base mb-5 sm:mb-6 max-w-lg mx-auto">
              {t('routes.helpChoose')}
            </p>
            <a 
              href={getWhatsAppLink(t('whatsapp.doubt'))}
              className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-full font-bold text-base sm:text-xl shadow-xl shadow-green-500/30 active:scale-95 transition-all shimmer"
            >
              <MessageCircle size={24} />
              {t('routes.askQuestions')}
            </a>
          </div>
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
    <section className="py-12 sm:py-20 bg-gradient-to-br from-gray-50 to-orange-50 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 sm:mb-12">
          <span className="inline-block bg-viva-yellow/20 text-viva-orange font-bold px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm mb-3 sm:mb-4">
            {t('testimonials.badge')}
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-viva-blue-dark mb-2 sm:mb-4">
            <span className="gradient-text">{t('testimonials.title')}</span>
          </h2>
        </div>

        {/* Scroll horizontal no mobile */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12 -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 sm:pb-0 snap-x snap-mandatory scrollbar-hide">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="shrink-0 w-[260px] sm:w-auto snap-center bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg"
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
    <section id="sobre" className="py-12 sm:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Imagem primeiro no mobile */}
          <div className="relative order-1 lg:order-2">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1559827291-72ee739d0d9a?q=80&w=2070"
                alt="Lancha Viva la Vida"
                className="w-full h-[250px] sm:h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-viva-blue-dark/50 to-transparent" />
            </div>
            
            {/* Badge flutuante - ajustado para mobile */}
            <div className="absolute bottom-3 left-3 sm:-bottom-6 sm:-left-6 bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg sm:shadow-xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-viva-green to-viva-teal rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Shield className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="font-bold text-viva-blue-dark text-xs sm:text-base">{t('about.certified')}</div>
                  <div className="text-gray-500 text-[10px] sm:text-sm">Cadastur</div>
                </div>
              </div>
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
    <section className="py-12 sm:py-20 bg-gradient-to-r from-viva-orange via-viva-yellow to-viva-green relative overflow-hidden">
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
  // Valores do siteConfig ou defaults
  const whatsappNumber = siteConfig?.whatsappNumber || DEFAULT_SITE_CONFIG.whatsappNumber;
  const displayPhone = siteConfig?.phone || DEFAULT_SITE_CONFIG.phone;
  const email = siteConfig?.email || DEFAULT_SITE_CONFIG.email;
  const address = siteConfig?.address || DEFAULT_SITE_CONFIG.address;
  const instagramUrl = siteConfig?.instagramUrl || DEFAULT_SITE_CONFIG.instagramUrl;
  const facebookUrl = siteConfig?.facebookUrl || DEFAULT_SITE_CONFIG.facebookUrl;

  return (
    <footer id="contato" className="bg-viva-blue-navy text-white relative">
      {/* Wave top - esconde no mobile */}
      <div className="absolute top-0 left-0 right-0 -translate-y-full hidden sm:block">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,30L80,35C160,40,320,50,480,50C640,50,800,40,960,35C1120,30,1280,30,1360,30L1440,30L1440,60L1360,60C1280,60,1120,60,960,60C800,60,640,60,480,60C320,60,160,60,80,60L0,60Z" fill="#0D47A1"/>
        </svg>
      </div>

      <div className="container mx-auto px-4 py-10 sm:py-16">
        {/* Mobile: Layout centralizado e simplificado */}
        <div className="text-center sm:text-left">
          {/* Logo centralizado no mobile */}
          <div className="flex justify-center sm:justify-start mb-6">
            <Image 
              src="/imagemlogo1.png" 
              alt="Viva la Vida" 
              width={160} 
              height={64}
              className="bg-white rounded-xl p-2 sm:p-3 sm:w-[200px]"
            />
          </div>
          
          {/* Redes Sociais - mais destaque no mobile */}
          <div className="flex justify-center gap-4 mb-8">
            <a href={getWhatsAppLink()} className="w-12 h-12 sm:w-10 sm:h-10 bg-green-500 sm:bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-all">
              <MessageCircle size={24} className="sm:w-5 sm:h-5" />
            </a>
            <a href={instagramUrl} className="w-12 h-12 sm:w-10 sm:h-10 bg-pink-500 sm:bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-all">
              <Instagram size={24} className="sm:w-5 sm:h-5" />
            </a>
            <a href={facebookUrl} className="w-12 h-12 sm:w-10 sm:h-10 bg-blue-600 sm:bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-all">
              <Facebook size={24} className="sm:w-5 sm:h-5" />
            </a>
          </div>

          {/* Contato - compacto no mobile */}
          <div className="space-y-3 mb-8">
            <a href={`tel:+55${whatsappNumber}`} className="flex items-center justify-center sm:justify-start gap-2 text-white/80 active:text-white text-sm sm:text-base">
              <Phone size={16} />
              {displayPhone}
            </a>
            <a href={`mailto:${email}`} className="flex items-center justify-center sm:justify-start gap-2 text-white/80 active:text-white text-sm sm:text-base">
              <Mail size={16} />
              {email}
            </a>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-white/80 text-sm sm:text-base">
              <MapPin size={16} className="shrink-0" />
              <span>{address}</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-white/80 text-sm sm:text-base">
              <Clock size={16} />
              <span>{t('footer.support')}</span>
            </div>
          </div>

          {/* Links - horizontal no mobile */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8 text-sm">
            <a href="#inicio" className="text-white/70 active:text-white">{t('nav.home')}</a>
            <a href="#passeios" className="text-white/70 active:text-white">{t('nav.tours')}</a>
            <a href="#roteiros" className="text-white/70 active:text-white">{t('nav.routes')}</a>
            <a href="#sobre" className="text-white/70 active:text-white">{t('nav.about')}</a>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 sm:pt-8 text-center">
          <p className="text-white/50 text-xs sm:text-sm mb-2">
            {t('footer.rights')}
          </p>
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs sm:text-sm">
            <span>{t('footer.certified')}</span>
            <span className="text-viva-yellow font-bold">Cadastur</span>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button - MAIOR no mobile */}
      <a 
        href={getWhatsAppLink()}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-green-500 text-white w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform pulse-ring"
        aria-label="WhatsApp"
      >
        <MessageCircle size={28} className="sm:w-8 sm:h-8" />
      </a>
    </footer>
  );
}

// Splash Screen Component
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // 2 segundos total (1s animação entrada + 1s saída)
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-viva-blue-dark via-viva-blue to-viva-blue-dark flex items-center justify-center">
      {/* Ondas decorativas de fundo */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-viva-yellow/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Logo container */}
      <div className="relative animate-splash-logo">
        <Image 
          src="/imagemlogo1.png" 
          alt="Viva la Vida" 
          width={400} 
          height={160}
          className="w-72 sm:w-96 md:w-[450px] h-auto drop-shadow-2xl"
          priority
        />
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
  
  // Carregar configurações dinâmicas do site
  const { tours, siteConfig, loading, getWhatsAppLink, getCurrentPrice } = useSiteConfig();
  
  // Hook de internacionalização
  const { t } = useLanguage();

  const handleSplashComplete = () => {
    setShowSplash(false);
    // Pequeno delay para começar a animação do conteúdo
    setTimeout(() => setIsVisible(true), 100);
  };

  // Props compartilhadas para todos os componentes
  const sharedProps = {
    tours,
    siteConfig,
    getWhatsAppLink,
    getCurrentPrice,
    t,
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <main className={`transition-opacity duration-500 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <Header {...sharedProps} />
        <Hero {...sharedProps} />
        <Features tours={tours} getWhatsAppLink={getWhatsAppLink} t={t} />
        <Tours {...sharedProps} />
        <Routes {...sharedProps} />
        <Testimonials {...sharedProps} />
        <About {...sharedProps} />
        <FinalCTA {...sharedProps} />
        <Footer {...sharedProps} />
      </main>
    </>
  );
}



