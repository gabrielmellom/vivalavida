'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, Timestamp, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat, Payment, PaymentMethod } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Calendar, ArrowLeft, User, Phone, DollarSign, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Cores para identificar grupos (paleta profissional)
const GROUP_COLORS = [
  { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', badge: 'bg-slate-600' },
  { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-600' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-600' },
  { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-800', badge: 'bg-slate-700' },
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', badge: 'bg-blue-700' },
  { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', badge: 'bg-indigo-600' },
  { bg: 'bg-slate-200', border: 'border-slate-500', text: 'text-slate-900', badge: 'bg-slate-800' },
  { bg: 'bg-blue-200', border: 'border-blue-500', text: 'text-blue-900', badge: 'bg-blue-800' },
  { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800', badge: 'bg-gray-700' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800', badge: 'bg-indigo-700' },
];

// Função para obter cor do grupo baseado no groupId
const getGroupColor = (groupId: string | undefined, groupColorMap: Map<string, number>) => {
  if (!groupId) return null;
  const colorIndex = groupColorMap.get(groupId);
  if (colorIndex === undefined) return null;
  return GROUP_COLORS[colorIndex % GROUP_COLORS.length];
};

// Formatar data sem problemas de timezone
const formatDateForDisplay = (dateString: string, options?: Intl.DateTimeFormatOptions) => {
  if (!dateString) return '';
  // Pega apenas a parte YYYY-MM-DD (antes do T se houver)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  // Cria a data ao meio-dia para evitar problemas de timezone
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('pt-BR', options);
};

function CheckInPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [boat, setBoat] = useState<Boat | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [reservationToCheckIn, setReservationToCheckIn] = useState<Reservation | null>(null);
  const [remainingAmount, setRemainingAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  useEffect(() => {
    let reservationsUnsubscribe: (() => void) | null = null;

    // Buscar todos os barcos e filtrar por data
    const boatsQuery = query(collection(db, 'boats'));

    const unsubscribe = onSnapshot(boatsQuery, async (snapshot) => {
      const boats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Boat[];

      // Filtrar barco do dia selecionado (comparar apenas a data, não hora)
      const selectedDateStr = selectedDate;
      const boatData = boats.find(boat => {
        const boatDate = new Date(boat.date).toISOString().split('T')[0];
        return boatDate === selectedDateStr;
      });

      if (boatData) {
        setBoat(boatData);

        // Buscar reservas aprovadas do barco em tempo real
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('boatId', '==', boatData.id),
          where('status', '==', 'approved')
        );

        reservationsUnsubscribe = onSnapshot(reservationsQuery, (reservationsSnapshot) => {
          const reservationsData = reservationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            rideDate: doc.data().rideDate,
            checkedIn: doc.data().checkedIn || false, // Garantir que seja boolean
          })) as Reservation[];

          // Ordenar para manter grupos juntos
          reservationsData.sort((a, b) => {
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
          setReservations(reservationsData);
        });
      } else {
        setBoat(null);
        setReservations([]);
      }
    });

    return () => {
      unsubscribe();
      if (reservationsUnsubscribe) {
        reservationsUnsubscribe();
      }
    };
  }, [selectedDate]);

  // Processar voucher escaneado (quando vem da URL)
  useEffect(() => {
    const reservationId = searchParams?.get('reservationId');
    
    if (reservationId && reservations.length > 0) {
      const reservation = reservations.find(r => r.id === reservationId);
      
      if (reservation) {
        // Se tem pagamento pendente, abrir modal
        if (reservation.amountDue > 0) {
          setReservationToCheckIn(reservation);
          setRemainingAmount(reservation.amountDue.toString());
          setPaymentMethod('pix');
          setShowPaymentConfirm(true);
          
          // Limpar URL
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/admin/checkin');
          }
        } else {
          // Se não tem pendência, fazer check-in direto
          handleCheckIn(reservation.id, false);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/admin/checkin');
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, reservations]);

  const handleCheckIn = async (reservationId: string, currentlyCheckedIn: boolean) => {
    // Se já está marcado, pode desmarcar direto
    if (currentlyCheckedIn) {
      try {
        await updateDoc(doc(db, 'reservations', reservationId), {
          checkedIn: false,
          updatedAt: Timestamp.now(),
        });
      } catch (error) {
        console.error('Erro ao atualizar check-in:', error);
        alert('Erro ao atualizar check-in. Tente novamente.');
      }
      return;
    }

    // Se não está marcado, verificar se tem pagamento pendente
    const reservation = reservations.find(r => r.id === reservationId);
    if (reservation && reservation.amountDue > 0) {
      // Mostrar modal de confirmação com opção de registrar pagamento
      setReservationToCheckIn(reservation);
      setRemainingAmount(reservation.amountDue.toString());
      setPaymentMethod('pix');
      setShowPaymentConfirm(true);
    } else {
      // Se não tem pendência, marcar direto
      try {
        await updateDoc(doc(db, 'reservations', reservationId), {
          checkedIn: true,
          updatedAt: Timestamp.now(),
        });
      } catch (error) {
        console.error('Erro ao atualizar check-in:', error);
        alert('Erro ao atualizar check-in. Tente novamente.');
      }
    }
  };

  const confirmCheckInWithPayment = async () => {
    if (!reservationToCheckIn || !user) return;

    const paidAmount = parseFloat(remainingAmount) || 0;
    if (paidAmount < 0 || paidAmount > reservationToCheckIn.amountDue) {
      alert('Valor inválido!');
      return;
    }

    try {
      const newAmountPaid = reservationToCheckIn.amountPaid + paidAmount;
      const newAmountDue = reservationToCheckIn.totalAmount - newAmountPaid;

      // Criar registro de pagamento
      await addDoc(collection(db, 'payments'), {
        reservationId: reservationToCheckIn.id,
        amount: paidAmount,
        method: paymentMethod,
        source: 'checkin',
        createdAt: Timestamp.now(),
        createdBy: user.uid,
      });

      // Atualizar reserva
      await updateDoc(doc(db, 'reservations', reservationToCheckIn.id), {
        checkedIn: true,
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        updatedAt: Timestamp.now(),
      });
      
      setShowPaymentConfirm(false);
      setReservationToCheckIn(null);
      setRemainingAmount('');
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error);
      alert('Erro ao atualizar check-in. Tente novamente.');
    }
  };

  const confirmCheckInWithGratuity = async () => {
    if (!reservationToCheckIn) return;

    if (!confirm('Tem certeza que deseja dar gratuidade total? Isso irá zerar o valor devido e marcar como pago integralmente.')) {
      return;
    }

    try {
      // Marcar check-in e zerar o valor devido (gratuidade)
      await updateDoc(doc(db, 'reservations', reservationToCheckIn.id), {
        checkedIn: true,
        amountDue: 0,
        amountPaid: reservationToCheckIn.totalAmount, // Marcar como pago integralmente
        updatedAt: Timestamp.now(),
      });
      setShowPaymentConfirm(false);
      setReservationToCheckIn(null);
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error);
      alert('Erro ao atualizar check-in. Tente novamente.');
    }
  };

  const confirmCheckInWithoutCharge = async () => {
    if (!reservationToCheckIn) return;

    try {
      // Marcar check-in mas manter o valor devido (não vai cobrar, mas fica registrado)
      await updateDoc(doc(db, 'reservations', reservationToCheckIn.id), {
        checkedIn: true,
        updatedAt: Timestamp.now(),
      });
      setShowPaymentConfirm(false);
      setReservationToCheckIn(null);
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error);
      alert('Erro ao atualizar check-in. Tente novamente.');
    }
  };

  // Filtrar reservas por nome do cliente
  const filteredReservations = reservations.filter(reservation => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reservation.customerName.toLowerCase().includes(search) ||
      reservation.phone.toLowerCase().includes(search) ||
      reservation.whatsapp?.toLowerCase().includes(search) ||
      reservation.address.toLowerCase().includes(search)
    );
  });

  const checkedInCount = reservations.filter(r => r.checkedIn).length;
  const pendingPayment = reservations.filter(r => r.amountDue > 0);

  // Criar mapa de cores para grupos
  const groupColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let colorIndex = 0;
    
    reservations.forEach(r => {
      if (r.groupId && !map.has(r.groupId)) {
        map.set(r.groupId, colorIndex);
        colorIndex++;
      }
    });
    
    return map;
  }, [reservations]);

  // Contar membros de cada grupo
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    reservations.forEach(r => {
      if (r.groupId) {
        counts.set(r.groupId, (counts.get(r.groupId) || 0) + 1);
      }
    });
    return counts;
  }, [reservations]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Responsivo */}
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
              <h1 className="text-lg sm:text-2xl font-black text-viva-blue-dark">Check-in</h1>
              <p className="text-gray-600 text-xs sm:text-sm">Gerenciar embarque</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Filtro de Data - Compacto no mobile */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 border border-gray-200">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Calendar size={18} className="text-gray-500" />
            Data do Passeio
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base bg-white"
          />
        </div>

        {boat ? (
          <>
            {/* Stats - Grid 2x2 no mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm text-center border border-gray-200">
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-viva-blue">{reservations.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 sm:p-4 shadow-sm text-center border border-green-200">
                <p className="flex items-center justify-center gap-1 text-green-700 text-xs sm:text-sm mb-1">
                  <CheckCircle size={14} className="text-green-600" />
                  Check-in
                </p>
                <p className="text-xl sm:text-2xl font-black text-green-600">{checkedInCount}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 sm:p-4 shadow-sm text-center border border-orange-200">
                <p className="text-orange-700 text-xs sm:text-sm mb-1">Pendentes</p>
                <p className="text-xl sm:text-2xl font-black text-orange-600">{reservations.length - checkedInCount}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 sm:p-4 shadow-sm text-center border border-red-200">
                <p className="flex items-center justify-center gap-1 text-red-700 text-xs sm:text-sm mb-1">
                  <DollarSign size={14} className="text-red-600" />
                  Devendo
                </p>
                <p className="text-xl sm:text-2xl font-black text-red-600">{pendingPayment.length}</p>
              </div>
            </div>

            {/* Lista de Reservas */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-3 sm:p-6 border-b">
                <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-viva-blue-dark mb-3">
                  <Users size={20} className="text-viva-blue" />
                  {boat.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3">
                  {formatDateForDisplay(boat.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base bg-white"
                    />
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  {searchTerm && (
                    <p className="mt-2 text-xs sm:text-sm text-gray-600">
                      Mostrando {filteredReservations.length} de {reservations.length}
                    </p>
                  )}
                </div>
              </div>
              {/* Versão Mobile - Cards */}
              <div className="lg:hidden p-3 space-y-3">
                {filteredReservations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm 
                      ? `Nenhuma reserva encontrada para "${searchTerm}"`
                      : 'Nenhuma reserva aprovada para este passeio'
                    }
                  </div>
                ) : (
                  filteredReservations.map((reservation) => {
                    const groupColor = getGroupColor(reservation.groupId, groupColorMap);
                    const groupSize = reservation.groupId ? groupCounts.get(reservation.groupId) || 0 : 0;
                    
                    return (
                    <div 
                      key={reservation.id} 
                      className={`rounded-lg p-4 border transition ${
                        reservation.checkedIn 
                          ? 'bg-green-50 border-green-200' 
                          : groupColor
                            ? `${groupColor.bg} ${groupColor.border}`
                            : reservation.amountDue > 0 
                              ? 'bg-orange-50 border-orange-200' 
                              : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Badge de Grupo */}
                      {groupColor && groupSize > 1 && (
                        <div className={`${groupColor.badge} text-white text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 mb-2`}>
                          <Users size={12} />
                          Grupo de {groupSize}
                        </div>
                      )}

                      {/* Header do Card */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                            reservation.checkedIn 
                              ? 'bg-green-500 text-white' 
                              : groupColor
                                ? `${groupColor.badge} text-white`
                                : 'bg-viva-blue text-white'
                          }`}>
                            <User size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{reservation.customerName}</p>
                            <p className="text-xs text-gray-500">{reservation.phone}</p>
                          </div>
                        </div>
                        {reservation.checkedIn && (
                          <span className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                            <CheckCircle size={12} />
                            Confirmado
                          </span>
                        )}
                      </div>

                      {/* Info de Pagamento */}
                      <div className={`rounded-lg p-3 mb-3 border ${
                        reservation.amountDue > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-bold">R$ {reservation.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Pago:</span>
                          <span className="font-bold text-green-600">R$ {reservation.amountPaid.toFixed(2)}</span>
                        </div>
                        {reservation.amountDue > 0 && (
                          <div className="flex justify-between items-center text-sm mt-1 pt-1 border-t border-orange-200">
                            <span className="flex items-center gap-1 text-orange-700 font-semibold">
                              <DollarSign size={14} />
                              Falta:
                            </span>
                            <span className="font-black text-orange-600">R$ {reservation.amountDue.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Botão de Check-in Grande */}
                      <button
                        onClick={() => handleCheckIn(reservation.id, Boolean(reservation.checkedIn))}
                        disabled={!reservation.id}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-base transition disabled:opacity-50 ${
                          reservation.checkedIn
                            ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                            : groupColor
                              ? `${groupColor.badge} text-white hover:opacity-90`
                              : 'bg-viva-blue text-white hover:bg-viva-blue-dark active:bg-viva-blue-navy'
                        }`}
                      >
                        {reservation.checkedIn ? (
                          <>
                            <CheckCircle size={20} />
                            Check-in Feito ✓
                          </>
                        ) : (
                          <>
                            <User size={20} />
                            Fazer Check-in
                          </>
                        )}
                      </button>
                    </div>
                  );
                  })
                )}
              </div>

              {/* Versão Desktop - Tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grupo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contato</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pagamento</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500">
                          {searchTerm 
                            ? `Nenhuma reserva encontrada para "${searchTerm}"`
                            : 'Nenhuma reserva aprovada para este passeio'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredReservations.map((reservation) => {
                        const groupColor = getGroupColor(reservation.groupId, groupColorMap);
                        const groupSize = reservation.groupId ? groupCounts.get(reservation.groupId) || 0 : 0;
                        
                        return (
                        <tr key={reservation.id} className={`hover:bg-gray-50 ${
                          reservation.checkedIn 
                            ? 'bg-green-50' 
                            : groupColor 
                              ? groupColor.bg 
                              : ''
                        }`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {groupColor && groupSize > 1 && (
                                <span className={`${groupColor.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1`}>
                                  <Users size={10} />
                                  {groupSize}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                              <p className="text-sm text-gray-500">{reservation.address}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone size={14} className="text-gray-400" />
                                <span>{reservation.phone}</span>
                              </div>
                              {reservation.whatsapp && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <Phone size={14} />
                                  <a href={`https://wa.me/${reservation.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                    {reservation.whatsapp}
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-semibold">Total: R$ {reservation.totalAmount.toFixed(2)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-green-600">Pago: R$ {reservation.amountPaid.toFixed(2)}</span>
                              </div>
                              {reservation.amountDue > 0 && (
                                <div className="text-sm">
                                  <span className="text-red-600 font-bold">
                                    <DollarSign size={14} className="inline" /> Falta: R$ {reservation.amountDue.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="text-xs text-gray-500 capitalize">
                                {reservation.paymentMethod}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleCheckIn(reservation.id, Boolean(reservation.checkedIn))}
                              disabled={!reservation.id}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                reservation.checkedIn
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : groupColor
                                    ? `${groupColor.bg} ${groupColor.text} hover:opacity-80`
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {reservation.checkedIn ? (
                                <>
                                  <CheckCircle size={18} />
                                  Confirmado
                                </>
                              ) : (
                                <>
                                  <XCircle size={18} />
                                  Marcar Check-in
                                </>
                              )}
                            </button>
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

        {/* Modal Confirmação Pagamento - Responsivo */}
        {showPaymentConfirm && reservationToCheckIn && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[95vh] overflow-y-auto shadow-xl border border-gray-200">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-orange-50 rounded-full flex items-center justify-center mb-3 border border-orange-200">
                  <DollarSign className="text-orange-600" size={28} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Pagamento Pendente
                </h2>
              </div>

              {/* Card do Cliente */}
              <div className="bg-gradient-to-r from-viva-blue to-viva-blue-dark rounded-lg p-4 mb-4 text-white shadow-sm">
                <p className="text-white/70 text-xs mb-1">Cliente</p>
                <p className="font-bold text-lg">{reservationToCheckIn.customerName}</p>
                <p className="text-white/80 text-sm">Assento #{reservationToCheckIn.seatNumber}</p>
              </div>

              {/* Valores */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-bold text-sm sm:text-base text-gray-800">
                      R$ {reservationToCheckIn.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-2">
                    <p className="text-xs text-green-700">Pago</p>
                    <p className="font-bold text-sm sm:text-base text-green-600">
                      R$ {reservationToCheckIn.amountPaid.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-2">
                    <p className="text-xs text-red-700">Falta</p>
                    <p className="font-black text-base sm:text-lg text-red-600">
                      R$ {reservationToCheckIn.amountDue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campos de Pagamento */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor Pendente (R$)
                  </label>
                  <input
                    type="number"
                    value={remainingAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= reservationToCheckIn.amountDue)) {
                        setRemainingAmount(value);
                      }
                    }}
                    step="0.01"
                    min="0"
                    max={reservationToCheckIn.amountDue}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-lg font-semibold bg-white"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: R$ {reservationToCheckIn.amountDue.toFixed(2)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Método de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none bg-white"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2">
                <button
                  onClick={confirmCheckInWithPayment}
                  className="w-full px-4 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm sm:text-base hover:from-green-700 hover:to-green-800"
                >
                  <CheckCircle size={20} />
                  Registrar Pagamento e Fazer Check-in
                </button>

                <button
                  onClick={confirmCheckInWithGratuity}
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm sm:text-base hover:from-slate-700 hover:to-slate-800"
                >
                  <User size={20} />
                  Gratuidade (Cortesia)
                </button>

                <button
                  onClick={confirmCheckInWithoutCharge}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm sm:text-base hover:from-orange-700 hover:to-orange-800"
                >
                  <CheckCircle size={20} />
                  Não Cobrar - Fazer Check-in
                </button>

                <button
                  onClick={() => {
                    setShowPaymentConfirm(false);
                    setReservationToCheckIn(null);
                    setRemainingAmount('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold active:bg-gray-50 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viva-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <CheckInPageContent />
    </Suspense>
  );
}

