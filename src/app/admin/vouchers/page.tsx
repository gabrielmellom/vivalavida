'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Users, QrCode, ArrowLeft, Search, Phone, MessageCircle, FileCheck, FileX, Send, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';
import { generateVoucherPDF, SupportedLanguage } from '@/lib/voucherGenerator';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Globe } from 'lucide-react';

// Idiomas disponíveis
const LANGUAGES: { code: SupportedLanguage; name: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export default function VouchersPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('pt-BR');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  useEffect(() => {
    // Buscar barcos
    const boatsQuery = query(collection(db, 'boats'));
    const unsubscribeBoats = onSnapshot(boatsQuery, (snapshot) => {
      const boatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Boat[];
      
      const sortedBoats = boatsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setBoats(sortedBoats);
      
      // Selecionar barco do dia se existir
      const todayBoat = sortedBoats.find(boat => {
        const boatDate = new Date(boat.date).toISOString().split('T')[0];
        return boatDate === selectedDate;
      });
      setSelectedBoat(todayBoat || null);
    });

    // Buscar todas as reservas para o calendário
    const allReservationsQuery = query(collection(db, 'reservations'), where('status', '==', 'approved'));
    const unsubscribeAllReservations = onSnapshot(allReservationsQuery, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Reservation[];
      setAllReservations(reservationsData);
    });

    return () => {
      unsubscribeBoats();
      unsubscribeAllReservations();
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedBoat) {
      setReservations([]);
      return;
    }

    // Buscar reservas aprovadas do barco
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('boatId', '==', selectedBoat.id),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        rideDate: doc.data().rideDate,
      })) as Reservation[];

      // Ordenar por nome
      reservationsData.sort((a, b) => a.customerName.localeCompare(b.customerName));
      setReservations(reservationsData);
    });

    return () => unsubscribe();
  }, [selectedBoat]);

  const handleGenerateVoucher = async (reservation: Reservation, language: SupportedLanguage = 'pt-BR') => {
    // Verificar se aceitou os termos
    if (!reservation.acceptedTerms) {
      alert('O cliente ainda não aceitou os termos. Envie o link de aceite primeiro.');
      return;
    }

    try {
      await generateVoucherPDF(reservation, selectedBoat!, language);
      setShowLanguageDropdown(null);
    } catch (error) {
      console.error('Erro ao gerar voucher:', error);
      alert('Erro ao gerar voucher. Tente novamente.');
    }
  };

  const handleToggleVoucherSent = async (reservationId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'reservations', reservationId), {
        voucherSent: !currentStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Erro ao atualizar status do voucher:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  const getWhatsAppLink = (phone: string) => {
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}`;
  };

  const handleSendTermsLink = async (reservation: Reservation) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const termsUrl = `${baseUrl}/aceite/${reservation.id}`;
    
    // Contar membros do grupo se existir
    let groupInfo = '';
    if (reservation.groupId) {
      const groupMembers = reservations.filter(r => r.groupId === reservation.groupId);
      if (groupMembers.length > 1) {
        groupInfo = `\n\n👥 Você é o responsável pelo grupo de ${groupMembers.length} pessoas. Ao aceitar os termos, você estará aceitando em nome de todo o grupo.`;
      }
    }
    
    const message = `Olá ${reservation.customerName.split(' ')[0]}! 🌊

Falta apenas um passo para completar sua reserva no passeio VIVA LA VIDA!

📋 Por favor, acesse o link abaixo para aceitar os termos do passeio:
${termsUrl}${groupInfo}

Após aceitar, você receberá seu voucher de embarque.

Obrigado e até breve! 🚢`;

    const cleanPhone = reservation.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');

    // Marcar que o link foi enviado para o responsável
    try {
      await updateDoc(doc(db, 'reservations', reservation.id), {
        termsLinkSent: true,
        termsLinkSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      // Se faz parte de um grupo, marcar que o link foi enviado para todos
      if (reservation.groupId) {
        const groupMembers = reservations.filter(r => r.groupId === reservation.groupId && r.id !== reservation.id);
        for (const member of groupMembers) {
          await updateDoc(doc(db, 'reservations', member.id), {
            termsLinkSent: true,
            termsLinkSentAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status do link:', error);
    }
  };
  
  // Verificar se deve mostrar botão de enviar termos (apenas para responsável ou individual)
  const shouldShowSendTerms = (reservation: Reservation) => {
    if (!reservation.groupId) return true; // Individual - sempre mostrar
    // Se é grupo, mostrar apenas se for o líder ou se não tiver líder definido
    return reservation.isGroupLeader === true || reservation.isGroupLeader === undefined;
  };

  const getTermsStatus = (reservation: Reservation) => {
    if (reservation.acceptedTerms && reservation.acceptedImageRights) {
      return { status: 'complete', label: 'Tudo aceito', color: 'green' };
    }
    if (reservation.acceptedTerms) {
      return { status: 'partial', label: 'Termos OK', color: 'blue' };
    }
    if (reservation.termsLinkSent) {
      return { status: 'pending', label: 'Link enviado', color: 'yellow' };
    }
    return { status: 'none', label: 'Não enviado', color: 'gray' };
  };

  const filteredReservations = reservations.filter(reservation => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reservation.customerName.toLowerCase().includes(search) ||
      reservation.phone.toLowerCase().includes(search) ||
      reservation.seatNumber?.toString().includes(search)
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  // Dados do calendário - quais dias têm barco e quais têm reservas
  const calendarData = useMemo(() => {
    const boatDates = new Map<string, { hasBoat: boolean; hasReservations: boolean; reservationCount: number }>();
    
    // Marcar dias com barco ativo
    boats.forEach(boat => {
      if (boat.status !== 'active') return;
      const dateKey = new Date(boat.date).toISOString().split('T')[0];
      if (!boatDates.has(dateKey)) {
        boatDates.set(dateKey, { hasBoat: true, hasReservations: false, reservationCount: 0 });
      }
    });
    
    // Marcar dias com reservas
    allReservations.forEach(r => {
      const dateKey = new Date(r.rideDate).toISOString().split('T')[0];
      const existing = boatDates.get(dateKey);
      if (existing) {
        existing.hasReservations = true;
        existing.reservationCount++;
      }
    });
    
    return boatDates;
  }, [boats, allReservations]);

  // Funções do calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = domingo
    
    const days: (Date | null)[] = [];
    
    // Adicionar espaços vazios para os dias antes do primeiro dia do mês
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Adicionar os dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getCalendarDayStatus = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const data = calendarData.get(dateKey);
    const isToday = dateKey === new Date().toISOString().split('T')[0];
    const isSelected = dateKey === selectedDate;
    
    return {
      hasBoat: data?.hasBoat || false,
      hasReservations: data?.hasReservations || false,
      reservationCount: data?.reservationCount || 0,
      isToday,
      isSelected,
    };
  };

  const calendarMonthName = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-viva-blue-dark">Gerenciar Vouchers</h1>
              <p className="text-gray-600 text-xs sm:text-sm">Gerar vouchers com QR code para passageiros</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Calendário Visual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6 max-w-sm">
          {/* Header do Calendário */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCalendarMonth(newMonth);
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <h3 className="text-sm sm:text-base font-bold text-gray-800 capitalize">{calendarMonthName}</h3>
            <button
              onClick={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCalendarMonth(newMonth);
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Dias do Mês */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(calendarMonth).map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="w-9 h-9 sm:w-10 sm:h-10" />;
              }

              const status = getCalendarDayStatus(date);
              const dateStr = date.toISOString().split('T')[0];

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md flex flex-col items-center justify-center text-xs font-medium transition relative ${
                    status.isSelected
                      ? 'bg-viva-blue text-white ring-2 ring-viva-blue ring-offset-1'
                      : status.hasReservations
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : status.hasBoat
                      ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      : status.isToday
                      ? 'bg-blue-50 text-viva-blue border-2 border-viva-blue hover:bg-blue-100'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{date.getDate()}</span>
                  {status.hasReservations && !status.isSelected && (
                    <span className="text-[8px] font-bold">{status.reservationCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-[10px] text-gray-600">Com reservas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-300"></div>
              <span className="text-[10px] text-gray-600">Barco ativo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-viva-blue bg-blue-50"></div>
              <span className="text-[10px] text-gray-600">Hoje</span>
            </div>
          </div>

          {/* Botão Voltar para Hoje */}
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => {
                  const todayDate = new Date();
                  setSelectedDate(todayDate.toISOString().split('T')[0]);
                  setCalendarMonth(todayDate);
                }}
                className="text-xs text-viva-blue hover:text-viva-blue-dark font-semibold"
              >
                ← Voltar para Hoje
              </button>
            </div>
          )}

          {/* Data selecionada */}
          <div className="mt-3 pt-3 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">Data selecionada:</p>
            <p className="text-sm font-bold text-viva-blue-dark">{formatDate(selectedDate)}</p>
          </div>
        </div>

        {selectedBoat ? (
          <>
            {/* Info do Barco */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-viva-blue-dark mb-2">
                    <Users size={20} className="text-viva-blue" />
                    {selectedBoat.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatDate(selectedBoat.date)} • {selectedBoat.seatsTaken} / {selectedBoat.seatsTotal} vagas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total de Reservas</p>
                  <p className="text-2xl font-bold text-viva-blue">{reservations.length}</p>
                </div>
              </div>

              {/* Busca */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar passageiro..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base bg-white"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Lista de Reservas */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-3 sm:p-6 border-b">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Passageiros ({filteredReservations.length})
                </h3>
              </div>

              {/* Mobile - Cards */}
              <div className="lg:hidden p-3 space-y-3">
                {filteredReservations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm 
                      ? `Nenhum passageiro encontrado para "${searchTerm}"`
                      : 'Nenhuma reserva aprovada para este passeio'
                    }
                  </div>
                ) : (
                  filteredReservations.map((reservation) => {
                    const termsStatus = getTermsStatus(reservation);
                    
                    return (
                    <div
                      key={reservation.id}
                      className={`rounded-lg p-4 border ${
                        reservation.acceptedTerms 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{reservation.customerName}</p>
                          <a 
                            href={getWhatsAppLink(reservation.phone)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            <MessageCircle size={14} />
                            {reservation.phone}
                          </a>
                          <p className="text-xs text-gray-500 mt-1">Assento #{reservation.seatNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-800">R$ {reservation.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Status de Aceite */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${
                        termsStatus.color === 'green' ? 'bg-green-100 border border-green-200' :
                        termsStatus.color === 'blue' ? 'bg-blue-100 border border-blue-200' :
                        termsStatus.color === 'yellow' ? 'bg-yellow-100 border border-yellow-200' :
                        'bg-gray-100 border border-gray-200'
                      }`}>
                        {termsStatus.status === 'complete' ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : termsStatus.status === 'partial' ? (
                          <FileCheck size={16} className="text-blue-600" />
                        ) : termsStatus.status === 'pending' ? (
                          <AlertCircle size={16} className="text-yellow-600" />
                        ) : (
                          <FileX size={16} className="text-gray-500" />
                        )}
                        <div className="flex-1">
                          <p className={`text-xs font-semibold ${
                            termsStatus.color === 'green' ? 'text-green-700' :
                            termsStatus.color === 'blue' ? 'text-blue-700' :
                            termsStatus.color === 'yellow' ? 'text-yellow-700' :
                            'text-gray-600'
                          }`}>
                            {termsStatus.label}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            {reservation.acceptedTerms && <span>📋 Termos</span>}
                            {reservation.acceptedImageRights && <span>📷 Imagem</span>}
                          </div>
                        </div>
                      </div>

                      {/* Checkbox para marcar como enviado */}
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={reservation.voucherSent || false}
                          onChange={() => handleToggleVoucherSent(reservation.id, reservation.voucherSent || false)}
                          className="w-4 h-4 text-viva-blue border-gray-300 rounded focus:ring-viva-blue"
                          disabled={!reservation.acceptedTerms}
                        />
                        <label className={`text-sm ${reservation.acceptedTerms ? 'text-gray-700' : 'text-gray-400'}`}>
                          Voucher enviado
                        </label>
                      </div>

                      <div className="flex items-center gap-2 text-xs mb-3">
                        {reservation.amountPaid > 0 && (
                          <span className="text-green-600">
                            Pago: R$ {reservation.amountPaid.toFixed(2)}
                          </span>
                        )}
                        {reservation.amountDue > 0 && (
                          <span className="text-orange-600 font-semibold">
                            Falta: R$ {reservation.amountDue.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      <div className="space-y-2">
                        {!reservation.acceptedTerms && shouldShowSendTerms(reservation) && (
                          <button
                            onClick={() => handleSendTermsLink(reservation)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
                          >
                            <Send size={18} />
                            {reservation.groupId ? 'Enviar Termos (Responsável)' : 'Enviar Link de Termos'}
                          </button>
                        )}
                        {!reservation.acceptedTerms && reservation.groupId && !shouldShowSendTerms(reservation) && (
                          <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-500 rounded-lg font-semibold text-sm">
                            <Users size={16} />
                            Aguardando aceite do responsável
                          </div>
                        )}
                        
                        <div className="relative">
                          <button
                            onClick={() => setShowLanguageDropdown(showLanguageDropdown === reservation.id ? null : reservation.id)}
                            disabled={!reservation.acceptedTerms}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition ${
                              reservation.acceptedTerms
                                ? 'bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white hover:shadow-lg'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <QrCode size={18} />
                            {reservation.acceptedTerms ? 'Gerar Voucher' : 'Aguardando Aceite'}
                            {reservation.acceptedTerms && <Globe size={14} />}
                          </button>
                          
                          {/* Dropdown de idiomas */}
                          {showLanguageDropdown === reservation.id && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <div className="p-2">
                                <p className="text-xs text-gray-500 mb-2 text-center">Selecione o idioma</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {LANGUAGES.map((lang) => (
                                    <button
                                      key={lang.code}
                                      onClick={() => handleGenerateVoucher(reservation, lang.code)}
                                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition"
                                    >
                                      <span>{lang.flag}</span>
                                      <span>{lang.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>

              {/* Desktop - Tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Enviado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Passageiro</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aceite</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pendente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-500">
                          {searchTerm 
                            ? `Nenhum passageiro encontrado para "${searchTerm}"`
                            : 'Nenhuma reserva aprovada para este passeio'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredReservations.map((reservation) => {
                        const termsStatus = getTermsStatus(reservation);
                        
                        return (
                        <tr key={reservation.id} className={`hover:bg-gray-50 ${
                          reservation.acceptedTerms ? 'bg-green-50/50' : ''
                        }`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={reservation.voucherSent || false}
                              onChange={() => handleToggleVoucherSent(reservation.id, reservation.voucherSent || false)}
                              className="w-4 h-4 text-viva-blue border-gray-300 rounded focus:ring-viva-blue"
                              disabled={!reservation.acceptedTerms}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                            <a 
                              href={getWhatsAppLink(reservation.phone)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium mt-1"
                            >
                              <MessageCircle size={14} />
                              {reservation.phone}
                            </a>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-gray-700">#{reservation.seatNumber}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              termsStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                              termsStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                              termsStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {termsStatus.status === 'complete' ? (
                                <CheckCircle size={12} />
                              ) : termsStatus.status === 'partial' ? (
                                <FileCheck size={12} />
                              ) : termsStatus.status === 'pending' ? (
                                <AlertCircle size={12} />
                              ) : (
                                <FileX size={12} />
                              )}
                              {termsStatus.label}
                            </div>
                            {reservation.acceptedTerms && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                                <span>📋</span>
                                {reservation.acceptedImageRights && <span>📷</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-semibold text-gray-800">R$ {reservation.totalAmount.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-semibold ${reservation.amountDue > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                              R$ {reservation.amountDue.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {!reservation.acceptedTerms && shouldShowSendTerms(reservation) && (
                                <button
                                  onClick={() => handleSendTermsLink(reservation)}
                                  className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition text-xs"
                                  title={reservation.groupId ? "Enviar link de termos (responsável do grupo)" : "Enviar link de termos via WhatsApp"}
                                >
                                  <Send size={14} />
                                  {reservation.groupId ? 'Resp.' : 'Termos'}
                                </button>
                              )}
                              {!reservation.acceptedTerms && reservation.groupId && !shouldShowSendTerms(reservation) && (
                                <span className="text-xs text-gray-400">Aguard. resp.</span>
                              )}
                              <div className="relative">
                                <button
                                  onClick={() => setShowLanguageDropdown(showLanguageDropdown === `desktop-${reservation.id}` ? null : `desktop-${reservation.id}`)}
                                  disabled={!reservation.acceptedTerms}
                                  className={`flex items-center gap-1 px-3 py-2 rounded-lg font-semibold transition text-xs ${
                                    reservation.acceptedTerms
                                      ? 'bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white hover:shadow-lg'
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={reservation.acceptedTerms ? 'Gerar Voucher PDF' : 'Aguardando aceite dos termos'}
                                >
                                  <QrCode size={14} />
                                  Voucher
                                  {reservation.acceptedTerms && <Globe size={12} />}
                                </button>
                                
                                {/* Dropdown de idiomas desktop */}
                                {showLanguageDropdown === `desktop-${reservation.id}` && (
                                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                                    <div className="p-2">
                                      <p className="text-xs text-gray-500 mb-2 text-center">Idioma do Voucher</p>
                                      {LANGUAGES.map((lang) => (
                                        <button
                                          key={lang.code}
                                          onClick={() => handleGenerateVoucher(reservation, lang.code)}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition"
                                        >
                                          <span>{lang.flag}</span>
                                          <span>{lang.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-12 shadow-sm text-center border border-gray-200">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">Nenhum passeio encontrado para esta data</p>
          </div>
        )}
      </div>
    </div>
  );
}

