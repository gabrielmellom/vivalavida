'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, doc, onSnapshot, Timestamp, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Boat, Reservation, PaymentMethod, Payment } from '@/types';
import { DollarSign, ChevronLeft, ChevronRight, Sparkles, Ship } from 'lucide-react';
import { Calendar, Users, CheckCircle, LogOut, Plus, User, Phone, Mail, MapPin, CreditCard, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Cores para identificar grupos (paleta vibrante)
const GROUP_COLORS = [
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', badge: 'bg-purple-500' },
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', badge: 'bg-blue-500' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700', badge: 'bg-pink-500' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-700', badge: 'bg-teal-500' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', badge: 'bg-amber-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-700', badge: 'bg-indigo-500' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-700', badge: 'bg-rose-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-700', badge: 'bg-cyan-500' },
  { bg: 'bg-lime-100', border: 'border-lime-400', text: 'text-lime-700', badge: 'bg-lime-600' },
  { bg: 'bg-fuchsia-100', border: 'border-fuchsia-400', text: 'text-fuchsia-700', badge: 'bg-fuchsia-500' },
];

// Formatar data sem problemas de timezone (fora do componente para ser acessível a todos)
const formatDateSafe = (dateString: string) => {
  // Se a string estiver vazia ou inválida, retorna string vazia
  if (!dateString) return '';
  // Pega apenas a parte YYYY-MM-DD (antes do T se houver)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

// Interface para dados de cada pessoa
interface PersonData {
  name: string;
  document: string;
  phone: string;
  birthDate: string;
  email: string;
  address: string;
  isChild: boolean;
  isHalfPrice: boolean;
  amount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
}

export default function VendedorDashboard() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reservationForPayment, setReservationForPayment] = useState<Reservation | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date()); // Mês do calendário
  
  // Estado do Wizard
  const [showWizard, setShowWizard] = useState(false);
  
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let unsubscribeBoats: (() => void) | null = null;
    let unsubscribeReservations: (() => void) | null = null;

    // Listener em tempo real para barcos ativos
    const boatsQuery = query(
      collection(db, 'boats'),
      where('status', '==', 'active'),
      orderBy('date', 'asc')
    );
    
    unsubscribeBoats = onSnapshot(
      boatsQuery,
      (snapshot) => {
        const boatsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Boat[];
        setBoats(boatsData);
      },
      (error) => {
        console.error('Erro ao carregar barcos:', error);
        // Se for erro de índice faltando, tenta buscar sem orderBy
        if (error.code === 'failed-precondition') {
          const simpleQuery = query(
            collection(db, 'boats'),
            where('status', '==', 'active')
          );
          unsubscribeBoats = onSnapshot(simpleQuery, (snapshot) => {
            const boatsData = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
              })) as Boat[];
            // Ordenar manualmente
            boatsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setBoats(boatsData);
          });
        }
      }
    );

    // Listener para reservas do vendedor
    if (user) {
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('vendorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      unsubscribeReservations = onSnapshot(
        reservationsQuery,
        (snapshot) => {
          const reservationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            rideDate: doc.data().rideDate,
          })) as Reservation[];
          setMyReservations(reservationsData);
        },
        (error) => {
          console.error('Erro ao carregar reservas:', error);
          // Se for erro de índice faltando, tenta buscar sem orderBy
          if (error.code === 'failed-precondition') {
            const simpleQuery = query(
              collection(db, 'reservations'),
              where('vendorId', '==', user.uid)
            );
            unsubscribeReservations = onSnapshot(simpleQuery, (snapshot) => {
              const reservationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
                rideDate: doc.data().rideDate,
              })) as Reservation[];
              // Ordenar manualmente
              reservationsData.sort((a, b) => {
                const aDate = a.createdAt?.getTime() || 0;
                const bDate = b.createdAt?.getTime() || 0;
                return bDate - aDate; // desc
              });
              setMyReservations(reservationsData);
            });
          }
        }
      );
    }

    return () => {
      if (unsubscribeBoats) unsubscribeBoats();
      if (unsubscribeReservations) unsubscribeReservations();
    };
  }, [user]);


  // Formatar data sem problemas de timezone
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  // Filtrar reservas pela data selecionada (por rideDate) e excluir canceladas
  // Ordenar para manter grupos juntos
  const filteredReservations = myReservations
    .filter(r => {
      const reservationDate = new Date(r.rideDate).toISOString().split('T')[0];
      return reservationDate === filterDate && r.status !== 'cancelled';
    })
    .sort((a, b) => {
      // Primeiro, ordenar por groupId para manter grupos juntos
      if (a.groupId && b.groupId) {
        if (a.groupId !== b.groupId) {
          return a.groupId.localeCompare(b.groupId);
        }
      }
      if (a.groupId && !b.groupId) return -1;
      if (!a.groupId && b.groupId) return 1;
      // Depois por nome do cliente
      return a.customerName.localeCompare(b.customerName);
    });

  // Criar mapa de cores para grupos
  const groupColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let colorIndex = 0;
    
    filteredReservations.forEach(r => {
      if (r.groupId && !map.has(r.groupId)) {
        map.set(r.groupId, colorIndex);
        colorIndex++;
      }
    });
    
    return map;
  }, [filteredReservations]);

  // Contar membros de cada grupo
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredReservations.forEach(r => {
      if (r.groupId) {
        counts.set(r.groupId, (counts.get(r.groupId) || 0) + 1);
      }
    });
    return counts;
  }, [filteredReservations]);

  // Função auxiliar para obter cor de grupo
  const getGroupColor = (groupId: string | undefined) => {
    if (!groupId) return null;
    const colorIndex = groupColorMap.get(groupId);
    if (colorIndex === undefined) return null;
    return GROUP_COLORS[colorIndex % GROUP_COLORS.length];
  };

  // Filtrar barcos pela data selecionada
  const filteredBoats = boats.filter(boat => {
    const boatDate = new Date(boat.date).toISOString().split('T')[0];
    return boatDate === filterDate;
  });

  // Estatísticas da data selecionada
  const filteredApproved = filteredReservations.filter(r => r.status === 'approved').length;

  // Dados do calendário - quais dias têm barco e quais têm reservas
  const calendarData = useMemo(() => {
    const boatDates = new Map<string, { hasBoat: boolean; hasReservations: boolean; reservationCount: number }>();
    
    // Marcar dias com barco
    boats.forEach(boat => {
      if (boat.status !== 'active') return;
      const dateKey = new Date(boat.date).toISOString().split('T')[0];
      if (!boatDates.has(dateKey)) {
        boatDates.set(dateKey, { hasBoat: true, hasReservations: false, reservationCount: 0 });
      }
    });
    
    // Marcar dias com reservas (apenas do vendedor logado)
    myReservations.forEach(r => {
      if (r.status === 'cancelled') return;
      const dateKey = new Date(r.rideDate).toISOString().split('T')[0];
      const existing = boatDates.get(dateKey);
      if (existing) {
        existing.hasReservations = true;
        existing.reservationCount++;
      }
    });
    
    return boatDates;
  }, [boats, myReservations]);

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
    const isSelected = dateKey === filterDate;
    
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header - Responsivo */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Painel Vendedor
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm">Gerenciar Reservas</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-gray-600 text-xs sm:text-sm hidden sm:block max-w-[150px] truncate">{user?.email}</span>
              <button
                onClick={() => {
                  signOut();
                  router.push('/login');
                }}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Botão Criar Reserva - Destaque Principal */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => setShowWizard(true)}
            className="w-full sm:w-auto group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white px-8 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Plus size={28} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-xl font-black">Criar Nova Reserva</p>
                <p className="text-sm text-white/80 font-normal">Passo a passo rápido e fácil</p>
              </div>
              <Sparkles className="text-yellow-300 animate-pulse" size={24} />
            </div>
          </button>
        </div>

        {/* Stats - Grid responsivo */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-6 shadow-sm border border-white/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Barcos</p>
                <p className="text-2xl sm:text-3xl font-black text-blue-600">{filteredBoats.length}</p>
              </div>
              <Calendar className="text-blue-500 hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-6 shadow-sm border border-white/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Reservas</p>
                <p className="text-2xl sm:text-3xl font-black text-orange-500">{filteredReservations.length}</p>
              </div>
              <Users className="text-orange-500 hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-6 shadow-sm border border-white/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Aprovadas</p>
                <p className="text-2xl sm:text-3xl font-black text-green-500">
                  {filteredApproved}
                </p>
              </div>
              <CheckCircle className="text-green-500 hidden sm:block" size={32} />
            </div>
          </div>
        </div>

        {/* Barcos Programados - Calendário Visual */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Barcos Programados</h2>

          {/* Calendário Visual - Igual ao Admin */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:max-w-md lg:max-w-lg">
            {/* Header do Calendário */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button
                onClick={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(newMonth.getMonth() - 1);
                  setCalendarMonth(newMonth);
                }}
                className="p-2 sm:p-3 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft size={18} className="sm:w-5 sm:h-5 text-slate-600" />
              </button>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 capitalize">{calendarMonthName}</h3>
              <button
                onClick={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setCalendarMonth(newMonth);
                }}
                className="p-2 sm:p-3 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight size={18} className="sm:w-5 sm:h-5 text-slate-600" />
              </button>
            </div>

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-3">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-slate-400 py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do Mês */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {getDaysInMonth(calendarMonth).map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14" />;
                }

                const status = getCalendarDayStatus(date);
                const dateStr = date.toISOString().split('T')[0];

                return (
                  <button
                    key={dateStr}
                    onClick={() => setFilterDate(dateStr)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl flex flex-col items-center justify-center text-sm sm:text-base font-medium transition relative ${
                      status.isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : status.hasReservations
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : status.hasBoat
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : status.isToday
                        ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-400 ring-offset-1'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span>{date.getDate()}</span>
                    {status.hasReservations && !status.isSelected && (
                      <span className="text-[8px] sm:text-[10px] font-bold">{status.reservationCount}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500"></div>
                <span className="text-xs sm:text-sm text-slate-500">Suas reservas</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-200"></div>
                <span className="text-xs sm:text-sm text-slate-500">Barco ativo</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full ring-2 ring-sky-400 bg-sky-100"></div>
                <span className="text-xs sm:text-sm text-slate-500">Hoje</span>
              </div>
            </div>

            {/* Botão Voltar para Hoje */}
            {filterDate !== new Date().toISOString().split('T')[0] && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    const todayDate = new Date();
                    setFilterDate(todayDate.toISOString().split('T')[0]);
                    setCalendarMonth(todayDate);
                  }}
                  className="text-sm sm:text-base text-sky-600 hover:text-sky-700 font-medium"
                >
                  ← Voltar para Hoje
                </button>
              </div>
            )}
          </div>

          {/* Cards dos Barcos do Dia Selecionado */}
          {filteredBoats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {filteredBoats.map((boat) => {
                const vagasDisponiveis = boat.seatsTotal - boat.seatsTaken;
                return (
                  <div key={boat.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{boat.boatType === 'escuna' ? '🚢' : '🚤'}</span>
                      <span className="font-bold text-gray-800">{boat.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        boat.boatType === 'escuna' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {boat.boatType === 'escuna' ? 'Escuna' : 'Lancha'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users size={14} className="text-blue-500" />
                      <span><strong>{vagasDisponiveis}</strong> vagas livres de {boat.seatsTotal}</span>
                    </div>
                    {/* Vagas por tipo - para escunas */}
                    {boat.boatType === 'escuna' && boat.seatsWithLanding !== undefined && (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">🏝️ Com Desembarque:</span>
                          <span className={`font-bold ${
                            (boat.seatsWithLandingTaken || 0) >= (boat.seatsWithLanding || 0) 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {(boat.seatsWithLanding || 0) - (boat.seatsWithLandingTaken || 0)} livres
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">🚤 Panorâmico:</span>
                          <span className={`font-bold ${
                            (boat.seatsWithoutLandingTaken || 0) >= (boat.seatsWithoutLanding || 0) 
                              ? 'text-red-600' 
                              : 'text-blue-600'
                          }`}>
                            {(boat.seatsWithoutLanding || 0) - (boat.seatsWithoutLandingTaken || 0)} livres
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Minhas Reservas do Dia */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              Reservas de {formatDate(filterDate)}
            </h2>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="sm:hidden space-y-3">
            {filteredReservations.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/40">
                <Users className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm">Nenhuma reserva para {formatDate(filterDate)}</p>
              </div>
            ) : (
              filteredReservations.map((reservation) => {
                const groupColor = getGroupColor(reservation.groupId);
                const groupSize = reservation.groupId ? groupCounts.get(reservation.groupId) || 0 : 0;
                
                return (
                <div key={reservation.id} className={`rounded-xl p-4 shadow-sm border-2 ${
                  groupColor
                    ? `${groupColor.bg} ${groupColor.border}`
                    : 'bg-white/80 backdrop-blur-sm border-white/40'
                }`}>
                  {/* Badge de Grupo */}
                  {groupColor && groupSize > 1 && (
                    <div className={`${groupColor.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-2`}>
                      <Users size={12} />
                      Grupo de {groupSize}
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{reservation.customerName}</p>
                      <p className="text-sm text-gray-500">{reservation.phone}</p>
                    </div>
                    {groupColor ? (
                      <span className={`${groupColor.badge} text-white text-sm font-bold px-2.5 py-1 rounded-lg`}>
                        <Users size={14} />
                      </span>
                    ) : (
                      <span className="bg-gray-400 text-white text-sm font-bold px-2.5 py-1 rounded-lg">
                        <User size={14} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        reservation.status === 'approved' ? 'bg-green-100 text-green-700' :
                        reservation.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {reservation.status === 'approved' ? '✓ Aprovada' :
                         reservation.status === 'pending' ? '⏳ Pendente' : '✕ Cancelada'}
                      </span>
                    </div>
                    <span className="font-bold text-gray-800">
                      R$ {reservation.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
              })
            )}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden sm:block bg-white/80 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-white/40">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grupo</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pagamento</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma reserva para {formatDate(filterDate)}
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((reservation) => {
                      const groupColor = getGroupColor(reservation.groupId);
                      const groupSize = reservation.groupId ? groupCounts.get(reservation.groupId) || 0 : 0;
                      
                      return (
                      <tr key={reservation.id} className={`hover:bg-gray-50/50 ${
                        groupColor ? groupColor.bg : ''
                      }`}>
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            {/* Badge de grupo inline */}
                            {groupColor && groupSize > 1 && (
                              <span className={`${groupColor.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1`}>
                                <Users size={10} />
                                Grupo de {groupSize}
                              </span>
                            )}
                            <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                            <p className="text-sm text-gray-500">{reservation.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600">
                          {formatDateSafe(reservation.rideDate)}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          {groupColor ? (
                            <span className={`${groupColor.badge} text-white font-bold px-2 py-1 rounded text-sm inline-flex items-center gap-1`}>
                              <Users size={12} />
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded text-sm">
                              Individual
                            </span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            reservation.status === 'approved' ? 'bg-green-100 text-green-700' :
                            reservation.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {reservation.status === 'approved' ? 'Aprovada' :
                             reservation.status === 'pending' ? 'Pendente' : 'Cancelada'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-900">
                          <div>
                            <p>Total: R$ {reservation.totalAmount.toFixed(2)}</p>
                            <p className="text-green-600">Pago: R$ {reservation.amountPaid.toFixed(2)}</p>
                            {reservation.amountDue > 0 && (
                              <p className="text-orange-600 font-bold">Falta: R$ {reservation.amountDue.toFixed(2)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className="text-xs capitalize">{reservation.paymentMethod}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          {reservation.status === 'approved' && reservation.amountDue > 0 && (
                            <button
                              onClick={() => {
                                setReservationForPayment(reservation);
                                setShowPaymentModal(true);
                              }}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition flex items-center gap-1"
                            >
                              <DollarSign size={14} />
                              Pagar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard de Reserva */}
      {showWizard && user && (
        <ReservationWizard
          boats={boats}
          onClose={() => setShowWizard(false)}
          vendorId={user.uid}
        />
      )}
      
      {/* Modal Registrar Pagamento */}
      {showPaymentModal && reservationForPayment && user && (
        <PaymentModal
          reservation={reservationForPayment}
          onClose={() => {
            setShowPaymentModal(false);
            setReservationForPayment(null);
          }}
          onPayment={async (amount: number, method: PaymentMethod) => {
            try {
              const newAmountPaid = reservationForPayment.amountPaid + amount;
              const newAmountDue = reservationForPayment.totalAmount - newAmountPaid;

              // Criar registro de pagamento
              await addDoc(collection(db, 'payments'), {
                reservationId: reservationForPayment.id,
                amount,
                method,
                source: 'vendedor',
                vendorId: user.uid,
                createdAt: Timestamp.now(),
                createdBy: user.uid,
              });

              // Atualizar reserva
              await updateDoc(doc(db, 'reservations', reservationForPayment.id), {
                amountPaid: newAmountPaid,
                amountDue: newAmountDue,
                updatedAt: Timestamp.now(),
              });

              setShowPaymentModal(false);
              setReservationForPayment(null);
              alert('Pagamento registrado com sucesso!');
            } catch (error) {
              console.error('Erro ao registrar pagamento:', error);
              alert('Erro ao registrar pagamento');
            }
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({
  reservation,
  onClose,
  onPayment,
}: {
  reservation: Reservation;
  onClose: () => void;
  onPayment: (amount: number, method: PaymentMethod) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount) || 0;
    
    if (paymentAmount <= 0) {
      alert('O valor deve ser maior que zero!');
      return;   
    }
    
    if (paymentAmount > reservation.amountDue) {
      alert(`O valor não pode ser maior que o devido (R$ ${reservation.amountDue.toFixed(2)})!`);
      return;
    }

    setLoading(true);
    try {
      await onPayment(paymentAmount, method);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-black text-gray-800 mb-4">Registrar Pagamento</h3>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">Cliente: <strong>{reservation.customerName}</strong></p>
          <p className="text-sm text-gray-600 mb-1">Total: R$ {reservation.totalAmount.toFixed(2)}</p>
          <p className="text-sm text-green-600 mb-1">Pago: R$ {reservation.amountPaid.toFixed(2)}</p>
          <p className="text-sm text-orange-600 font-bold">Falta: R$ {reservation.amountDue.toFixed(2)}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Recebido (R$)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                const numValue = parseFloat(value);
                if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= reservation.amountDue)) {
                  setAmount(value);
                }
              }}
              step="0.01"
              min="0"
              max={reservation.amountDue}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-bold"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== WIZARD DE RESERVA PASSO A PASSO =====
function ReservationWizard({
  boats,
  onClose,
  vendorId,
}: {
  boats: Boat[];
  onClose: () => void;
  vendorId: string;
}) {
  // Estados do wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [currentPersonIndex, setCurrentPersonIndex] = useState(0);
  const [people, setPeople] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [escunaType, setEscunaType] = useState<'sem-desembarque' | 'com-desembarque'>('sem-desembarque');

  // Calcular total de passos: 1 (data) + 1 (qtd pessoas) + numberOfPeople (dados) + 1 (pagamento)
  const totalSteps = 3 + numberOfPeople;
  
  // Barcos disponíveis para a data selecionada
  const boatsForDate = boats.filter(boat => {
    const boatDate = new Date(boat.date).toISOString().split('T')[0];
    return boatDate === selectedDate;
  });

  // Buscar assentos disponíveis quando um barco é selecionado
  useEffect(() => {
    if (!selectedBoat) {
      setAvailableSeats([]);
      return;
    }

    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('boatId', '==', selectedBoat.id),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservations = snapshot.docs.map(doc => doc.data()) as Reservation[];
      const takenSeats = reservations.map(r => r.seatNumber);
      
      const available: number[] = [];
      for (let i = 1; i <= selectedBoat.seatsTotal; i++) {
        if (!takenSeats.includes(i)) {
          available.push(i);
        }
      }
      setAvailableSeats(available);
    });

    return unsubscribe;
  }, [selectedBoat]);

  // Inicializar array de pessoas quando mudar a quantidade
  useEffect(() => {
    const newPeople: PersonData[] = [];
    for (let i = 0; i < numberOfPeople; i++) {
      newPeople.push(people[i] || {
        name: '',
        document: '',
        phone: '',
        birthDate: '',
        email: '',
        address: '',
        isChild: false,
        isHalfPrice: false,
        amount: 200, // Valor padrão
        paymentMethod: 'pix',
        amountPaid: 0,
      });
    }
    setPeople(newPeople);
  }, [numberOfPeople]);

  // Selecionar automaticamente os assentos quando a quantidade muda
  useEffect(() => {
    if (availableSeats.length > 0 && numberOfPeople > 0) {
      setSelectedSeats(availableSeats.slice(0, numberOfPeople));
    }
  }, [numberOfPeople, availableSeats]);


  // Calcular totais
  const totalAmount = people.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = people.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalRemaining = totalAmount - totalPaid;

  // Validações por passo
  const canProceed = () => {
    if (currentStep === 1) {
      return selectedDate && selectedBoat;
    }
    if (currentStep === 2) {
      return numberOfPeople >= 1 && numberOfPeople <= availableSeats.length;
    }
    // Passos de dados das pessoas (3 até 2 + numberOfPeople)
    if (currentStep >= 3 && currentStep < 3 + numberOfPeople) {
      const personIndex = currentStep - 3;
      const person = people[personIndex];
      return person && person.name && person.document && person.phone && person.birthDate;
    }
    // Último passo (pagamento)
    return true;
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBoat) {
      setError('Selecione um barco');
      return;
    }

    // Verificar se há vagas suficientes
    const vagasDisponiveis = selectedBoat.seatsTotal - selectedBoat.seatsTaken;
    if (numberOfPeople > vagasDisponiveis) {
      setError(`Não há vagas suficientes. Disponíveis: ${vagasDisponiveis}`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Gerar groupId para reservas em grupo
      const groupId = people.length > 1 ? `group_${Date.now()}` : undefined;
      const baseTimestamp = Date.now();

      // Criar uma reserva para cada pessoa
      const reservationPromises = people.map(async (person, index) => {
        // Gerar número de identificação único baseado em timestamp
        const seatNumber = baseTimestamp + index;
        
        const reservationData: Record<string, unknown> = {
          boatId: selectedBoat.id,
          seatNumber, // Agora é apenas um ID único, não um assento real
          status: 'pending',
          customerName: person.name,
          phone: person.phone,
          whatsapp: person.phone,
          address: person.address || '',
          document: person.document,
          birthDate: person.birthDate,
          email: person.email || '',
          paymentMethod: person.paymentMethod,
          totalAmount: person.amount,
          amountPaid: person.amountPaid,
          amountDue: person.amount - person.amountPaid,
          vendorId,
          rideDate: selectedBoat.date,
          isChild: person.isChild,
          isHalfPrice: person.isHalfPrice,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        if (groupId) reservationData.groupId = groupId;
        if (selectedBoat.boatType === 'escuna') {
          reservationData.escunaType = escunaType;
        }

        return addDoc(collection(db, 'reservations'), reservationData);
      });

      await Promise.all(reservationPromises);
      alert(`${people.length} reserva(s) criada(s) com sucesso! Aguardando aprovação do administrador.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar reservas');
    } finally {
      setLoading(false);
    }
  };

  // Formatar data para exibição
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${weekdays[date.getDay()]}, ${day} de ${months[month - 1]} de ${year}`;
  };

  // Renderizar indicador de progresso
  const renderProgressBar = () => {
    const stepLabels = ['Data', 'Pessoas', ...Array.from({ length: numberOfPeople }, (_, i) => `Pessoa ${i + 1}`), 'Pagamento'];
    const displaySteps = stepLabels.slice(0, totalSteps);
    
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {displaySteps.map((label, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span className={`text-xs mt-1 text-center ${isActive ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Nova Reserva
            </h2>
            <p className="text-gray-500 text-sm">Passo {currentStep} de {totalSteps}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de Progresso */}
        {renderProgressBar()}

        {/* Conteúdo do Passo */}
        <div className="min-h-[300px]">
          {/* PASSO 1: Seleção de Data e Barco */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Quando será o passeio?</h3>
                <p className="text-gray-500">Selecione a data e o barco desejado</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Data do Passeio
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedBoat(null);
                    setSelectedSeats([]);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                />
                {selectedDate && (
                  <p className="mt-2 text-sm text-blue-600 font-medium">
                    {formatDisplayDate(selectedDate)}
                  </p>
                )}
              </div>

              {selectedDate && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    🚢 Selecione o Barco
                  </label>
                  {boatsForDate.length === 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <p className="text-orange-700 font-medium">Nenhum barco disponível para esta data</p>
                      <p className="text-orange-600 text-sm">Tente selecionar outra data</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {boatsForDate.map((boat) => {
                        const availableCount = boat.seatsTotal - boat.seatsTaken;
                        const isSelected = selectedBoat?.id === boat.id;
                        // Calcular vagas por tipo para escunas
                        const vagasComDesembarque = boat.boatType === 'escuna' && boat.seatsWithLanding !== undefined
                          ? (boat.seatsWithLanding || 0) - (boat.seatsWithLandingTaken || 0)
                          : 0;
                        const vagasPanoramico = boat.boatType === 'escuna' && boat.seatsWithoutLanding !== undefined
                          ? (boat.seatsWithoutLanding || 0) - (boat.seatsWithoutLandingTaken || 0)
                          : 0;
                        
                        return (
                          <button
                            key={boat.id}
                            type="button"
                            onClick={() => {
                              setSelectedBoat(boat);
                              setSelectedSeats([]);
                            }}
                            disabled={availableCount === 0}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                : availableCount === 0
                                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {boat.boatType === 'escuna' ? '🚢' : '🚤'}
                                  </span>
                                  <span className="font-bold text-gray-800">{boat.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    boat.boatType === 'escuna' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {boat.boatType === 'escuna' ? 'Escuna' : 'Lancha'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  <strong>{availableCount}</strong> vagas disponíveis de {boat.seatsTotal}
                                </p>
                                
                                {/* Vagas por tipo de serviço - apenas para escunas */}
                                {boat.boatType === 'escuna' && boat.seatsWithLanding !== undefined && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">🏝️ Com Desembarque:</span>
                                      <span className={`font-bold ${
                                        vagasComDesembarque <= 0 ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                        {vagasComDesembarque} livres / {boat.seatsWithLanding}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">🚤 Panorâmico:</span>
                                      <span className={`font-bold ${
                                        vagasPanoramico <= 0 ? 'text-red-600' : 'text-blue-600'
                                      }`}>
                                        {vagasPanoramico} livres / {boat.seatsWithoutLanding}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-3 ${
                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <span className="text-white text-sm">✓</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tipo de passeio para Escuna */}
              {selectedBoat?.boatType === 'escuna' && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Passeio</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEscunaType('sem-desembarque')}
                      className={`px-4 py-3 rounded-xl font-bold transition ${
                        escunaType === 'sem-desembarque'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Sem Desembarque
                    </button>
                    <button
                      type="button"
                      onClick={() => setEscunaType('com-desembarque')}
                      className={`px-4 py-3 rounded-xl font-bold transition ${
                        escunaType === 'com-desembarque'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Com Desembarque
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* PASSO 2: Quantidade de Pessoas */}
          {currentStep === 2 && selectedBoat && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Quantas pessoas vão no passeio?</h3>
                <p className="text-gray-500">Selecione a quantidade de passageiros</p>
              </div>

              {/* Vagas disponíveis */}
              {(() => {
                const vagasDisponiveis = selectedBoat.seatsTotal - selectedBoat.seatsTaken;
                // Calcular vagas por tipo para escunas
                const vagasComDesembarque = selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined
                  ? (selectedBoat.seatsWithLanding || 0) - (selectedBoat.seatsWithLandingTaken || 0)
                  : 0;
                const vagasPanoramico = selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithoutLanding !== undefined
                  ? (selectedBoat.seatsWithoutLanding || 0) - (selectedBoat.seatsWithoutLandingTaken || 0)
                  : 0;
                
                // Determinar limite baseado no tipo selecionado
                const limiteVagas = selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined
                  ? (escunaType === 'com-desembarque' ? vagasComDesembarque : vagasPanoramico)
                  : vagasDisponiveis;
                
                return (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-blue-800 text-lg">
                        🎫 <strong>{vagasDisponiveis}</strong> vagas totais disponíveis de <strong>{selectedBoat.seatsTotal}</strong>
                      </p>
                    </div>

                    {/* Detalhamento de vagas por tipo - apenas para escunas */}
                    {selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-xl p-4 border-2 ${
                          escunaType === 'com-desembarque' 
                            ? 'bg-green-50 border-green-400' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="text-center">
                            <span className="text-2xl">🏝️</span>
                            <p className="text-sm font-semibold text-gray-700 mt-1">Com Desembarque</p>
                            <p className={`text-2xl font-black ${
                              vagasComDesembarque <= 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {vagasComDesembarque}
                            </p>
                            <p className="text-xs text-gray-500">vagas livres</p>
                            {escunaType === 'com-desembarque' && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                                ✓ Selecionado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`rounded-xl p-4 border-2 ${
                          escunaType === 'sem-desembarque' 
                            ? 'bg-blue-50 border-blue-400' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="text-center">
                            <span className="text-2xl">🚤</span>
                            <p className="text-sm font-semibold text-gray-700 mt-1">Panorâmico</p>
                            <p className={`text-2xl font-black ${
                              vagasPanoramico <= 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {vagasPanoramico}
                            </p>
                            <p className="text-xs text-gray-500">vagas livres</p>
                            {escunaType === 'sem-desembarque' && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                                ✓ Selecionado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newCount = Math.max(1, numberOfPeople - 1);
                          setNumberOfPeople(newCount);
                        }}
                        className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600 transition shadow-sm"
                      >
                        −
                      </button>
                      <div className="text-center px-6">
                        <span className="text-7xl font-black text-blue-600">{numberOfPeople}</span>
                        <p className="text-gray-500 mt-2 text-lg">{numberOfPeople === 1 ? 'pessoa' : 'pessoas'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newCount = Math.min(limiteVagas, numberOfPeople + 1);
                          setNumberOfPeople(newCount);
                        }}
                        disabled={numberOfPeople >= limiteVagas}
                        className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    {numberOfPeople > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center animate-fadeIn">
                        <p className="text-green-800 font-medium text-lg">
                          ✅ {numberOfPeople} {numberOfPeople === 1 ? 'vaga será reservada' : 'vagas serão reservadas'}
                          {selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined && (
                            <span className="block text-sm mt-1">
                              ({escunaType === 'com-desembarque' ? '🏝️ Com Desembarque' : '🚤 Panorâmico'})
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Aviso quando não há vagas do tipo selecionado */}
                    {selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined && limiteVagas <= 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center animate-fadeIn">
                        <p className="text-red-700 font-medium">
                          ⚠️ Não há vagas disponíveis para {escunaType === 'com-desembarque' ? 'Com Desembarque' : 'Panorâmico'}
                        </p>
                        <p className="text-red-600 text-sm mt-1">
                          Volte e selecione outro tipo de passeio
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* PASSOS 3 a 2+N: Dados de cada pessoa */}
          {currentStep >= 3 && currentStep < 3 + numberOfPeople && (
            <div className="space-y-5 animate-fadeIn">
              {(() => {
                const personIndex = currentStep - 3;
                const person = people[personIndex] || {
                  name: '',
                  document: '',
                  phone: '',
                  birthDate: '',
                  email: '',
                  address: '',
                  isChild: false,
                  isHalfPrice: false,
                  amount: 200,
                  paymentMethod: 'pix',
                  amountPaid: 0,
                };
                const seatNumber = selectedSeats[personIndex];

                return (
                  <>
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4 text-white text-2xl font-bold">
                        {personIndex + 1}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Dados da Pessoa {personIndex + 1}
                      </h3>
                      <p className="text-gray-500">Assento #{seatNumber}</p>
                    </div>

                    {/* Nome */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <User className="inline w-4 h-4 mr-1" /> Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={person.name}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, name: e.target.value };
                          setPeople(newPeople);
                        }}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Nome completo do passageiro"
                      />
                    </div>

                    {/* Documento */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📄 Documento (CPF/RG) *
                      </label>
                      <input
                        type="text"
                        value={person.document}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, document: e.target.value };
                          setPeople(newPeople);
                        }}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Phone className="inline w-4 h-4 mr-1" /> Telefone *
                      </label>
                      <input
                        type="tel"
                        value={person.phone}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, phone: e.target.value };
                          setPeople(newPeople);
                        }}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="(48) 99999-9999"
                      />
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🎂 Data de Nascimento *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                        value={person.birthDate}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                          if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
                          value = value.slice(0, 10);
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, birthDate: value };
                          setPeople(newPeople);
                        }}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Mail className="inline w-4 h-4 mr-1" /> Email
                      </label>
                      <input
                        type="email"
                        value={person.email}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, email: e.target.value };
                          setPeople(newPeople);
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    {/* Endereço (opcional) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" /> Endereço <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={person.address}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, address: e.target.value };
                          setPeople(newPeople);
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Rua, número, bairro..."
                      />
                    </div>

                    {/* Valor do Passeio */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-green-800 mb-2">
                        💰 Valor do Passeio (R$) *
                      </label>
                      <input
                        type="number"
                        value={person.amount || ''}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, amount: parseFloat(e.target.value) || 0 };
                          setPeople(newPeople);
                        }}
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-lg font-bold bg-white"
                        placeholder="200.00"
                      />
                    </div>

                    {/* É criança / Meia entrada */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          id={`child-${personIndex}`}
                          checked={person.isChild}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[personIndex] = { ...person, isChild: e.target.checked };
                            setPeople(newPeople);
                          }}
                          className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <label htmlFor={`child-${personIndex}`} className="font-semibold text-yellow-800 cursor-pointer">
                          👶 É criança (menor de 7 anos)?
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`half-${personIndex}`}
                          checked={person.isHalfPrice}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[personIndex] = { ...person, isHalfPrice: e.target.checked };
                            setPeople(newPeople);
                          }}
                          className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor={`half-${personIndex}`} className="font-semibold text-orange-700 cursor-pointer">
                          🎫 Paga meia entrada?
                        </label>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ÚLTIMO PASSO: Pagamento */}
          {currentStep === totalSteps && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CreditCard className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Pagamento</h3>
                <p className="text-gray-500">Configure o pagamento de cada pessoa</p>
              </div>

              {/* Resumo Total */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 font-medium">Valor Total:</span>
                  <span className="text-2xl font-black text-green-700">R$ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 font-medium">Total Recebido:</span>
                  <span className="text-xl font-bold text-blue-600">R$ {totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-green-300">
                  <span className="text-gray-800 font-bold">Valor Restante:</span>
                  <span className={`text-xl font-black ${totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    R$ {totalRemaining.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pagamento por pessoa */}
              <div className="space-y-4">
                {people.map((person, index) => (
                  <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-gray-800">Pessoa {index + 1}: {person.name}</span>
                        <span className="text-sm text-gray-500 ml-2">(Assento #{selectedSeats[index]})</span>
                      </div>
                      <span className="font-bold text-green-700">R$ {person.amount.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Recebido</label>
                        <input
                          type="number"
                          value={person.amountPaid || ''}
                          onChange={(e) => {
                            const newPeople = [...people];
                            const value = parseFloat(e.target.value) || 0;
                            newPeople[index] = { ...person, amountPaid: Math.min(value, person.amount) };
                            setPeople(newPeople);
                          }}
                          min="0"
                          max={person.amount}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de Pagamento</label>
                        <select
                          value={person.paymentMethod}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[index] = { ...person, paymentMethod: e.target.value as PaymentMethod };
                            setPeople(newPeople);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        >
                          <option value="pix">💠 PIX</option>
                          <option value="cartao">💳 Cartão</option>
                          <option value="dinheiro">💵 Dinheiro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-blue-800 font-medium">
                  ⏳ Após criar, a reserva será enviada para <strong>aprovação do administrador</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mt-4">
            {error}
          </div>
        )}

        {/* Botões de Navegação */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft size={20} />
              Voltar
            </button>
          )}
          
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Criar Reserva{people.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
