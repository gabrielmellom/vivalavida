'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { TourConfig, TourPricing, TourFeature, SiteConfig, BankAccount } from '@/types';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Settings, 
  Ship,
  DollarSign,
  Star,
  Eye,
  EyeOff,
  GripVertical,
  MessageCircle,
  Instagram,
  Facebook,
  Phone,
  Mail,
  MapPin,
  ImagePlus,
  Loader2,
  Building2
} from 'lucide-react';
import Link from 'next/link';

export default function ConfigSitePage() {
  const [tours, setTours] = useState<TourConfig[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tours' | 'geral'>('tours');
  const [showTourModal, setShowTourModal] = useState(false);
  const [tourToEdit, setTourToEdit] = useState<TourConfig | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar passeios
      const toursSnapshot = await getDocs(collection(db, 'tourConfigs'));
      const toursData = toursSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as TourConfig[];
      toursData.sort((a, b) => a.order - b.order);
      setTours(toursData);

      // Carregar configurações gerais
      const configSnapshot = await getDocs(collection(db, 'siteConfig'));
      if (configSnapshot.docs.length > 0) {
        const configData = configSnapshot.docs[0];
        setSiteConfig({
          id: configData.id,
          ...configData.data(),
          updatedAt: configData.data().updatedAt?.toDate(),
        } as SiteConfig);
      } else {
        // Criar configuração padrão
        const defaultConfig: Omit<SiteConfig, 'id'> = {
          whatsappNumber: '5548999999999',
          instagramUrl: 'https://instagram.com/vivalavida',
          facebookUrl: 'https://facebook.com/vivalavida',
          email: 'contato@vivalavida.com.br',
          phone: '(48) 99999-9999',
          address: 'Barra da Lagoa, Florianópolis - SC',
          googleReviews: 400,
          googleRating: 5.0,
          heroTitle: 'Viva Momentos Inesquecíveis',
          heroSubtitle: 'Embarque no Barco Viva La Vida e conheça a Ilha do Campeche!',
          updatedAt: new Date(),
        };
        const docRef = await addDoc(collection(db, 'siteConfig'), {
          ...defaultConfig,
          updatedAt: Timestamp.now(),
        });
        setSiteConfig({ id: docRef.id, ...defaultConfig });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const [uploadingGallery, setUploadingGallery] = useState(false);

  const handleSaveSiteConfig = async () => {
    if (!siteConfig) return;
    
    try {
      await updateDoc(doc(db, 'siteConfig', siteConfig.id), {
        whatsappNumber: siteConfig.whatsappNumber,
        instagramUrl: siteConfig.instagramUrl,
        facebookUrl: siteConfig.facebookUrl,
        email: siteConfig.email,
        phone: siteConfig.phone,
        address: siteConfig.address,
        googleReviews: siteConfig.googleReviews,
        googleRating: siteConfig.googleRating,
        heroTitle: siteConfig.heroTitle,
        heroSubtitle: siteConfig.heroSubtitle,
        banks: siteConfig.banks || [],
        galleryImages: siteConfig.galleryImages || [],
        updatedAt: Timestamp.now(),
      });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    }
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !siteConfig) return;
    
    setUploadingGallery(true);
    const files = Array.from(e.target.files);
    const newImages: string[] = [];

    try {
      for (const file of files) {
        const fileName = `gallery_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `gallery/${fileName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newImages.push(url);
      }
      
      setSiteConfig({
        ...siteConfig,
        galleryImages: [...(siteConfig.galleryImages || []), ...newImages],
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload das imagens');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryImage = async (imageUrl: string) => {
    if (!siteConfig) return;
    
    try {
      // Tentar deletar do Storage se for uma URL do Firebase
      if (imageUrl.includes('firebase')) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(() => {});
      }
      
      setSiteConfig({
        ...siteConfig,
        galleryImages: (siteConfig.galleryImages || []).filter(img => img !== imageUrl),
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
    }
  };

  const handleToggleTourActive = async (tour: TourConfig) => {
    try {
      await updateDoc(doc(db, 'tourConfigs', tour.id), {
        isActive: !tour.isActive,
        updatedAt: Timestamp.now(),
      });
      setTours(tours.map(t => t.id === tour.id ? { ...t, isActive: !t.isActive } : t));
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!confirm('Tem certeza que deseja excluir este passeio?')) return;
    
    try {
      await deleteDoc(doc(db, 'tourConfigs', tourId));
      setTours(tours.filter(t => t.id !== tourId));
      alert('Passeio excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir passeio:', error);
      alert('Erro ao excluir passeio');
    }
  };

  const createDefaultTours = async () => {
    if (tours.length > 0) {
      if (!confirm('Já existem passeios cadastrados. Deseja criar os passeios padrão mesmo assim?')) {
        return;
      }
    }

    try {
      // Tour Panorâmico
      const tourPanoramico: Omit<TourConfig, 'id'> = {
        name: 'Tour Panorâmico',
        slug: 'tour-panoramico',
        subtitle: 'VIVA LA VIDA',
        description: 'A experiência mais completa! 3 horas em frente à Ilha do Campeche com diversas atividades na água!',
        duration: '5 horas',
        durationDetail: '3h na água',
        type: 'panoramico',
        emoji: '🚤',
        features: [
          { icon: '🍢', label: 'Choripán' },
          { icon: '🍹', label: 'Caipirinha' },
          { icon: '🛶', label: 'Caiaque' },
          { icon: '🏄‍♂️', label: 'Stand Up' },
          { icon: '🤿', label: 'Snorkel' },
          { icon: '🫧', label: 'Piscina' },
          { icon: '🪷', label: 'Flutuante' },
          { icon: '📸', label: 'Foto Sub' },
        ],
        drinks: '1 Caipirinha por adulto e Água Mineral',
        food: '1 Choripán por pessoa',
        spots: ['Prainha da Barra', 'Piscinas Naturais da Barra', 'Em frente à Ilha do Campeche', 'Praia da Galheta', 'Praia Mole', 'Praia do Gravatá'],
        checkInTime: '8:00h',
        departureTime: '9:15h',
        pricing: [
          {
            id: 'preco-atual',
            label: 'Até 25/12',
            adultPrice: 200,
            childPrice: 100,
            freeAgeLimit: 4,
            halfPriceAgeLimit: 7,
            isActive: true,
            isCurrent: true,
          },
          {
            id: 'alta-temporada',
            label: 'Alta Temporada',
            startDate: '2024-12-26',
            adultPrice: 250,
            childPrice: 125,
            freeAgeLimit: 4,
            halfPriceAgeLimit: 7,
            isActive: true,
            isCurrent: false,
          },
        ],
        isHighlighted: true,
        highlightLabel: '⭐ MAIS VENDIDO • MELHOR CUSTO-BENEFÍCIO ⭐',
        order: 1,
        isActive: true,
        images: ['/panoramico1.jpeg', '/panoramico2.jpeg', '/panoramico3.jpeg', '/panoramico4.jpeg'],
        whatsappMessage: 'Olá! Quero reservar o Tour Panorâmico!',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Tour com Desembarque
      const tourDesembarque: Omit<TourConfig, 'id'> = {
        name: 'Passeio com Desembarque',
        slug: 'com-desembarque',
        subtitle: 'Ilha do Campeche',
        description: 'Desembarque na ilha e explore por 3 horas! Praias de areia branca, águas cristalinas e contato com a natureza.',
        duration: '7 horas',
        durationDetail: '3h na ilha',
        type: 'desembarque',
        emoji: '🌴',
        features: [
          { icon: '✓', label: 'Autorização de acesso à ilha inclusa' },
          { icon: '✓', label: '3 horas para explorar em terra' },
          { icon: '✓', label: 'Embarque 9h • Retorno ~16h' },
        ],
        drinks: 'Não incluso',
        food: 'Não incluso',
        spots: ['Prainha da Barra', 'Piscinas Naturais da Barra', 'Ilha do Xavier', 'Praia da Galheta', 'Praia Mole', 'Praia do Gravatá', 'Ilha do Campeche (3h em terra)'],
        checkInTime: '8:30h',
        departureTime: '9:00h',
        pricing: [
          {
            id: 'preco-atual',
            label: 'Até 25/12',
            adultPrice: 300,
            childPrice: 150,
            freeAgeLimit: 4,
            halfPriceAgeLimit: 7,
            isActive: true,
            isCurrent: true,
          },
          {
            id: 'alta-temporada',
            label: 'Alta Temporada',
            startDate: '2024-12-26',
            adultPrice: 350,
            childPrice: 175,
            freeAgeLimit: 4,
            halfPriceAgeLimit: 7,
            isActive: true,
            isCurrent: false,
          },
        ],
        isHighlighted: false,
        order: 2,
        isActive: true,
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073'],
        whatsappMessage: 'Olá! Quero reservar o passeio COM desembarque na Ilha do Campeche!',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'tourConfigs'), {
        ...tourPanoramico,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await addDoc(collection(db, 'tourConfigs'), {
        ...tourDesembarque,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      alert('Passeios padrão criados com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao criar passeios:', error);
      alert('Erro ao criar passeios');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viva-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-viva-blue-dark">Configurações do Site</h1>
              <p className="text-gray-600 text-sm">Gerencie passeios, preços e informações</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('tours')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition ${
              activeTab === 'tours'
                ? 'bg-viva-blue text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Ship size={20} />
            Passeios
          </button>
          <button
            onClick={() => setActiveTab('geral')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition ${
              activeTab === 'geral'
                ? 'bg-viva-blue text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings size={20} />
            Configurações Gerais
          </button>
        </div>

        {/* Tab: Passeios */}
        {activeTab === 'tours' && (
          <div>
            {/* Ações */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => {
                  setTourToEdit(null);
                  setShowTourModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition"
              >
                <Plus size={20} />
                Novo Passeio
              </button>
              {tours.length === 0 && (
                <button
                  onClick={createDefaultTours}
                  className="flex items-center gap-2 bg-viva-orange text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition"
                >
                  <Star size={20} />
                  Criar Passeios Padrão
                </button>
              )}
            </div>

            {/* Lista de Passeios */}
            <div className="space-y-4">
              {tours.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Ship className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600 font-semibold mb-2">Nenhum passeio cadastrado</p>
                  <p className="text-gray-500 text-sm mb-4">
                    Clique em "Criar Passeios Padrão" para começar com os passeios básicos
                  </p>
                </div>
              ) : (
                tours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    onEdit={() => {
                      setTourToEdit(tour);
                      setShowTourModal(true);
                    }}
                    onToggleActive={() => handleToggleTourActive(tour)}
                    onDelete={() => handleDeleteTour(tour.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Configurações Gerais */}
        {activeTab === 'geral' && siteConfig && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="text-xl font-bold text-viva-blue-dark flex items-center gap-2">
                <Settings size={24} />
                Informações de Contato
              </h2>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MessageCircle size={16} className="text-green-500" />
                  Número WhatsApp (apenas números)
                </label>
                <input
                  type="text"
                  value={siteConfig.whatsappNumber}
                  onChange={(e) => setSiteConfig({ ...siteConfig, whatsappNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                  placeholder="5548999999999"
                />
                <p className="text-xs text-gray-500 mt-1">Formato: código do país + DDD + número (ex: 5548999999999)</p>
              </div>

              {/* Telefone de exibição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Phone size={16} className="text-viva-blue" />
                  Telefone (exibição)
                </label>
                <input
                  type="text"
                  value={siteConfig.phone}
                  onChange={(e) => setSiteConfig({ ...siteConfig, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                  placeholder="(48) 99999-9999"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-red-500" />
                  Email
                </label>
                <input
                  type="email"
                  value={siteConfig.email}
                  onChange={(e) => setSiteConfig({ ...siteConfig, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                  placeholder="contato@exemplo.com"
                />
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-viva-orange" />
                  Endereço
                </label>
                <input
                  type="text"
                  value={siteConfig.address}
                  onChange={(e) => setSiteConfig({ ...siteConfig, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                  placeholder="Barra da Lagoa, Florianópolis - SC"
                />
              </div>

              {/* Redes Sociais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Instagram size={16} className="text-pink-500" />
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={siteConfig.instagramUrl}
                    onChange={(e) => setSiteConfig({ ...siteConfig, instagramUrl: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Facebook size={16} className="text-blue-600" />
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    value={siteConfig.facebookUrl}
                    onChange={(e) => setSiteConfig({ ...siteConfig, facebookUrl: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </div>

              {/* Avaliações Google */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Star size={20} className="text-yellow-500" />
                  Avaliações Google
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nota Média</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={siteConfig.googleRating}
                      onChange={(e) => setSiteConfig({ ...siteConfig, googleRating: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Avaliações</label>
                    <input
                      type="number"
                      min="0"
                      value={siteConfig.googleReviews}
                      onChange={(e) => setSiteConfig({ ...siteConfig, googleReviews: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bancos */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-600" />
                  Bancos / Contas para Recebimento
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Configure os bancos/contas onde você recebe pagamentos. Isso permitirá selecionar o banco ao registrar pagamentos no check-in.
                </p>
                
                {/* Lista de bancos */}
                <div className="space-y-2 mb-4">
                  {(siteConfig.banks || []).map((bank) => (
                    <div
                      key={bank.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        bank.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 size={18} className={bank.isActive ? 'text-green-600' : 'text-gray-400'} />
                        <span className={`font-semibold ${bank.isActive ? 'text-green-800' : 'text-gray-600'}`}>
                          {bank.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updatedBanks = (siteConfig.banks || []).map(b =>
                              b.id === bank.id ? { ...b, isActive: !b.isActive } : b
                            );
                            setSiteConfig({ ...siteConfig, banks: updatedBanks });
                          }}
                          className={`p-1.5 rounded transition ${
                            bank.isActive 
                              ? 'text-green-600 hover:bg-green-100' 
                              : 'text-gray-400 hover:bg-gray-200'
                          }`}
                          title={bank.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {bank.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover o banco "${bank.name}"?`)) {
                              const updatedBanks = (siteConfig.banks || []).filter(b => b.id !== bank.id);
                              setSiteConfig({ ...siteConfig, banks: updatedBanks });
                            }
                          }}
                          className="p-1.5 rounded text-red-500 hover:bg-red-100 transition"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {(siteConfig.banks || []).length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Nenhum banco configurado ainda
                    </div>
                  )}
                </div>
                
                {/* Adicionar novo banco */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="newBankName"
                    placeholder="Nome do banco ou conta..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        const name = input.value.trim();
                        if (name) {
                          const newBank: BankAccount = {
                            id: `bank_${Date.now()}`,
                            name,
                            isActive: true,
                          };
                          setSiteConfig({
                            ...siteConfig,
                            banks: [...(siteConfig.banks || []), newBank],
                          });
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newBankName') as HTMLInputElement;
                      const name = input.value.trim();
                      if (name) {
                        const newBank: BankAccount = {
                          id: `bank_${Date.now()}`,
                          name,
                          isActive: true,
                        };
                        setSiteConfig({
                          ...siteConfig,
                          banks: [...(siteConfig.banks || []), newBank],
                        });
                        input.value = '';
                      }
                    }}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Galeria de Fotos */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <ImagePlus size={20} className="text-purple-600" />
                  Galeria de Fotos (Carrossel)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Adicione fotos que aparecerão no carrossel da galeria do site. Recomendamos imagens em alta qualidade (16:9).
                </p>

                {/* Preview das imagens */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {(siteConfig.galleryImages || []).map((url, index) => (
                    <div key={url} className="relative aspect-video rounded-lg overflow-hidden group">
                      <img
                        src={url}
                        alt={`Galeria ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(url)}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                  
                  {(siteConfig.galleryImages || []).length === 0 && (
                    <div className="col-span-full text-center py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                      Nenhuma imagem adicionada ainda
                    </div>
                  )}
                </div>

                {/* Botão de upload */}
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition cursor-pointer">
                  {uploadingGallery ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Fazendo upload...
                    </>
                  ) : (
                    <>
                      <ImagePlus size={18} />
                      Adicionar Imagens
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImageUpload}
                    className="hidden"
                    disabled={uploadingGallery}
                  />
                </label>
              </div>

              {/* Botão Salvar */}
              <button
                onClick={handleSaveSiteConfig}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-viva-green to-green-600 text-white px-6 py-4 rounded-xl font-bold hover:shadow-lg transition"
              >
                <Save size={20} />
                Salvar Configurações
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Editar/Criar Passeio */}
      {showTourModal && (
        <TourEditModal
          tour={tourToEdit}
          onClose={() => {
            setShowTourModal(false);
            setTourToEdit(null);
          }}
          onSave={() => {
            setShowTourModal(false);
            setTourToEdit(null);
            loadData();
          }}
          existingTours={tours}
        />
      )}
    </div>
  );
}

// Componente Card de Passeio
function TourCard({
  tour,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  tour: TourConfig;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const currentPrice = tour.pricing.find(p => p.isCurrent);

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
      tour.isHighlighted ? 'border-viva-orange' : 'border-gray-100'
    }`}>
      {tour.isHighlighted && tour.highlightLabel && (
        <div className="bg-gradient-to-r from-viva-orange to-viva-yellow text-white text-center py-2 font-bold text-sm">
          {tour.highlightLabel}
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{tour.emoji}</span>
              <div>
                <h3 className="text-xl font-bold text-viva-blue-dark">{tour.name}</h3>
                <p className="text-gray-500 text-sm">{tour.subtitle}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-viva-blue/10 text-viva-blue px-3 py-1 rounded-full text-xs font-bold">
                ⏱️ {tour.duration}
              </span>
              {tour.durationDetail && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                  {tour.durationDetail}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                tour.isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {tour.isActive ? '✓ Ativo' : '✗ Inativo'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                tour.type === 'panoramico' ? 'bg-orange-100 text-orange-700' :
                tour.type === 'desembarque' ? 'bg-teal-100 text-teal-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {tour.type === 'panoramico' ? '🚤 Principal' :
                 tour.type === 'desembarque' ? '🏝️ Desembarque' :
                 tour.type === 'lancha' ? '🛥️ Lancha' : '✨ Outro'}
              </span>
            </div>

            {/* Preços */}
            <div className="mt-4 flex flex-wrap gap-4">
              {tour.pricing.map((price) => (
                <div key={price.id} className={`rounded-lg p-3 ${
                  price.isCurrent 
                    ? 'bg-green-50 border-2 border-green-200' 
                    : 'bg-gray-50'
                }`}>
                  <p className="text-xs text-gray-500">{price.label}</p>
                  <p className={`text-xl font-black ${
                    price.isCurrent ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    R$ {price.adultPrice}
                  </p>
                  <p className="text-xs text-gray-400">adulto</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onEdit}
              className="p-2 bg-viva-blue/10 text-viva-blue rounded-lg hover:bg-viva-blue/20 transition"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={onToggleActive}
              className={`p-2 rounded-lg transition ${
                tour.isActive 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
              title={tour.isActive ? 'Desativar' : 'Ativar'}
            >
              {tour.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={onDelete}
              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
              title="Excluir"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de Edição de Passeio
function TourEditModal({
  tour,
  onClose,
  onSave,
  existingTours = [],
}: {
  tour: TourConfig | null;
  onClose: () => void;
  onSave: () => void;
  existingTours?: TourConfig[];
}) {
  const isEditing = !!tour;
  
  // Calcular a próxima ordem disponível para novos passeios
  const getNextOrder = () => {
    if (existingTours.length === 0) return 1;
    const maxOrder = Math.max(...existingTours.map(t => t.order || 0));
    return maxOrder + 1;
  };
  
  const [formData, setFormData] = useState<Partial<TourConfig>>({
    name: tour?.name || '',
    slug: tour?.slug || '',
    subtitle: tour?.subtitle || '',
    description: tour?.description || '',
    duration: tour?.duration || '',
    durationDetail: tour?.durationDetail || '',
    type: tour?.type || 'panoramico',
    emoji: tour?.emoji || '🚤',
    features: tour?.features || [],
    drinks: tour?.drinks || '',
    food: tour?.food || '',
    spots: tour?.spots || [],
    checkInTime: tour?.checkInTime || '8:00h',
    departureTime: tour?.departureTime || '9:15h',
    pricing: tour?.pricing || [
      {
        id: 'preco-1',
        label: 'Preço Atual',
        adultPrice: 200,
        childPrice: 100,
        freeAgeLimit: 4,
        halfPriceAgeLimit: 7,
        isActive: true,
        isCurrent: true,
      },
    ],
    isHighlighted: tour?.isHighlighted || false,
    highlightLabel: tour?.highlightLabel || '',
    order: tour?.order || getNextOrder(),
    isActive: tour?.isActive ?? true,
    images: tour?.images || [],
    whatsappMessage: tour?.whatsappMessage || '',
  });

  const [newSpot, setNewSpot] = useState('');

  const [newFeatureIcon, setNewFeatureIcon] = useState('');
  const [newFeatureLabel, setNewFeatureLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const newImages: string[] = [...(formData.images || [])];

    try {
      for (const file of Array.from(files)) {
        // Validar tamanho (max 40MB)
        if (file.size > 40 * 1024 * 1024) {
          alert(`Arquivo ${file.name} é muito grande. Máximo 40MB.`);
          continue;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
          alert(`Arquivo ${file.name} não é uma imagem válida.`);
          continue;
        }

        // Upload para Firebase Storage
        const fileName = `tours/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        newImages.push(downloadURL);
      }

      setFormData({ ...formData, images: newImages });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
      // Limpar input
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (!confirm('Deseja remover esta imagem?')) return;

    try {
      // Tentar deletar do Storage (pode falhar se for URL externa)
      if (imageUrl.includes('firebase')) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(() => {});
      }

      setFormData({
        ...formData,
        images: (formData.images || []).filter(img => img !== imageUrl),
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureIcon || !newFeatureLabel) return;
    
    setFormData({
      ...formData,
      features: [...(formData.features || []), { icon: newFeatureIcon, label: newFeatureLabel }],
    });
    setNewFeatureIcon('');
    setNewFeatureLabel('');
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: (formData.features || []).filter((_, i) => i !== index),
    });
  };

  const handleUpdatePricing = (index: number, field: keyof TourPricing, value: any) => {
    const newPricing = [...(formData.pricing || [])];
    newPricing[index] = { ...newPricing[index], [field]: value };
    setFormData({ ...formData, pricing: newPricing });
  };

  const handleAddPricing = () => {
    setFormData({
      ...formData,
      pricing: [
        ...(formData.pricing || []),
        {
          id: `preco-${Date.now()}`,
          label: 'Novo Preço',
          adultPrice: 200,
          childPrice: 100,
          freeAgeLimit: 4,
          halfPriceAgeLimit: 7,
          isActive: true,
          isCurrent: false,
        },
      ],
    });
  };

  const handleRemovePricing = (index: number) => {
    setFormData({
      ...formData,
      pricing: (formData.pricing || []).filter((_, i) => i !== index),
    });
  };

  const handleSetCurrentPricing = (index: number) => {
    const newPricing = (formData.pricing || []).map((p, i) => ({
      ...p,
      isCurrent: i === index,
    }));
    setFormData({ ...formData, pricing: newPricing });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tourData = {
        ...formData,
        slug: formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-') || '',
        updatedAt: Timestamp.now(),
      };

      if (isEditing && tour) {
        await updateDoc(doc(db, 'tourConfigs', tour.id), tourData);
      } else {
        await addDoc(collection(db, 'tourConfigs'), {
          ...tourData,
          createdAt: Timestamp.now(),
        });
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar passeio:', error);
      alert('Erro ao salvar passeio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-viva-blue-dark">
            {isEditing ? 'Editar Passeio' : 'Novo Passeio'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Passeio *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="Tour Panorâmico"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subtítulo</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="VIVA LA VIDA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
              placeholder="Descreva o passeio..."
            />
          </div>

          {/* Tipo de Passeio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Passeio *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'panoramico' | 'desembarque' | 'lancha' | 'outro' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
            >
              <option value="panoramico">🚤 Passeio Panorâmico (Principal)</option>
              <option value="desembarque">🏝️ Com Desembarque na Ilha</option>
              <option value="lancha">🛥️ Lancha Privativa</option>
              <option value="outro">✨ Outro Passeio</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'panoramico' && '⚠️ Este será exibido como o passeio principal na home'}
              {formData.type === 'desembarque' && '⚠️ Este será exibido como o segundo passeio na home'}
              {(formData.type === 'lancha' || formData.type === 'outro') && '✨ Este será exibido na seção "Outros Passeios"'}
            </p>
          </div>

          {/* Duração e Horários */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Emoji</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none text-2xl text-center"
                placeholder="🚤"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duração</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="5 horas"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in</label>
              <input
                type="text"
                value={formData.checkInTime}
                onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="8:00h"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Saída</label>
              <input
                type="text"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="9:15h"
              />
            </div>
          </div>

          {/* Features/Itens Inclusos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Itens Inclusos</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(formData.features || []).map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm"
                >
                  {feature.icon} {feature.label}
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeatureIcon}
                onChange={(e) => setNewFeatureIcon(e.target.value)}
                className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center"
                placeholder="🍹"
              />
              <input
                type="text"
                value={newFeatureLabel}
                onChange={(e) => setNewFeatureLabel(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Nome do item"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 bg-viva-blue text-white rounded-lg font-semibold hover:bg-viva-blue-dark transition"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Bebidas e Alimentação */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">🍹 Bebidas</label>
              <input
                type="text"
                value={formData.drinks}
                onChange={(e) => setFormData({ ...formData, drinks: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="1 Caipirinha por adulto e Água Mineral"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">🍽 Alimentação</label>
              <input
                type="text"
                value={formData.food}
                onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="1 Choripan por pessoa"
              />
            </div>
          </div>

          {/* Roteiro - Locais Visitados */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Roteiro (Locais Visitados)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(formData.spots || []).map((spot, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 bg-viva-blue/10 text-viva-blue px-3 py-1.5 rounded-lg text-sm"
                >
                  {spot}
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      spots: (formData.spots || []).filter((_, i) => i !== index),
                    })}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSpot}
                onChange={(e) => setNewSpot(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSpot.trim()) {
                      setFormData({
                        ...formData,
                        spots: [...(formData.spots || []), newSpot.trim()],
                      });
                      setNewSpot('');
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Nome do local (ex: Prainha da Barra)"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSpot.trim()) {
                    setFormData({
                      ...formData,
                      spots: [...(formData.spots || []), newSpot.trim()],
                    });
                    setNewSpot('');
                  }
                }}
                className="px-4 py-2 bg-viva-blue text-white rounded-lg font-semibold hover:bg-viva-blue-dark transition"
              >
                <Plus size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pressione Enter ou clique em + para adicionar cada local
            </p>
          </div>

          {/* Fotos do Passeio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📷 Fotos do Passeio
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Adicione fotos para exibir no carrossel do passeio. Máximo 40MB por imagem.
            </p>
            
            {/* Grid de imagens */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {(formData.images || []).map((imageUrl, index) => (
                <div key={index} className="relative group aspect-video rounded-xl overflow-hidden border border-gray-200">
                  <img 
                    src={imageUrl} 
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(imageUrl)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    {index + 1}
                  </span>
                </div>
              ))}
              
              {/* Botão de adicionar */}
              <label className={`
                aspect-video rounded-xl border-2 border-dashed border-gray-300 
                flex flex-col items-center justify-center cursor-pointer
                hover:border-viva-blue hover:bg-viva-blue/5 transition
                ${uploadingImage ? 'opacity-50 cursor-wait' : ''}
              `}>
                {uploadingImage ? (
                  <Loader2 size={24} className="text-viva-blue animate-spin" />
                ) : (
                  <>
                    <ImagePlus size={24} className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Adicionar</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>
            
            {(formData.images || []).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                Nenhuma foto adicionada ainda
              </p>
            )}
          </div>

          {/* Preços */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">Tabela de Preços</label>
              <button
                type="button"
                onClick={handleAddPricing}
                className="text-sm text-viva-blue font-semibold hover:underline"
              >
                + Adicionar Faixa de Preço
              </button>
            </div>
            <div className="space-y-4">
              {(formData.pricing || []).map((price, index) => (
                <div key={price.id} className={`border rounded-xl p-4 ${price.isCurrent ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={price.label}
                      onChange={(e) => handleUpdatePricing(index, 'label', e.target.value)}
                      className="font-semibold text-gray-700 bg-transparent border-b border-dashed border-gray-300 focus:border-viva-blue outline-none"
                      placeholder="Nome do período"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetCurrentPricing(index)}
                        className={`text-xs px-2 py-1 rounded ${
                          price.isCurrent 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {price.isCurrent ? '✓ Atual' : 'Definir como Atual'}
                      </button>
                      {(formData.pricing || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePricing(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Preço Adulto (R$)</label>
                      <input
                        type="number"
                        value={price.adultPrice}
                        onChange={(e) => handleUpdatePricing(index, 'adultPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Preço Criança (R$)</label>
                      <input
                        type="number"
                        value={price.childPrice}
                        onChange={(e) => handleUpdatePricing(index, 'childPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Grátis até (anos)</label>
                      <input
                        type="number"
                        value={price.freeAgeLimit}
                        onChange={(e) => handleUpdatePricing(index, 'freeAgeLimit', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Meia até (anos)</label>
                      <input
                        type="number"
                        value={price.halfPriceAgeLimit}
                        onChange={(e) => handleUpdatePricing(index, 'halfPriceAgeLimit', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destaque */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isHighlighted}
                onChange={(e) => setFormData({ ...formData, isHighlighted: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300"
              />
              <span className="font-semibold text-gray-700">Destacar este passeio (aparece como "Mais Vendido")</span>
            </label>
            {formData.isHighlighted && (
              <input
                type="text"
                value={formData.highlightLabel}
                onChange={(e) => setFormData({ ...formData, highlightLabel: e.target.value })}
                className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="⭐ MAIS VENDIDO • MELHOR CUSTO-BENEFÍCIO ⭐"
              />
            )}
          </div>

          {/* Mensagem WhatsApp */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mensagem para WhatsApp</label>
            <input
              type="text"
              value={formData.whatsappMessage}
              onChange={(e) => setFormData({ ...formData, whatsappMessage: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
              placeholder="Olá! Quero reservar o Tour Panorâmico!"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Passeio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

