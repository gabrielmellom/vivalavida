'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, Timestamp, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat, Payment, PaymentMethod, BankAccount, SiteConfig } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Calendar, ArrowLeft, User, Phone, DollarSign, Users, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [allBoats, setAllBoats] = useState<Boat[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [boat, setBoat] = useState<Boat | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [reservationToCheckIn, setReservationToCheckIn] = useState<Reservation | null>(null);
  const [groupReservationsToCheckIn, setGroupReservationsToCheckIn] = useState<Reservation[]>([]); // Para check-in em grupo
  const [remainingAmount, setRemainingAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  // Suporte para múltiplas formas de pagamento
  interface PaymentEntry {
    id: string;
    amount: string;
    method: PaymentMethod;
    bankId: string;
  }
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([
    { id: '1', amount: '', method: 'pix', bankId: '' }
  ]);
  // Desconto
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  // Bancos
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  // QR Code Error - para mostrar data do passeio
  const [qrCodeError, setQrCodeError] = useState<{ message: string; rideDate?: string } | null>(null);
  // Confirmação de reserva
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [reservationToConfirm, setReservationToConfirm] = useState<Reservation | null>(null);
  // Cancelamento individual
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [reservationToNoShow, setReservationToNoShow] = useState<Reservation | null>(null);
  const [noShowReason, setNoShowReason] = useState('');
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

  // Carregar todos os barcos e reservas para o calendário
  useEffect(() => {
    const boatsQuery = query(collection(db, 'boats'));
    const unsubscribeBoats = onSnapshot(boatsQuery, (snapshot) => {
      const boatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Boat[];
      setAllBoats(boatsData);
    });

    const reservationsQuery = query(collection(db, 'reservations'), where('status', '==', 'approved'));
    const unsubscribeReservations = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        rideDate: doc.data().rideDate,
      })) as Reservation[];
      setAllReservations(reservationsData);
    });

    return () => {
      unsubscribeBoats();
      unsubscribeReservations();
    };
  }, []);

  // Filtrar barco e reservas do dia selecionado
  useEffect(() => {
    const selectedDateStr = selectedDate;
    const boatData = allBoats.find(boat => {
      const boatDate = new Date(boat.date).toISOString().split('T')[0];
      return boatDate === selectedDateStr && boat.status === 'active';
    });

    if (boatData) {
      setBoat(boatData);
      
      // Filtrar reservas do barco selecionado
      const boatReservations = allReservations
        .filter(r => r.boatId === boatData.id)
        .map(r => ({ ...r, checkedIn: r.checkedIn || false }));
      
      // Ordenar para manter grupos juntos
      boatReservations.sort((a, b) => {
        if (a.groupId && b.groupId) {
          if (a.groupId !== b.groupId) {
            return a.groupId.localeCompare(b.groupId);
          }
        }
        if (a.groupId && !b.groupId) return -1;
        if (!a.groupId && b.groupId) return 1;
        return a.customerName.localeCompare(b.customerName);
      });
      setReservations(boatReservations);
    } else {
      setBoat(null);
      setReservations([]);
    }
  }, [selectedDate, allBoats, allReservations]);

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
    
    if (reservationId && boat) {
      const reservation = reservations.find(r => r.id === reservationId);
      
      if (reservation) {
        // Limpar referência
        pendingReservationIdRef.current = null;
        
        // Verificar se a reserva é para o barco do dia selecionado
        const reservationDate = new Date(reservation.rideDate).toISOString().split('T')[0];
        const boatDate = new Date(boat.date).toISOString().split('T')[0];
        
        if (reservationDate !== boatDate) {
          // Reserva é de outro dia - mostrar erro com a data correta
          setQrCodeError({
            message: `Esta reserva é para outro dia! O passeio está agendado para ${formatDateForDisplay(reservation.rideDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`,
            rideDate: reservation.rideDate
          });
          return;
        }
        
        // Buscar membros do grupo se existir
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

        // Se tem pagamento pendente, abrir modal
        if (totalGroupAmountDue > 0) {
          setReservationToCheckIn(reservation);
          setGroupReservationsToCheckIn(groupMembers);
          setRemainingAmount(totalGroupAmountDue.toString());
          setPaymentEntries([{ id: '1', amount: totalGroupAmountDue.toString(), method: 'pix', bankId: '' }]);
          setShowPaymentConfirm(true);
        } else {
          // Se não tem pendência, fazer check-in direto de todos do grupo
          handleCheckIn(reservation.id, false);
        }
      } else if (reservations.length > 0) {
        // Reserva não encontrada nas aprovadas do dia
        // Buscar a reserva para mostrar a data do passeio
        const fetchReservationInfo = async () => {
          try {
            const reservationDoc = await getDoc(doc(db, 'reservations', reservationId));
            if (reservationDoc.exists()) {
              const reservationData = reservationDoc.data() as Reservation;
              
              if (reservationData.status === 'cancelled') {
                setQrCodeError({
                  message: `Esta reserva foi CANCELADA. Cliente: ${reservationData.customerName}.`,
                  rideDate: reservationData.rideDate
                });
              } else if (reservationData.status === 'no_show') {
                setQrCodeError({
                  message: `Esta reserva está marcada como NÃO COMPARECEU. Cliente: ${reservationData.customerName}.`,
                  rideDate: reservationData.rideDate
                });
              } else if (reservationData.status === 'pending') {
                setQrCodeError({
                  message: `Esta reserva está PENDENTE de aprovação. Cliente: ${reservationData.customerName}. Data do passeio: ${formatDateForDisplay(reservationData.rideDate, { weekday: 'long', day: 'numeric', month: 'long' })}.`,
                  rideDate: reservationData.rideDate
                });
              } else {
                setQrCodeError({
                  message: `Reserva não encontrada para hoje. Cliente: ${reservationData.customerName}. Data do passeio: ${formatDateForDisplay(reservationData.rideDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`,
                  rideDate: reservationData.rideDate
                });
              }
            } else {
              setQrCodeError({
                message: 'Reserva não encontrada no sistema.',
              });
            }
          } catch (error) {
            console.error('Erro ao buscar reserva:', error);
            setQrCodeError({
              message: 'Erro ao verificar reserva. Tente novamente.',
            });
          }
        };
        
        fetchReservationInfo();
        pendingReservationIdRef.current = null;
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
    const discount = parseFloat(discountAmount) || 0;
    const effectiveAmountDue = totalGroupAmountDue - discount;
    
    // Calcular total pago em todas as formas
    const totalPaidNow = paymentEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

    // Validar desconto
    if (discount > 0 && !discountReason.trim()) {
      alert('Por favor, informe o motivo do desconto!');
      return;
    }

    if (discount > totalGroupAmountDue) {
      alert('O desconto não pode ser maior que o valor pendente!');
      return;
    }

    // Validar que o valor pago é suficiente (exceto se tem desconto)
    if (discount === 0 && totalPaidNow < effectiveAmountDue && totalPaidNow > 0) {
      const falta = effectiveAmountDue - totalPaidNow;
      alert(`Valor insuficiente! Faltam R$ ${falta.toFixed(2)}.\n\nSe deseja dar um desconto, preencha o campo "Desconto" com o valor e o motivo.`);
      return;
    }

    if (totalPaidNow > effectiveAmountDue) {
      alert(`O total pago (R$ ${totalPaidNow.toFixed(2)}) não pode ser maior que o valor devido (R$ ${effectiveAmountDue.toFixed(2)})!`);
      return;
    }

    // Validar que as formas de pagamento têm valores (apenas se há algo a pagar)
    const validPayments = paymentEntries.filter(e => parseFloat(e.amount) > 0);
    if (validPayments.length === 0 && effectiveAmountDue > 0 && discount < totalGroupAmountDue) {
      alert('Informe pelo menos uma forma de pagamento ou aplique um desconto!');
      return;
    }

    try {
      // Distribuir o pagamento proporcionalmente entre os membros do grupo
      let remainingPayment = totalPaidNow;
      let remainingDiscount = discount;
      
      for (const member of groupReservationsToCheckIn) {
        // Quanto esse membro deve
        const memberDue = member.amountDue;
        // Quanto de desconto para esse membro (proporcional)
        const memberDiscount = memberDue > 0 ? Math.min(memberDue, remainingDiscount) : 0;
        remainingDiscount -= memberDiscount;
        // Quanto será pago para esse membro
        const memberPayment = Math.min(memberDue - memberDiscount, remainingPayment);
        remainingPayment -= memberPayment;

        // Registrar pagamentos para esse membro
        if (memberPayment > 0 && totalPaidNow > 0) {
          for (const entry of validPayments) {
            const entryAmount = parseFloat(entry.amount) || 0;
            if (entryAmount > 0) {
              const ratio = memberPayment / totalPaidNow;
              const bank = banks.find(b => b.id === entry.bankId);
              
              const paymentData: Record<string, unknown> = {
                reservationId: member.id,
                amount: entryAmount * ratio,
                method: entry.method,
                source: 'checkin',
                groupPayment: groupReservationsToCheckIn.length > 1,
                createdAt: Timestamp.now(),
                createdBy: user.uid,
              };
              
              // Só adicionar bankId e bankName se existirem
              if (entry.bankId) {
                paymentData.bankId = entry.bankId;
              }
              if (bank?.name) {
                paymentData.bankName = bank.name;
              }
              
              await addDoc(collection(db, 'payments'), paymentData);
            }
          }
        }

        // Atualizar reserva do membro
        const newAmountPaid = member.amountPaid + memberPayment + memberDiscount;
        const newAmountDue = member.totalAmount - newAmountPaid;
        
        const updateData: Record<string, unknown> = {
          checkedIn: true,
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          updatedAt: Timestamp.now(),
        };
        
        // Só adicionar desconto se existir
        if (memberDiscount > 0) {
          updateData.discountAmount = memberDiscount;
          updateData.discountReason = discountReason;
        }
        
        await updateDoc(doc(db, 'reservations', member.id), updateData);
      }
      
      setShowPaymentConfirm(false);
      setReservationToCheckIn(null);
      setGroupReservationsToCheckIn([]);
      setRemainingAmount('');
      setPaymentEntries([{ id: '1', amount: '', method: 'pix', bankId: '' }]);
      setDiscountAmount('');
      setDiscountReason('');
      setSelectedBank('');
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
      setPaymentEntries([{ id: '1', amount: '', method: 'pix', bankId: '' }]);
      setDiscountAmount('');
      setDiscountReason('');
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error);
      alert('Erro ao atualizar check-in. Tente novamente.');
    }
  };

  // Marcar pessoa como não compareceu
  const handleMarkNoShow = async () => {
    if (!reservationToNoShow) return;

    try {
      await updateDoc(doc(db, 'reservations', reservationToNoShow.id), {
        status: 'no_show',
        noShowReason: noShowReason || 'Não compareceu',
        checkedIn: false,
        updatedAt: Timestamp.now(),
      });

      // Decrementar vaga do barco
      if (boat) {
        const boatRef = doc(db, 'boats', boat.id);
        const boatDoc = await getDoc(boatRef);
        if (boatDoc.exists()) {
          const boatData = boatDoc.data() as Boat;
          const updateData: Record<string, unknown> = {
            seatsTaken: Math.max(0, (boatData.seatsTaken || 0) - 1),
            updatedAt: Timestamp.now(),
          };
          
          // Atualizar contadores por tipo
          if (boatData.boatType === 'escuna' && boatData.seatsWithLanding !== undefined) {
            if (reservationToNoShow.escunaType === 'com-desembarque') {
              updateData.seatsWithLandingTaken = Math.max(0, (boatData.seatsWithLandingTaken || 0) - 1);
            } else {
              updateData.seatsWithoutLandingTaken = Math.max(0, (boatData.seatsWithoutLandingTaken || 0) - 1);
            }
          }
          
          await updateDoc(boatRef, updateData);
        }
      }

      alert(`${reservationToNoShow.customerName} foi marcado como "Não Compareceu"`);
      setShowNoShowModal(false);
      setReservationToNoShow(null);
      setNoShowReason('');
    } catch (error) {
      console.error('Erro ao marcar não comparecimento:', error);
      alert('Erro ao atualizar. Tente novamente.');
    }
  };

  // Enviar confirmação de reserva
  const handleSendConfirmation = async () => {
    if (!reservationToConfirm || !boat) return;

    try {
      // Marcar que a confirmação foi enviada
      await updateDoc(doc(db, 'reservations', reservationToConfirm.id), {
        confirmationSent: true,
        confirmationSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Gerar link do voucher e abrir WhatsApp
      const voucherUrl = `${window.location.origin}/admin/voucher/${reservationToConfirm.id}`;
      const message = encodeURIComponent(
        `*CONFIRMACAO DE RESERVA*\n\n` +
        `Ola ${reservationToConfirm.customerName}!\n\n` +
        `Sua reserva esta confirmada!\n\n` +
        `*Data:* ${formatDateForDisplay(reservationToConfirm.rideDate, { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
        `*Passeio:* ${boat.name}\n` +
        `*Valor:* R$ ${reservationToConfirm.totalAmount.toFixed(2)}\n` +
        (reservationToConfirm.amountDue > 0 
          ? `*Valor pendente:* R$ ${reservationToConfirm.amountDue.toFixed(2)}\n` 
          : `*Status:* Pagamento completo\n`) +
        `\n` +
        `*Voucher:* ${voucherUrl}\n\n` +
        `Qualquer duvida, estamos a disposicao!`
      );
      
      const phone = (reservationToConfirm.whatsapp || reservationToConfirm.phone).replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

      setShowConfirmationModal(false);
      setReservationToConfirm(null);
    } catch (error) {
      console.error('Erro ao enviar confirmação:', error);
      alert('Erro ao enviar confirmação. Tente novamente.');
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

  // Funções do calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Dados do calendário - memoizado
  const calendarData = useMemo(() => {
    const data = new Map<string, { hasBoat: boolean; hasReservations: boolean; reservationCount: number }>();
    
    allBoats.forEach(boat => {
      if (boat.status !== 'active') return;
      const dateKey = new Date(boat.date).toISOString().split('T')[0];
      const boatReservations = allReservations.filter(r => r.boatId === boat.id);
      
      data.set(dateKey, {
        hasBoat: true,
        hasReservations: boatReservations.length > 0,
        reservationCount: boatReservations.length,
      });
    });
    
    return data;
  }, [allBoats, allReservations]);

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
        {/* Calendário Visual */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          {/* Header do Calendário */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCalendarMonth(newMonth);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 capitalize">{calendarMonthName}</h3>
            <button
              onClick={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCalendarMonth(newMonth);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Dias do Mês */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {getDaysInMonth(calendarMonth).map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="w-10 h-10 sm:w-12 sm:h-12" />;
              }

              const status = getCalendarDayStatus(date);
              const dateStr = date.toISOString().split('T')[0];

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center text-sm font-medium transition relative ${
                    status.isSelected
                      ? 'bg-viva-blue text-white shadow-md'
                      : status.hasReservations
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : status.hasBoat
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : status.isToday
                      ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-400'
                      : 'hover:bg-gray-100 text-gray-600'
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
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-500">Com reservas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <span className="text-xs text-gray-500">Barco ativo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full ring-2 ring-sky-400 bg-sky-100"></div>
              <span className="text-xs text-gray-500">Hoje</span>
            </div>
          </div>

          {/* Botão Voltar para Hoje */}
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => {
                  const todayDate = new Date();
                  setSelectedDate(todayDate.toISOString().split('T')[0]);
                  setCalendarMonth(todayDate);
                }}
                className="text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                ← Voltar para Hoje
              </button>
            </div>
          )}
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

                      {/* Botões de Ações */}
                      <div className="space-y-2">
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
                        
                        {/* Botões secundários */}
                        <div className="flex gap-2">
                          {/* Enviar Confirmação */}
                          <button
                            onClick={() => {
                              setReservationToConfirm(reservation);
                              setShowConfirmationModal(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition"
                          >
                            <Phone size={14} />
                            Confirmar
                          </button>
                          
                          {/* Não Compareceu */}
                          {!reservation.checkedIn && (
                            <button
                              onClick={() => {
                                setReservationToNoShow(reservation);
                                setShowNoShowModal(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-200 transition"
                            >
                              <XCircle size={14} />
                              Não Veio
                            </button>
                          )}
                        </div>
                      </div>
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

              {/* Campo de Desconto */}
              {(() => {
                const totalGroupDue = groupReservationsToCheckIn.reduce((sum, r) => sum + r.amountDue, 0);
                const discount = parseFloat(discountAmount) || 0;
                const effectiveAmountDue = Math.max(0, totalGroupDue - discount);
                
                return (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">🏷️ Desconto (opcional)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Valor (R$)</label>
                          <input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            step="0.01"
                            min="0"
                            max={totalGroupDue}
                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-semibold bg-white"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Motivo *</label>
                          <input
                            type="text"
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white text-sm"
                            placeholder="Ex: Promoção, cortesia..."
                          />
                        </div>
                      </div>
                      {discount > 0 && (
                        <p className="text-sm text-yellow-800 mt-2 text-center">
                          💰 Novo valor a pagar: <strong>R$ {effectiveAmountDue.toFixed(2)}</strong>
                        </p>
                      )}
                    </div>

                    {/* Formas de Pagamento - Múltiplas */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-700">
                          Formas de Pagamento
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentEntries([
                              ...paymentEntries,
                              { id: Date.now().toString(), amount: '', method: 'pix', bankId: '' }
                            ]);
                          }}
                          className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold hover:bg-green-200 transition"
                        >
                          + Adicionar Forma
                        </button>
                      </div>
                      
                      {paymentEntries.map((entry, index) => (
                        <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-600">
                              {index + 1}ª Forma de Pagamento
                            </p>
                            {paymentEntries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentEntries(paymentEntries.filter(e => e.id !== entry.id));
                                }}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Valor (R$)</label>
                              <input
                                type="number"
                                value={entry.amount}
                                onChange={(e) => {
                                  const newEntries = paymentEntries.map(pe => 
                                    pe.id === entry.id ? { ...pe, amount: e.target.value } : pe
                                  );
                                  setPaymentEntries(newEntries);
                                }}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none font-semibold bg-white text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Método</label>
                              <select
                                value={entry.method}
                                onChange={(e) => {
                                  const newEntries = paymentEntries.map(pe => 
                                    pe.id === entry.id ? { ...pe, method: e.target.value as PaymentMethod } : pe
                                  );
                                  setPaymentEntries(newEntries);
                                }}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none bg-white text-sm"
                              >
                                <option value="pix">💠 PIX</option>
                                <option value="cartao">💳 Cartão</option>
                                <option value="dinheiro">💵 Dinheiro</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Banco</label>
                              <select
                                value={entry.bankId}
                                onChange={(e) => {
                                  const newEntries = paymentEntries.map(pe => 
                                    pe.id === entry.id ? { ...pe, bankId: e.target.value } : pe
                                  );
                                  setPaymentEntries(newEntries);
                                }}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none bg-white text-sm"
                              >
                                <option value="">Selecione...</option>
                                {banks.map((bank) => (
                                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Resumo de Pagamentos */}
                      {(() => {
                        const totalPaid = paymentEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                        const remaining = effectiveAmountDue - totalPaid;
                        
                        return (
                          <div className={`rounded-lg p-3 text-center ${
                            remaining === 0 ? 'bg-green-100' : remaining > 0 ? 'bg-orange-100' : 'bg-red-100'
                          }`}>
                            <p className="text-sm">
                              <span className="font-bold">Total informado:</span>{' '}
                              R$ {totalPaid.toFixed(2)} de R$ {effectiveAmountDue.toFixed(2)}
                            </p>
                            {remaining > 0 && (
                              <p className="text-xs text-orange-600 mt-1 font-semibold">
                                ⚠️ Faltam R$ {remaining.toFixed(2)}
                              </p>
                            )}
                            {remaining < 0 && (
                              <p className="text-xs text-red-600 mt-1 font-semibold">
                                ❌ Valor excede o pendente em R$ {Math.abs(remaining).toFixed(2)}
                              </p>
                            )}
                            {remaining === 0 && (
                              <p className="text-xs text-green-700 mt-1 font-semibold">
                                ✅ Valor correto!
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </>
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
                    setPaymentEntries([{ id: '1', amount: '', method: 'pix', bankId: '' }]);
                    setDiscountAmount('');
                    setDiscountReason('');
                    setSelectedBank('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold active:bg-gray-50 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Erro de QR Code */}
        {qrCodeError && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200">
              <div className="text-center mb-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 border border-red-200">
                  <XCircle className="text-red-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-red-600 mb-2">Problema com QR Code</h2>
                <p className="text-gray-700">{qrCodeError.message}</p>
                {qrCodeError.rideDate && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      📅 <strong>Data do Passeio:</strong>
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      {formatDateForDisplay(qrCodeError.rideDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setQrCodeError(null)}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        {/* Modal Confirmar envio de confirmação */}
        {showConfirmationModal && reservationToConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200">
              <div className="text-center mb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 border border-green-200">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-green-700 mb-2">Enviar Confirmação</h2>
                <p className="text-gray-700">
                  Enviar confirmação de reserva para <strong>{reservationToConfirm.customerName}</strong>?
                </p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">📋 Será enviado:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✅ Confirmação da reserva</li>
                  <li>📅 Data do passeio</li>
                  <li>💰 Valores e status de pagamento</li>
                  <li>🔗 Link do voucher</li>
                </ul>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSendConfirmation}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Phone size={18} />
                  Enviar via WhatsApp
                </button>
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setReservationToConfirm(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Não Compareceu */}
        {showNoShowModal && reservationToNoShow && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200">
              <div className="text-center mb-4">
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 border border-orange-200">
                  <XCircle className="text-orange-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-orange-700 mb-2">Não Compareceu</h2>
                <p className="text-gray-700">
                  Marcar <strong>{reservationToNoShow.customerName}</strong> como não compareceu?
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                  placeholder="Ex: Não atendeu ligações, desistiu..."
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-orange-700">
                  ⚠️ A vaga será liberada e a reserva ficará como "Não Compareceu" no histórico.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleMarkNoShow}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
                >
                  Confirmar Não Comparecimento
                </button>
                <button
                  onClick={() => {
                    setShowNoShowModal(false);
                    setReservationToNoShow(null);
                    setNoShowReason('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
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

