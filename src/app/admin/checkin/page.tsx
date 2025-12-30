'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, Timestamp, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat, Payment, PaymentMethod, BankAccount, SiteConfig } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Calendar, ArrowLeft, User, Phone, DollarSign, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Cores para identificar grupos (paleta vibrante e colorida)
const GROUP_COLORS = [
  { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-700', badge: 'bg-rose-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', badge: 'bg-emerald-500' },
  { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', badge: 'bg-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', badge: 'bg-amber-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-700', badge: 'bg-cyan-500' },
  { bg: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-700', badge: 'bg-pink-500' },
  { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-700', badge: 'bg-teal-500' },
  { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', badge: 'bg-orange-500' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-400', text: 'text-fuchsia-700', badge: 'bg-fuchsia-500' },
  { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-700', badge: 'bg-lime-500' },
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
  const [groupReservationsToCheckIn, setGroupReservationsToCheckIn] = useState<Reservation[]>([]); // Para check-in em grupo
  const [remainingAmount, setRemainingAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  // Suporte para 2 formas de pagamento
  const [useTwoPaymentMethods, setUseTwoPaymentMethods] = useState(false);
  const [firstPaymentAmount, setFirstPaymentAmount] = useState('');
  const [firstPaymentMethod, setFirstPaymentMethod] = useState<PaymentMethod>('pix');
  const [secondPaymentAmount, setSecondPaymentAmount] = useState('');
  const [secondPaymentMethod, setSecondPaymentMethod] = useState<PaymentMethod>('dinheiro');
  // Bancos
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [firstPaymentBank, setFirstPaymentBank] = useState<string>('');
  const [secondPaymentBank, setSecondPaymentBank] = useState<string>('');
  const pendingReservationIdRef = useRef<string | null>(null);
  const hasProcessedVoucherRef = useRef(false);

  // Carregar bancos da configuração
  useEffect(() => {
    const loadBanks = async () => {
      try {
        const configSnapshot = await getDocs(collection(db, 'siteConfig'));
        if (configSnapshot.docs.length > 0) {
          const configData = configSnapshot.docs[0].data() as SiteConfig;
          const activeBanks = (configData.banks || []).filter(b => b.isActive);
          setBanks(activeBanks);
        }
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
      }
    };
    loadBanks();
  }, []);

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

  // Buscar reserva do voucher e definir data automaticamente
  useEffect(() => {
    const reservationId = searchParams?.get('reservationId');
    
    if (reservationId && !hasProcessedVoucherRef.current) {
      hasProcessedVoucherRef.current = true;
      pendingReservationIdRef.current = reservationId;
      
      // Buscar reserva para pegar a data do passeio
      const fetchReservationAndSetDate = async () => {
        try {
          const reservationDoc = await getDoc(doc(db, 'reservations', reservationId));
          
          if (reservationDoc.exists()) {
            const reservationData = {
              id: reservationDoc.id,
              ...reservationDoc.data(),
            } as Reservation;
            
            // Buscar o barco para pegar a data
            if (reservationData.boatId) {
              const boatDoc = await getDoc(doc(db, 'boats', reservationData.boatId));
              
              if (boatDoc.exists()) {
                const boatData = {
                  id: boatDoc.id,
                  ...boatDoc.data(),
                } as Boat;
                
                // Definir a data do passeio automaticamente
                const boatDate = new Date(boatData.date).toISOString().split('T')[0];
                setSelectedDate(boatDate);
                
                // Limpar URL
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', '/admin/checkin');
                }
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar reserva do voucher:', error);
        }
      };
      
      fetchReservationAndSetDate();
    }
  }, [searchParams]);

  // Processar voucher escaneado (quando vem da URL) - após carregar reservas
  useEffect(() => {
    const reservationId = pendingReservationIdRef.current;
    
    if (reservationId && reservations.length > 0 && boat) {
      const reservation = reservations.find(r => r.id === reservationId);
      
      if (reservation) {
        // Limpar referência
        pendingReservationIdRef.current = null;
        
        // Se tem pagamento pendente, abrir modal
        if (reservation.amountDue > 0) {
          setReservationToCheckIn(reservation);
          setRemainingAmount(reservation.amountDue.toString());
          setPaymentMethod('pix');
          setShowPaymentConfirm(true);
        } else {
          // Se não tem pendência, fazer check-in direto
          handleCheckIn(reservation.id, false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, boat]);

  const handleCheckIn = async (reservationId: string, currentlyCheckedIn: boolean) => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    // Se já está marcado, pode desmarcar direto (apenas essa reserva individual)
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

    // Se faz parte de um grupo, buscar todos do grupo que ainda não fizeram check-in
    let groupMembers: Reservation[] = [];
    if (reservation.groupId) {
      groupMembers = reservations.filter(r => 
        r.groupId === reservation.groupId && !r.checkedIn
      );
    } else {
      groupMembers = [reservation];
    }

    // Calcular valor total pendente do grupo
    const totalGroupAmountDue = groupMembers.reduce((sum, r) => sum + r.amountDue, 0);

    if (totalGroupAmountDue > 0) {
      // Mostrar modal de confirmação com opção de registrar pagamento
      setReservationToCheckIn(reservation); // Reserva principal (responsável)
      setGroupReservationsToCheckIn(groupMembers); // Todas do grupo
      setRemainingAmount(totalGroupAmountDue.toString());
      setPaymentMethod('pix');
      setShowPaymentConfirm(true);
    } else {
      // Se não tem pendência, marcar check-in de todos do grupo
      try {
        for (const member of groupMembers) {
          await updateDoc(doc(db, 'reservations', member.id), {
            checkedIn: true,
            updatedAt: Timestamp.now(),
          });
        }
      } catch (error) {
        console.error('Erro ao atualizar check-in:', error);
        alert('Erro ao atualizar check-in. Tente novamente.');
      }
    }
  };

  const confirmCheckInWithPayment = async () => {
    if (!reservationToCheckIn || !user || groupReservationsToCheckIn.length === 0) return;

    // Calcular valor total pendente do grupo
    const totalGroupAmountDue = groupReservationsToCheckIn.reduce((sum, r) => sum + r.amountDue, 0);
    let totalPaidNow = 0;

    if (useTwoPaymentMethods) {
      // Pagamento com 2 formas
      const firstAmount = parseFloat(firstPaymentAmount) || 0;
      const secondAmount = parseFloat(secondPaymentAmount) || 0;
      totalPaidNow = firstAmount + secondAmount;

      if (firstAmount <= 0 || secondAmount <= 0) {
        alert('Ambos os valores devem ser maiores que zero quando usar 2 formas de pagamento!');
        return;
      }

      if (totalPaidNow > totalGroupAmountDue) {
        alert(`O total (R$ ${totalPaidNow.toFixed(2)}) não pode ser maior que o valor pendente do grupo (R$ ${totalGroupAmountDue.toFixed(2)})!`);
        return;
      }

      if (firstPaymentMethod === secondPaymentMethod) {
        alert('Selecione formas de pagamento diferentes!');
        return;
      }
    } else {
      // Pagamento com 1 forma
      totalPaidNow = parseFloat(remainingAmount) || 0;
      if (totalPaidNow < 0 || totalPaidNow > totalGroupAmountDue) {
        alert('Valor inválido!');
        return;
      }
    }

    try {
      // Distribuir o pagamento proporcionalmente entre os membros do grupo
      let remainingPayment = totalPaidNow;
      
      for (const member of groupReservationsToCheckIn) {
        // Quanto esse membro deve
        const memberDue = member.amountDue;
        // Quanto será pago para esse membro (proporcional ou o que sobrar)
        const memberPayment = Math.min(memberDue, remainingPayment);
        remainingPayment -= memberPayment;

        if (memberPayment > 0) {
          // Registrar pagamento para esse membro
          if (useTwoPaymentMethods) {
            // Dividir proporcionalmente entre as 2 formas
            const firstAmount = parseFloat(firstPaymentAmount) || 0;
            const secondAmount = parseFloat(secondPaymentAmount) || 0;
            const ratio = memberPayment / totalPaidNow;
            
            const firstBank = banks.find(b => b.id === firstPaymentBank);
            const secondBank = banks.find(b => b.id === secondPaymentBank);

            await addDoc(collection(db, 'payments'), {
              reservationId: member.id,
              amount: firstAmount * ratio,
              method: firstPaymentMethod,
              bankId: firstPaymentBank || undefined,
              bankName: firstBank?.name || undefined,
              source: 'checkin',
              groupPayment: true,
              createdAt: Timestamp.now(),
              createdBy: user.uid,
            });

            await addDoc(collection(db, 'payments'), {
              reservationId: member.id,
              amount: secondAmount * ratio,
              method: secondPaymentMethod,
              bankId: secondPaymentBank || undefined,
              bankName: secondBank?.name || undefined,
              source: 'checkin',
              groupPayment: true,
              createdAt: Timestamp.now(),
              createdBy: user.uid,
            });
          } else {
            const bank = banks.find(b => b.id === selectedBank);
            
            await addDoc(collection(db, 'payments'), {
              reservationId: member.id,
              amount: memberPayment,
              method: paymentMethod,
              bankId: selectedBank || undefined,
              bankName: bank?.name || undefined,
              source: 'checkin',
              groupPayment: groupReservationsToCheckIn.length > 1,
              createdAt: Timestamp.now(),
              createdBy: user.uid,
            });
          }
        }

        // Atualizar reserva do membro
        const newAmountPaid = member.amountPaid + memberPayment;
        const newAmountDue = member.totalAmount - newAmountPaid;
        
        await updateDoc(doc(db, 'reservations', member.id), {
          checkedIn: true,
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          updatedAt: Timestamp.now(),
        });
      }
      
      setShowPaymentConfirm(false);
      setReservationToCheckIn(null);
      setGroupReservationsToCheckIn([]);
      setRemainingAmount('');
      setUseTwoPaymentMethods(false);
      setFirstPaymentAmount('');
      setSecondPaymentAmount('');
      setSelectedBank('');
      setFirstPaymentBank('');
      setSecondPaymentBank('');
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error);
      alert('Erro ao atualizar check-in. Tente novamente.');
    }
  };

  const confirmCheckInWithGratuity = async () => {
    if (!reservationToCheckIn || groupReservationsToCheckIn.length === 0) return;

    const memberCount = groupReservationsToCheckIn.length;
    const confirmMsg = memberCount > 1 
      ? `Tem certeza que deseja dar gratuidade total para ${memberCount} pessoas do grupo? Isso irá zerar o valor devido de todos.`
      : 'Tem certeza que deseja dar gratuidade total? Isso irá zerar o valor devido e marcar como pago integralmente.';

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      // Marcar check-in e zerar o valor devido (gratuidade) para todos do grupo
      for (const member of groupReservationsToCheckIn) {
        await updateDoc(doc(db, 'reservations', member.id), {
          checkedIn: true,
          amountDue: 0,
          amountPaid: member.totalAmount, // Marcar como pago integralmente
          updatedAt: Timestamp.now(),
        });
      }
      setShowPaymentConfirm(false);
      setReservationToCheckIn(null);
      setGroupReservationsToCheckIn([]);
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error);
      alert('Erro ao atualizar check-in. Tente novamente.');
    }
  };

  const confirmCheckInWithoutCharge = async () => {
    if (!reservationToCheckIn || groupReservationsToCheckIn.length === 0) return;

    try {
      // Marcar check-in mas manter o valor devido (não vai cobrar, mas fica registrado) para todos do grupo
      for (const member of groupReservationsToCheckIn) {
        await updateDoc(doc(db, 'reservations', member.id), {
          checkedIn: true,
          updatedAt: Timestamp.now(),
        });
      }
      setShowPaymentConfirm(false);
      setReservationToCheckIn(null);
      setGroupReservationsToCheckIn([]);
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
                      {(() => {
                        // Verificar quantos do grupo ainda não fizeram check-in
                        const pendingInGroup = reservation.groupId 
                          ? reservations.filter(r => r.groupId === reservation.groupId && !r.checkedIn).length
                          : 0;
                        
                        return (
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
                            ) : pendingInGroup > 1 ? (
                              <>
                                <Users size={20} />
                                Check-in Grupo ({pendingInGroup})
                              </>
                            ) : (
                              <>
                                <User size={20} />
                                Fazer Check-in
                              </>
                            )}
                          </button>
                        );
                      })()}
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
                            {(() => {
                              // Verificar quantos do grupo ainda não fizeram check-in
                              const pendingInGroup = reservation.groupId 
                                ? reservations.filter(r => r.groupId === reservation.groupId && !r.checkedIn).length
                                : 0;
                              
                              return (
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
                                  ) : pendingInGroup > 1 ? (
                                    <>
                                      <Users size={18} />
                                      Grupo ({pendingInGroup})
                                    </>
                                  ) : (
                                    <>
                                      <XCircle size={18} />
                                      Check-in
                                    </>
                                  )}
                                </button>
                              );
                            })()}
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
        {showPaymentConfirm && reservationToCheckIn && groupReservationsToCheckIn.length > 0 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[95vh] overflow-y-auto shadow-xl border border-gray-200">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-orange-50 rounded-full flex items-center justify-center mb-3 border border-orange-200">
                  <DollarSign className="text-orange-600" size={28} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {groupReservationsToCheckIn.length > 1 ? 'Check-in do Grupo' : 'Pagamento Pendente'}
                </h2>
                {groupReservationsToCheckIn.length > 1 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {groupReservationsToCheckIn.length} pessoas serão marcadas
                  </p>
                )}
              </div>

              {/* Lista de membros do grupo */}
              {groupReservationsToCheckIn.length > 1 ? (
                <div className="bg-gradient-to-r from-viva-blue to-viva-blue-dark rounded-lg p-4 mb-4 text-white shadow-sm">
                  <p className="text-white/70 text-xs mb-2 flex items-center gap-1">
                    <Users size={14} />
                    Membros do Grupo
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {groupReservationsToCheckIn.map((member, index) => (
                      <div key={member.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-white/20 rounded-full w-5 h-5 flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-medium text-sm">{member.customerName}</span>
                        </div>
                        <span className="text-xs text-white/80">
                          R$ {member.amountDue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-viva-blue to-viva-blue-dark rounded-lg p-4 mb-4 text-white shadow-sm">
                  <p className="text-white/70 text-xs mb-1">Cliente</p>
                  <p className="font-bold text-lg">{reservationToCheckIn.customerName}</p>
                  <p className="text-white/80 text-sm">Assento #{reservationToCheckIn.seatNumber}</p>
                </div>
              )}

              {/* Informações do Serviço - para grupos */}
              {groupReservationsToCheckIn.length > 1 && (() => {
                const comDesembarque = groupReservationsToCheckIn.filter(r => r.escunaType === 'com-desembarque').length;
                const semDesembarque = groupReservationsToCheckIn.filter(r => r.escunaType === 'sem-desembarque' || !r.escunaType).length;

                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Tipos de Serviço</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white rounded-lg p-2 border border-blue-200 text-center">
                        <p className="text-xs text-gray-600">Com Desembarque</p>
                        <p className="font-bold text-blue-700">{comDesembarque}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-blue-200 text-center">
                        <p className="text-xs text-gray-600">Panorâmico</p>
                        <p className="font-bold text-blue-700">{semDesembarque}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Informação de serviço individual (se não for grupo) */}
              {groupReservationsToCheckIn.length === 1 && reservationToCheckIn.escunaType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Tipo de Serviço</p>
                  <p className="text-sm text-blue-700">
                    {reservationToCheckIn.escunaType === 'com-desembarque' 
                      ? 'Com Desembarque na Ilha' 
                      : 'Sem Desembarque (Panorâmico)'}
                  </p>
                </div>
              )}

              {/* Valores - calculados do grupo */}
              {(() => {
                const totalGroupAmount = groupReservationsToCheckIn.reduce((sum, r) => sum + r.totalAmount, 0);
                const totalGroupPaid = groupReservationsToCheckIn.reduce((sum, r) => sum + r.amountPaid, 0);
                const totalGroupDue = groupReservationsToCheckIn.reduce((sum, r) => sum + r.amountDue, 0);

                return (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    {groupReservationsToCheckIn.length > 1 && (
                      <p className="text-xs text-orange-700 font-semibold mb-2 text-center">
                        💰 Valores totais do grupo
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="font-bold text-sm sm:text-base text-gray-800">
                          R$ {totalGroupAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-100 rounded-lg p-2">
                        <p className="text-xs text-green-700">Pago</p>
                        <p className="font-bold text-sm sm:text-base text-green-600">
                          R$ {totalGroupPaid.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-red-100 rounded-lg p-2">
                        <p className="text-xs text-red-700">Falta</p>
                        <p className="font-black text-base sm:text-lg text-red-600">
                          R$ {totalGroupDue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Toggle para 2 formas de pagamento */}
              {(() => {
                const totalGroupDue = groupReservationsToCheckIn.reduce((sum, r) => sum + r.amountDue, 0);
                return (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setUseTwoPaymentMethods(!useTwoPaymentMethods);
                    if (!useTwoPaymentMethods) {
                      // Ao ativar, dividir o valor pendente em 2
                      const halfAmount = (totalGroupDue / 2).toFixed(2);
                      setFirstPaymentAmount(halfAmount);
                      setSecondPaymentAmount(halfAmount);
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition border-2 ${
                    useTwoPaymentMethods
                      ? 'bg-purple-100 border-purple-400 text-purple-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <DollarSign size={18} />
                  {useTwoPaymentMethods ? '✓ Pagando com 2 Formas' : 'Pagar com 2 Formas de Pagamento'}
                </button>
              </div>
                );
              })()}

              {/* Campos de Pagamento */}
              {(() => {
                const totalGroupDue = groupReservationsToCheckIn.reduce((sum, r) => sum + r.amountDue, 0);
                
                return (
              <div className="space-y-3 mb-4">
                {!useTwoPaymentMethods ? (
                  <>
                    {/* Pagamento simples - 1 forma */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Valor a Pagar (R$) {groupReservationsToCheckIn.length > 1 && '- Total do Grupo'}
                      </label>
                      <input
                        type="number"
                        value={remainingAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = parseFloat(value);
                          if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= totalGroupDue)) {
                            setRemainingAmount(value);
                          }
                        }}
                        step="0.01"
                        min="0"
                        max={totalGroupDue}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-lg font-semibold bg-white"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo: R$ {totalGroupDue.toFixed(2)}
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
                    
                    {/* Seleção de Banco */}
                    {banks.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Banco / Conta
                        </label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none bg-white"
                        >
                          <option value="">Selecione o banco...</option>
                          {banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Pagamento dividido - 2 formas */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                      <p className="text-sm font-semibold text-purple-800 text-center">
                        Dividir R$ {totalGroupDue.toFixed(2)} em 2 pagamentos
                        {groupReservationsToCheckIn.length > 1 && ' (grupo)'}
                      </p>
                      
                      {/* Primeira forma */}
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <p className="text-xs font-bold text-purple-600 mb-2">1ª Forma de Pagamento</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Valor (R$)</label>
                            <input
                              type="number"
                              value={firstPaymentAmount}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFirstPaymentAmount(value);
                                // Calcular o restante automaticamente
                                const firstVal = parseFloat(value) || 0;
                                const remaining = totalGroupDue - firstVal;
                                if (remaining >= 0) {
                                  setSecondPaymentAmount(remaining.toFixed(2));
                                }
                              }}
                              step="0.01"
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none font-semibold bg-white"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Método</label>
                            <select
                              value={firstPaymentMethod}
                              onChange={(e) => setFirstPaymentMethod(e.target.value as PaymentMethod)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white"
                            >
                              <option value="pix">PIX</option>
                              <option value="cartao">Cartão</option>
                              <option value="dinheiro">Dinheiro</option>
                            </select>
                          </div>
                        </div>
                        {banks.length > 0 && (
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600 mb-1">Banco</label>
                            <select
                              value={firstPaymentBank}
                              onChange={(e) => setFirstPaymentBank(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white text-sm"
                            >
                              <option value="">Selecione...</option>
                              {banks.map((bank) => (
                                <option key={bank.id} value={bank.id}>{bank.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Segunda forma */}
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <p className="text-xs font-bold text-purple-600 mb-2">2ª Forma de Pagamento</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Valor (R$)</label>
                            <input
                              type="number"
                              value={secondPaymentAmount}
                              onChange={(e) => {
                                const value = e.target.value;
                                setSecondPaymentAmount(value);
                                // Calcular o restante automaticamente
                                const secondVal = parseFloat(value) || 0;
                                const remaining = totalGroupDue - secondVal;
                                if (remaining >= 0) {
                                  setFirstPaymentAmount(remaining.toFixed(2));
                                }
                              }}
                              step="0.01"
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none font-semibold bg-white"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Método</label>
                            <select
                              value={secondPaymentMethod}
                              onChange={(e) => setSecondPaymentMethod(e.target.value as PaymentMethod)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white"
                            >
                              <option value="pix">PIX</option>
                              <option value="cartao">Cartão</option>
                              <option value="dinheiro">Dinheiro</option>
                            </select>
                          </div>
                        </div>
                        {banks.length > 0 && (
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600 mb-1">Banco</label>
                            <select
                              value={secondPaymentBank}
                              onChange={(e) => setSecondPaymentBank(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white text-sm"
                            >
                              <option value="">Selecione...</option>
                              {banks.map((bank) => (
                                <option key={bank.id} value={bank.id}>{bank.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Resumo */}
                      <div className="bg-purple-100 rounded-lg p-3 text-center">
                        <p className="text-sm text-purple-800">
                          <span className="font-bold">Total:</span>{' '}
                          R$ {((parseFloat(firstPaymentAmount) || 0) + (parseFloat(secondPaymentAmount) || 0)).toFixed(2)}
                          {' '}de R$ {totalGroupDue.toFixed(2)}
                        </p>
                        {((parseFloat(firstPaymentAmount) || 0) + (parseFloat(secondPaymentAmount) || 0)) !== totalGroupDue && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ O total não corresponde ao valor pendente
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
                );
              })()}

              {/* Botões de Ação */}
              <div className="space-y-2">
                <button
                  onClick={confirmCheckInWithPayment}
                  className="w-full px-4 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm sm:text-base hover:from-green-700 hover:to-green-800"
                >
                  <CheckCircle size={20} />
                  {groupReservationsToCheckIn.length > 1 
                    ? `Pagar e Check-in (${groupReservationsToCheckIn.length} pessoas)`
                    : 'Registrar Pagamento e Fazer Check-in'
                  }
                </button>

                <button
                  onClick={confirmCheckInWithGratuity}
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm sm:text-base hover:from-slate-700 hover:to-slate-800"
                >
                  <User size={20} />
                  {groupReservationsToCheckIn.length > 1 
                    ? `Gratuidade (${groupReservationsToCheckIn.length} pessoas)`
                    : 'Gratuidade (Cortesia)'
                  }
                </button>

                <button
                  onClick={confirmCheckInWithoutCharge}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm sm:text-base hover:from-orange-700 hover:to-orange-800"
                >
                  <CheckCircle size={20} />
                  {groupReservationsToCheckIn.length > 1 
                    ? `Não Cobrar (${groupReservationsToCheckIn.length} pessoas)`
                    : 'Não Cobrar - Fazer Check-in'
                  }
                </button>

                <button
                  onClick={() => {
                    setShowPaymentConfirm(false);
                    setReservationToCheckIn(null);
                    setGroupReservationsToCheckIn([]);
                    setRemainingAmount('');
                    setUseTwoPaymentMethods(false);
                    setFirstPaymentAmount('');
                    setSecondPaymentAmount('');
                    setSelectedBank('');
                    setFirstPaymentBank('');
                    setSecondPaymentBank('');
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

