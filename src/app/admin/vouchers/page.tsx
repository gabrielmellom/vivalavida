'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Users, QrCode, ArrowLeft, Search, MessageCircle, FileCheck, FileX, Send, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Receipt, FileText, Ticket, ChevronDown, ChevronUp, Mail, User } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';
import { generateVoucherPDF, SupportedLanguage } from '@/lib/voucherGenerator';
import { generateReceiptPDF, ReceiptData } from '@/lib/receiptGenerator';
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

// Idiomas para confirmação pós-compra
const CONFIRMATION_LANGUAGES: { code: 'pt-BR' | 'es'; name: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

type FlowStep = 'receipt' | 'terms' | 'confirmation' | 'voucher';

// Interface para grupo de reservas
interface ReservationGroup {
  leader: Reservation;
  members: Reservation[];
  isGroup: boolean;
}

export default function VouchersPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<string | null>(null);
  const [showConfirmationDropdown, setShowConfirmationDropdown] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [vendorNames, setVendorNames] = useState<Map<string, string>>(new Map());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<Map<string, FlowStep>>(new Map());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
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
      
      const todayBoat = sortedBoats.find(boat => {
        const boatDate = new Date(boat.date).toISOString().split('T')[0];
        return boatDate === selectedDate;
      });
      setSelectedBoat(todayBoat || null);
    });

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

      reservationsData.sort((a, b) => a.customerName.localeCompare(b.customerName));
      setReservations(reservationsData);
    });

    return () => unsubscribe();
  }, [selectedBoat]);

  // Agrupar reservas por grupo
  const groupedReservations = useMemo((): ReservationGroup[] => {
    const groups = new Map<string, Reservation[]>();
    const individuals: Reservation[] = [];
    
    reservations.forEach(r => {
      if (r.groupId) {
        const existing = groups.get(r.groupId) || [];
        existing.push(r);
        groups.set(r.groupId, existing);
      } else {
        individuals.push(r);
      }
    });
    
    const result: ReservationGroup[] = [];
    
    // Processar grupos
    groups.forEach((members) => {
      // Encontrar o líder (quem tem isGroupLeader = true ou o primeiro)
      const leader = members.find(m => m.isGroupLeader) || members[0];
      const otherMembers = members.filter(m => m.id !== leader.id);
      
      result.push({
        leader,
        members: otherMembers,
        isGroup: true,
      });
    });
    
    // Adicionar individuais
    individuals.forEach(r => {
      result.push({
        leader: r,
        members: [],
        isGroup: false,
      });
    });
    
    // Ordenar por nome do líder
    result.sort((a, b) => a.leader.customerName.localeCompare(b.leader.customerName));
    
    return result;
  }, [reservations]);

  // Filtrar por busca
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedReservations;
    const search = searchTerm.toLowerCase();
    
    return groupedReservations.filter(group => {
      // Buscar no líder
      if (group.leader.customerName.toLowerCase().includes(search) ||
          group.leader.phone.toLowerCase().includes(search)) {
        return true;
      }
      // Buscar nos membros
      return group.members.some(m => 
        m.customerName.toLowerCase().includes(search) ||
        m.phone.toLowerCase().includes(search)
      );
    });
  }, [groupedReservations, searchTerm]);

  const handleGenerateVoucher = async (reservation: Reservation, language: SupportedLanguage = 'pt-BR') => {
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

  const handleGenerateReceipt = async (reservation: Reservation) => {
    if (!selectedBoat) return;
    
    const vendorName = vendorNames.get(reservation.vendorId) || 'Vendedor';
    
    let pagantes = 1;
    let cortesias = 0;
    
    if (reservation.groupId) {
      const groupMembers = reservations.filter(r => r.groupId === reservation.groupId);
      pagantes = groupMembers.filter(r => !r.isChild || (r.isChild && r.totalAmount > 0)).length;
      cortesias = groupMembers.filter(r => r.isChild && r.totalAmount === 0).length;
    } else {
      if (reservation.isChild && reservation.totalAmount === 0) {
        pagantes = 0;
        cortesias = 1;
      }
    }
    
    const receiptData: ReceiptData = {
      reservation,
      boat: selectedBoat,
      vendorName,
      pagantes,
      cortesias,
      valorPorPessoa: selectedBoat.ticketPrice || 180,
      valorReserva: reservation.amountPaid,
      valorRestante: reservation.amountDue,
      formaPagamento: reservation.paymentMethod,
    };
    
    try {
      await generateReceiptPDF(receiptData);
      
      await updateDoc(doc(db, 'reservations', reservation.id), {
        receiptSent: true,
        receiptSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      setStepForCard(reservation.id, 'terms');
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      alert('Erro ao gerar recibo. Tente novamente.');
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

  useEffect(() => {
    const loadVendorNames = async () => {
      const vendorIds = [...new Set(reservations.map(r => r.vendorId).filter(Boolean))];
      const names = new Map<string, string>();
      
      for (const vendorId of vendorIds) {
        try {
          const userRoleDoc = await getDoc(doc(db, 'roles', vendorId));
          if (userRoleDoc.exists()) {
            names.set(vendorId, userRoleDoc.data().name || 'Vendedor');
          }
        } catch (e) {
          console.log('Erro ao carregar nome do vendedor:', e);
        }
      }
      
      setVendorNames(names);
    };
    
    if (reservations.length > 0) {
      loadVendorNames();
    }
  }, [reservations]);

  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}`;
  };

  const handleSendConfirmation = async (reservation: Reservation, language: 'pt-BR' | 'es') => {
    const vendorName = vendorNames.get(reservation.vendorId) || 'Vendedor';
    const isWithLanding = reservation.escunaType === 'com-desembarque';
    
    const formatDateForMessage = (dateString: string) => {
      if (!dateString) return '';
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      
      if (language === 'es') {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year} – ${dias[date.getDay()]}`;
      }
      
      const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year} – ${dias[date.getDay()]}`;
    };

    const dateFormatted = formatDateForMessage(reservation.rideDate);

    let message = '';

    if (language === 'es') {
      message = `*PASEO ISLA DO CAMPECHE 🏝️ – BARCO VIVA LA VIDA*

Reserva con la vendedora *${vendorName}* para la Isla do Campeche ${isWithLanding ? 'con *DESEMBARQUE*' : '*PANORÁMICO*'}

📅 *${dateFormatted}* | 👥 *${reservation.customerName}*

📍 *Check-in:* desde las 08:00 (llegar hasta las 08:30)
📌 Rua Amaro Coelho, 22 – Barra da Lagoa
⚠️ Si no se presenta hasta ese horario, la reserva podrá liberarse.

🚢 *Embarque:* 09:00 | *Salida:* 09:15
⏳ *Trayecto:* aprox. 1h10 de ida y 1h10 de regreso
🏝️ *Tiempo en la isla:* hasta 3h30
🏁 *Regreso previsto:* alrededor de las 16:00

🛃 Documento de identidad obligatorio para todos (incluidos menores).

🍽️ La isla cuenta con restaurante y quiosco.
🎒 Se permite llevar snacks y bebidas.
❌ La alimentación no está incluida.
🍹 Bar a bordo con venta de bebidas y caipirinhas.
🚻 Baño disponible en el barco.
${isWithLanding ? '\n🏝️ *DESEMBARQUE:* desembarque directo en la arena, barco con rampa (es necesario mojar las piernas).\n' : ''}
🚫 Prohibido fumar en la embarcación.
🚫 Prohibido llevar animales.
🔥 Prohibido hacer asado / churrasco.

🚮 La basura regresa con el pasajero al barco, no se deja en la isla.

📲 *Confirmación del paseo el día del embarque, hasta las 07:00.*
👉 Espere la confirmación antes de dirigirse al punto de embarque.

💡 ¡No olvide el protector solar!

😃 *Será un placer recibirlos.*`;
    } else {
      message = `*PASSEIO ILHA DO CAMPECHE 🏝️ – BARCO VIVA LA VIDA*

Reserva com a vendedora *${vendorName}* para a Ilha do Campeche ${isWithLanding ? 'com *DESEMBARQUE*' : '*PANORÂMICO*'}

📅 *${dateFormatted}* | 👥 *${reservation.customerName}*

📍 *Check-in:* a partir das 08:00 (chegar até 08:30)
📌 Rua Amaro Coelho, 22 – Barra da Lagoa
⚠️ Não comparecendo até esse horário, a reserva poderá ser liberada.

🚢 *Embarque:* 09:00 | *Saída:* 09:15
⏳ *Trajeto:* aprox. 1h10 ida e retorno
🏝️ *Permanência na ilha:* até 3h30
🏁 *Retorno previsto:* por volta das 16:00

🛃 Documento obrigatório para todos (inclusive menores).

🍽️ Restaurante e quiosque na ilha.
🎒 Pode levar lanches e bebidas.
❌ Alimentação não inclusa.
🍹 Bar a bordo com venda de bebidas e caipirinhas.
🚻 Banheiro disponível no barco.
${isWithLanding ? '\n🏝️ *DESEMBARQUE:* direto na areia, barco com rampa (é necessário molhar as pernas).\n' : ''}
🚫 Proibido fumar na embarcação.
🚫 Proibido levar animais.
🔥 Proibido fazer churrasco.

🚮 O lixo retorna com o passageiro para o barco, não fica na ilha.

📲 *Confirmação do passeio no dia do embarque, até às 07:00.*
👉 Aguarde a confirmação para se deslocar até o local do embarque.

💡 Não esqueça o protetor solar!

😃 *Será um prazer tê-los conosco.*`;
    }

    const cleanPhone = reservation.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    try {
      await updateDoc(doc(db, 'reservations', reservation.id), {
        confirmationSent: true,
        confirmationSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      setStepForCard(reservation.id, 'voucher');
    } catch (error) {
      console.error('Erro ao atualizar status da confirmação:', error);
    }
    
    setShowConfirmationDropdown(null);
  };

  const handleSendTermsLink = async (reservation: Reservation, groupMembers: Reservation[] = []) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const termsUrl = `${baseUrl}/aceite/${reservation.id}`;
    
    const totalPeople = 1 + groupMembers.length;
    let groupInfo = '';
    if (totalPeople > 1) {
      groupInfo = `\n\n👥 Você é o responsável pelo grupo de ${totalPeople} pessoas. Ao aceitar os termos, você estará aceitando em nome de todo o grupo.`;
    }
    
    const message = `Olá ${reservation.customerName.split(' ')[0]}! 🌊

Falta apenas um passo para completar sua reserva no passeio VIVA LA VIDA!

📋 Por favor, acesse o link abaixo para aceitar os termos do passeio:
${termsUrl}${groupInfo}

Após aceitar, você receberá seu voucher de embarque.

Obrigado e até breve! 🚢`;

    const cleanPhone = reservation.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    try {
      // Marcar para o líder
      await updateDoc(doc(db, 'reservations', reservation.id), {
        termsLinkSent: true,
        termsLinkSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      // Marcar para os membros do grupo
      for (const member of groupMembers) {
        await updateDoc(doc(db, 'reservations', member.id), {
          termsLinkSent: true,
          termsLinkSentAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status do link:', error);
    }
  };

  const getTermsStatus = (reservation: Reservation) => {
    if (reservation.acceptedTerms && reservation.acceptedImageRights) {
      return { status: 'complete', label: 'Aceito', color: 'green' };
    }
    if (reservation.acceptedTerms) {
      return { status: 'partial', label: 'Termos OK', color: 'blue' };
    }
    if (reservation.termsLinkSent) {
      return { status: 'pending', label: 'Aguardando', color: 'yellow' };
    }
    return { status: 'none', label: 'Pendente', color: 'gray' };
  };

  const getCurrentStep = (reservation: Reservation): FlowStep => {
    if (reservation.voucherSent) return 'voucher';
    if (reservation.confirmationSent) return 'voucher';
    if (reservation.acceptedTerms) return 'confirmation';
    if (reservation.receiptSent) return 'terms';
    return 'receipt';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  const calendarData = useMemo(() => {
    const boatDates = new Map<string, { hasBoat: boolean; hasReservations: boolean; reservationCount: number }>();
    
    boats.forEach(boat => {
      if (boat.status !== 'active') return;
      const dateKey = new Date(boat.date).toISOString().split('T')[0];
      if (!boatDates.has(dateKey)) {
        boatDates.set(dateKey, { hasBoat: true, hasReservations: false, reservationCount: 0 });
      }
    });
    
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = new Date(year, month, 1).getDay();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
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

  const toggleCard = (id: string, groupId?: string) => {
    const newExpanded = new Set(expandedCards);
    const newGroupsExpanded = new Set(expandedGroups);
    
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
      // Quando fechar o card, também fecha o grupo
      if (groupId) {
        newGroupsExpanded.delete(groupId);
      }
    } else {
      newExpanded.add(id);
      // Quando abrir o card, também abre o grupo automaticamente
      if (groupId) {
        newGroupsExpanded.add(groupId);
      }
    }
    setExpandedCards(newExpanded);
    setExpandedGroups(newGroupsExpanded);
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const setStepForCard = (id: string, step: FlowStep) => {
    const newSteps = new Map(activeStep);
    newSteps.set(id, step);
    setActiveStep(newSteps);
  };

  const getStepStatus = (reservation: Reservation, step: number): 'done' | 'current' | 'pending' => {
    switch (step) {
      case 1:
        if (reservation.receiptSent) return 'done';
        return 'current';
      case 2:
        if (reservation.acceptedTerms) return 'done';
        if (reservation.termsLinkSent || reservation.receiptSent) return 'current';
        return 'pending';
      case 3:
        if (reservation.confirmationSent) return 'done';
        if (reservation.acceptedTerms) return 'current';
        return 'pending';
      case 4:
        if (reservation.voucherSent) return 'done';
        if (reservation.acceptedTerms) return 'current';
        return 'pending';
      default:
        return 'pending';
    }
  };

  const handleCardHeaderClick = (e: React.MouseEvent, reservationId: string, groupId?: string) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
      return;
    }
    toggleCard(reservationId, groupId);
  };

  // Calcular totais do grupo
  const getGroupTotals = (leader: Reservation, members: Reservation[]) => {
    const all = [leader, ...members];
    const total = all.reduce((sum, r) => sum + r.totalAmount, 0);
    const due = all.reduce((sum, r) => sum + r.amountDue, 0);
    return { total, due, count: all.length };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-viva-blue-dark">Gerenciar Vouchers</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Recibo → Aceite → Confirmação → Voucher</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Calendário */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6 max-w-sm">
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

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-gray-500 py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(calendarMonth).map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="w-9 h-9 sm:w-10 sm:h-10" />;

              const status = getCalendarDayStatus(date);
              const dateStr = date.toISOString().split('T')[0];

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md flex flex-col items-center justify-center text-xs font-medium transition ${
                    status.isSelected
                      ? 'bg-viva-blue text-white ring-2 ring-viva-blue ring-offset-1'
                      : status.hasReservations
                      ? 'bg-viva-blue-dark text-white hover:bg-viva-blue'
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

          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-viva-blue-dark"></div>
              <span className="text-[10px] text-gray-600">Com reservas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-300"></div>
              <span className="text-[10px] text-gray-600">Barco ativo</span>
            </div>
          </div>

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
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-viva-blue">{reservations.length}</p>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar passageiro..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-sm bg-white"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Lista de Reservas Agrupadas */}
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                  Passageiros ({reservations.length}) • {(() => {
                    const gruposCount = filteredGroups.filter(g => g.isGroup).length;
                    const individuaisCount = filteredGroups.filter(g => !g.isGroup).length;
                    const parts = [];
                    if (gruposCount > 0) parts.push(`${gruposCount} grupo${gruposCount !== 1 ? 's' : ''}`);
                    if (individuaisCount > 0) parts.push(`${individuaisCount} individual${individuaisCount !== 1 ? 'is' : ''}`);
                    return parts.join(' + ');
                  })()}
                </h3>
              </div>

              {filteredGroups.length === 0 ? (
                <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center text-gray-500 text-sm">
                  {searchTerm 
                    ? `Nenhum passageiro encontrado para "${searchTerm}"`
                    : 'Nenhuma reserva aprovada para este passeio'
                  }
                </div>
              ) : (
                filteredGroups.map((group, index) => {
                  const { leader, members, isGroup } = group;
                  const termsStatus = getTermsStatus(leader);
                  const isExpanded = expandedCards.has(leader.id);
                  const isGroupExpanded = expandedGroups.has(leader.groupId || leader.id);
                  const currentStep = getCurrentStep(leader);
                  const selectedStep = activeStep.get(leader.id) || currentStep;
                  const groupTotals = isGroup ? getGroupTotals(leader, members) : null;
                  
                  return (
                    <div
                      key={leader.id}
                      className={`rounded-lg border-2 shadow-sm overflow-hidden transition-all ${
                        leader.voucherSent 
                          ? 'bg-green-50/50 border-green-300' 
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                        {/* Header do Card */}
                        <div 
                          className="px-4 py-3.5 cursor-pointer hover:bg-gray-50/80 transition"
                          onClick={(e) => handleCardHeaderClick(e, leader.id, leader.groupId || leader.id)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Número da reserva */}
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
                              {index + 1}
                            </div>
                            
                            {/* Info do responsável */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-bold text-gray-900 text-sm">{leader.customerName}</p>
                                {isGroup && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                    👤 Responsável • {groupTotals?.count} pessoas
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                <a 
                                  href={getWhatsAppLink(leader.phone)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-700 font-medium hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageCircle size={12} />
                                  {leader.phone}
                                </a>
                                {!isGroup && <span className="text-gray-300">|</span>}
                                {isGroup ? (
                                  <>
                                    <span className="text-gray-300">|</span>
                                    <span className="font-semibold text-gray-700">Total: R$ {groupTotals?.total.toFixed(2)}</span>
                                    {groupTotals && groupTotals.due > 0 && (
                                      <>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-orange-600 font-bold">Falta: R$ {groupTotals.due.toFixed(2)}</span>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-gray-400">#{leader.seatNumber}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="font-semibold text-gray-700">R$ {leader.totalAmount.toFixed(2)}</span>
                                    {leader.amountDue > 0 && (
                                      <>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-orange-600 font-bold">Falta: R$ {leader.amountDue.toFixed(2)}</span>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Indicador de progresso */}
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {[1, 2, 3, 4].map((step) => {
                                const status = getStepStatus(leader, step);
                                return (
                                  <div key={step} className="flex items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                      status === 'done' ? 'bg-viva-blue border-viva-blue text-white' :
                                      status === 'current' ? 'bg-blue-50 border-viva-blue text-viva-blue' :
                                      'bg-gray-50 border-gray-200 text-gray-400'
                                    }`}>
                                      {status === 'done' ? '✓' : step}
                                    </div>
                                    {step < 4 && <div className={`w-2 h-0.5 ${status === 'done' ? 'bg-viva-blue' : 'bg-gray-200'}`}></div>}
                                  </div>
                                );
                              })}
                            </div>
                            
                            <div className="flex-shrink-0 ml-1">
                              {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo Expandido */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50/70">
                            {/* Membros do Grupo (se houver) */}
                            {isGroup && members.length > 0 && (
                              <div className="mx-4 mt-3 mb-3 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                <button
                                  onClick={() => toggleGroup(leader.groupId || leader.id)}
                                  className="flex items-center justify-between gap-2 text-xs text-slate-700 font-semibold w-full px-3 py-2.5 hover:bg-slate-100 transition"
                                >
                                  <div className="flex items-center gap-2">
                                    <Users size={14} className="text-slate-500" />
                                    <span>Membros do grupo ({members.length})</span>
                                  </div>
                                  {isGroupExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                
                                {isGroupExpanded && (
                                  <div className="border-t border-slate-200">
                                    {members.map((member, memberIndex) => (
                                      <div 
                                        key={member.id} 
                                        className={`flex items-center justify-between px-3 py-2.5 text-xs ${
                                          memberIndex !== members.length - 1 ? 'border-b border-slate-100' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                            <User size={10} className="text-slate-500" />
                                          </div>
                                          <span className="font-medium text-gray-800">{member.customerName}</span>
                                          <span className="text-gray-400">#{member.seatNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-gray-600 font-medium">R$ {member.totalAmount.toFixed(2)}</span>
                                          {member.amountDue > 0 && (
                                            <span className="text-orange-600 font-semibold">Falta: R$ {member.amountDue.toFixed(2)}</span>
                                          )}
                                          {member.acceptedTerms ? (
                                            <span className="text-green-600 font-medium">✓ Aceito</span>
                                          ) : (
                                            <span className="text-amber-600 font-medium">Aguardando</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Tabs das 4 Etapas */}
                            <div className="flex bg-white mx-4 mt-3 rounded-lg border border-gray-200 overflow-hidden">
                              {[
                                { key: 'receipt' as FlowStep, label: 'Recibo', icon: Receipt, done: leader.receiptSent },
                                { key: 'terms' as FlowStep, label: 'Aceite', icon: FileText, done: leader.acceptedTerms },
                                { key: 'confirmation' as FlowStep, label: 'Confirm.', icon: Mail, done: leader.confirmationSent },
                                { key: 'voucher' as FlowStep, label: 'Voucher', icon: Ticket, done: leader.voucherSent },
                              ].map((tab, idx) => (
                                <button
                                  key={tab.key}
                                  onClick={() => setStepForCard(leader.id, tab.key)}
                                  className={`flex-1 py-2.5 px-1 text-xs font-medium flex items-center justify-center gap-1 transition ${
                                    idx !== 3 ? 'border-r border-gray-200' : ''
                                  } ${
                                    selectedStep === tab.key
                                      ? 'bg-viva-blue text-white'
                                      : 'text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="font-bold">{idx + 1}.</span>
                                  <span className="hidden sm:inline">{tab.label}</span>
                                  {tab.done && <CheckCircle size={12} className={selectedStep === tab.key ? 'text-white' : 'text-green-500'} />}
                                </button>
                              ))}
                            </div>

                            {/* Conteúdo da Etapa */}
                            <div className="p-4 mx-4 mb-4 mt-3 bg-white rounded-lg border border-gray-200">
                              {/* ETAPA 1: RECIBO */}
                              {selectedStep === 'receipt' && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                      <Receipt size={16} className="text-viva-blue" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-sm">Recibo / Ticket</h4>
                                      <p className="text-xs text-gray-500">Gere o PDF com as regras</p>
                                    </div>
                                    {leader.receiptSent && (
                                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">✓ Gerado</span>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleGenerateReceipt(leader)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-viva-blue text-white rounded-lg font-medium text-sm hover:bg-viva-blue-dark transition"
                                  >
                                    <Receipt size={16} />
                                    {leader.receiptSent ? 'Gerar Novamente' : 'Gerar Recibo PDF'}
                                  </button>
                                </div>
                              )}

                              {/* ETAPA 2: ACEITE */}
                              {selectedStep === 'terms' && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                      <FileText size={16} className="text-viva-blue" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-sm">Aceite dos Termos</h4>
                                      <p className="text-xs text-gray-500">
                                        {isGroup ? `Envie para ${leader.customerName} (responsável)` : 'Envie o link para aceitar'}
                                      </p>
                                    </div>
                                    <span className={`ml-auto text-xs px-2 py-1 rounded font-medium ${
                                      termsStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                      termsStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                      termsStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {termsStatus.label}
                                    </span>
                                  </div>

                                  {leader.acceptedTerms ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                      <CheckCircle size={24} className="text-green-600 mx-auto mb-1" />
                                      <p className="text-green-700 font-medium text-sm">
                                        {isGroup ? 'Responsável aceitou os termos para todo o grupo!' : 'Cliente aceitou os termos!'}
                                      </p>
                                    </div>
                                  ) : (
                                    <>
                                      {leader.termsLinkSent && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center text-xs text-yellow-700">
                                          Link já enviado. Aguardando aceite do cliente.
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleSendTermsLink(leader, members)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-viva-blue text-white rounded-lg font-medium text-sm hover:bg-viva-blue-dark transition"
                                      >
                                        <Send size={16} />
                                        {leader.termsLinkSent ? 'Reenviar Link' : 'Enviar Link de Termos'}
                                        {isGroup && <span className="text-xs opacity-75">(para {groupTotals?.count} pessoas)</span>}
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* ETAPA 3: CONFIRMAÇÃO */}
                              {selectedStep === 'confirmation' && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                      <Mail size={16} className="text-viva-blue" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-sm">Confirmação Pós-Compra</h4>
                                      <p className="text-xs text-gray-500">Envie detalhes do passeio</p>
                                    </div>
                                    {leader.confirmationSent && (
                                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">✓ Enviada</span>
                                    )}
                                  </div>

                                  {!leader.acceptedTerms ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                                      <AlertCircle size={20} className="text-yellow-600 mx-auto mb-1" />
                                      <p className="text-yellow-700 text-sm">Aguardando aceite dos termos</p>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <button
                                        onClick={() => setShowConfirmationDropdown(showConfirmationDropdown === leader.id ? null : leader.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-viva-blue text-white rounded-lg font-medium text-sm hover:bg-viva-blue-dark transition"
                                      >
                                        <MessageCircle size={16} />
                                        {leader.confirmationSent ? 'Enviar Novamente' : 'Enviar Confirmação'}
                                      </button>
                                      
                                      {showConfirmationDropdown === leader.id && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                          <div className="p-2">
                                            <p className="text-xs text-gray-500 mb-2 text-center">Idioma</p>
                                            <div className="grid grid-cols-2 gap-1">
                                              {CONFIRMATION_LANGUAGES.map((lang) => (
                                                <button
                                                  key={lang.code}
                                                  onClick={() => handleSendConfirmation(leader, lang.code)}
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
                                  )}
                                </div>
                              )}

                              {/* ETAPA 4: VOUCHER */}
                              {selectedStep === 'voucher' && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                      <Ticket size={16} className="text-viva-blue" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-sm">Voucher de Embarque</h4>
                                      <p className="text-xs text-gray-500">Gere o PDF com QR Code</p>
                                    </div>
                                    {leader.voucherSent && (
                                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">✓ Enviado</span>
                                    )}
                                  </div>

                                  {!leader.acceptedTerms ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                                      <AlertCircle size={20} className="text-yellow-600 mx-auto mb-1" />
                                      <p className="text-yellow-700 text-sm">Aguardando aceite dos termos</p>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                        <input
                                          type="checkbox"
                                          checked={leader.voucherSent || false}
                                          onChange={() => handleToggleVoucherSent(leader.id, leader.voucherSent || false)}
                                          className="w-4 h-4 text-viva-blue border-gray-300 rounded focus:ring-viva-blue"
                                        />
                                        <label className="text-sm text-gray-700">Marcar como enviado</label>
                                      </div>

                                      <div className="relative">
                                        <button
                                          onClick={() => setShowLanguageDropdown(showLanguageDropdown === leader.id ? null : leader.id)}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-viva-blue text-white rounded-lg font-medium text-sm hover:bg-viva-blue-dark transition"
                                        >
                                          <QrCode size={16} />
                                          Gerar Voucher PDF
                                          <Globe size={14} />
                                        </button>
                                        
                                        {showLanguageDropdown === leader.id && (
                                          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                            <div className="p-2">
                                              <p className="text-xs text-gray-500 mb-2 text-center">Idioma</p>
                                              <div className="grid grid-cols-2 gap-1">
                                                {LANGUAGES.map((lang) => (
                                                  <button
                                                    key={lang.code}
                                                    onClick={() => handleGenerateVoucher(leader, lang.code)}
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

                                      {/* Vouchers individuais para membros do grupo */}
                                      {isGroup && members.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                          <p className="text-xs text-gray-500 mb-2 font-medium">Vouchers individuais dos membros:</p>
                                          <div className="space-y-2">
                                            {members.map((member) => (
                                              <div key={member.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                                    <User size={10} className="text-slate-500" />
                                                  </div>
                                                  <span className="text-xs text-gray-700 font-medium">{member.customerName}</span>
                                                </div>
                                                <div className="relative">
                                                  <button
                                                    onClick={() => setShowLanguageDropdown(showLanguageDropdown === member.id ? null : member.id)}
                                                    className="text-xs text-viva-blue hover:text-viva-blue-dark font-semibold px-2 py-1 rounded hover:bg-blue-50 transition"
                                                  >
                                                    Gerar Voucher
                                                  </button>
                                                  {showLanguageDropdown === member.id && (
                                                    <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                                      <div className="p-2">
                                                        {LANGUAGES.slice(0, 3).map((lang) => (
                                                          <button
                                                            key={lang.code}
                                                            onClick={() => handleGenerateVoucher(member, lang.code)}
                                                            className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 rounded transition w-full"
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
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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
