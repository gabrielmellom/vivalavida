'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, addDoc, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Boat, Reservation, PaymentMethod } from '@/types';
import { Calendar, Users, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteConfig, DEFAULT_TOURS } from '@/lib/useSiteConfig';

// Formatar data sem problemas de timezone
const formatDateForDisplay = (dateString: string, options?: Intl.DateTimeFormatOptions) => {
  if (!dateString) return '';
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('pt-BR', options);
};

interface PublicReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTourType?: 'panoramico' | 'desembarque' | null;
}

interface PersonData {
  name: string;
  document: string;
  phone: string;
  whatsapp?: string;
  birthDate: string;
  email?: string;
  address: string;
  isChild: boolean;
  isHalfPrice: boolean;
  amount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
}

export default function PublicReservationModal({ isOpen, onClose, preselectedTourType }: PublicReservationModalProps) {
  const { siteConfig, getWhatsAppLink, tours, getCurrentPrice } = useSiteConfig();
  const [boats, setBoats] = useState<Boat[]>([]);
  
  // Estados do wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [people, setPeople] = useState<PersonData[]>([]);
  const [escunaType, setEscunaType] = useState<'sem-desembarque' | 'com-desembarque'>(
    preselectedTourType === 'desembarque' ? 'com-desembarque' : 'sem-desembarque'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPriceByType = (type: 'panoramico' | 'desembarque') => {
    const tour = tours.find(t => t.type === type);
    const current = tour ? getCurrentPrice(tour) : null;
    if (current?.adult) return current.adult;
    const fallback = type === 'desembarque'
      ? DEFAULT_TOURS.desembarque.currentPrice
      : DEFAULT_TOURS.panoramico.currentPrice;
    return fallback;
  };

  const getBasePriceForBoat = (boat: Boat | null) => {
    if (!boat) return 0;
    if (boat.boatType === 'escuna') {
      const type = escunaType === 'com-desembarque' ? 'desembarque' : 'panoramico';
      return getPriceByType(type);
    }
    return boat.ticketPrice || getPriceByType('panoramico');
  };

  const getBasePrice = () => getBasePriceForBoat(selectedBoat);

  // Calcular total de passos: 1 (data) + 1 (qtd pessoas) + numberOfPeople (dados) + 1 (resumo)
  const totalSteps = 3 + numberOfPeople;

  // Barcos disponíveis para a data selecionada
  const boatsForDate = boats.filter(boat => {
    const boatDate = new Date(boat.date).toISOString().split('T')[0];
    return boatDate === selectedDate;
  });

  // Filtrar barcos por tipo de passeio quando houver seleção prévia
  const filteredBoatsForDate = preselectedTourType 
    ? boatsForDate.filter(boat => {
        if (boat.boatType === 'escuna' && boat.escunaType) {
          return preselectedTourType === 'panoramico' 
            ? boat.escunaType === 'sem-desembarque'
            : boat.escunaType === 'com-desembarque';
        }
        return true;
      })
    : boatsForDate;

  useEffect(() => {
    if (!isOpen) return;

    // Resetar quando abrir
    setCurrentStep(1);
    setSelectedDate('');
    setSelectedBoat(null);
    setNumberOfPeople(1);
    setPeople([]);
    setError('');
    setCalendarMonth(new Date());
    if (preselectedTourType) {
      setEscunaType(preselectedTourType === 'desembarque' ? 'com-desembarque' : 'sem-desembarque');
    }

    // Buscar barcos ativos
    const today = new Date().toISOString().split('T')[0];
    const boatsQuery = query(
      collection(db, 'boats'),
      where('status', '==', 'active'),
      where('date', '>=', today),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(
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
        if (error.code === 'failed-precondition') {
          const simpleQuery = query(
            collection(db, 'boats'),
            where('status', '==', 'active')
          );
          onSnapshot(simpleQuery, (snapshot) => {
            const boatsData = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
              })) as Boat[];
            const filtered = boatsData
              .filter(b => b.date >= today)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setBoats(filtered);
          });
        }
      }
    );

    return unsubscribe;
  }, [isOpen, preselectedTourType]);

  // Inicializar array de pessoas quando mudar a quantidade ou barco
  useEffect(() => {
    if (!selectedBoat) return;
    
    const newPeople: PersonData[] = [];
    const base = getBasePrice();
    for (let i = 0; i < numberOfPeople; i++) {
      // Manter dados existentes se já foram preenchidos
      newPeople.push(people[i] || {
        name: '',
        document: '',
        phone: '',
        whatsapp: '',
        birthDate: '',
        email: '',
        address: '',
        isChild: false,
        isHalfPrice: false,
        amount: base,
        paymentMethod: 'pix',
        amountPaid: 0,
      });
    }
    setPeople(newPeople);
  }, [numberOfPeople, selectedBoat]);

  // Atualizar valores quando mudar barco ou tipo de passeio (apenas se já tiver pessoas)
  useEffect(() => {
    if (selectedBoat && people.length > 0) {
      const base = getBasePrice();
      setPeople(prev => prev.map(p => ({
        ...p,
        amount: p.isChild || p.isHalfPrice ? base / 2 : base,
      })));
    }
  }, [selectedBoat, escunaType]);

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

  const getDayStatus = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const hasBoat = boats.some(b => {
      const boatDate = new Date(b.date).toISOString().split('T')[0];
      return boatDate === dateKey && b.status === 'active';
    });
    const isPast = dateKey < today;
    
    return {
      hasBoat,
      isPast,
      isToday: dateKey === today,
      isSelected: dateKey === selectedDate,
    };
  };

  const calendarMonthName = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Calcular totais
  const totalAmount = people.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Calcular limite de vagas baseado no tipo de passeio
  const getLimiteVagas = () => {
    if (!selectedBoat) return 0;
    const vagasDisponiveis = selectedBoat.seatsTotal - selectedBoat.seatsTaken;
    
    // Para escunas, verificar vagas por tipo
    if (selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined) {
      const vagasComDesembarque = (selectedBoat.seatsWithLanding || 0) - (selectedBoat.seatsWithLandingTaken || 0);
      const vagasPanoramico = (selectedBoat.seatsWithoutLanding || 0) - (selectedBoat.seatsWithoutLandingTaken || 0);
      return escunaType === 'com-desembarque' ? vagasComDesembarque : vagasPanoramico;
    }
    
    return vagasDisponiveis;
  };

  // Validações por passo
  const canProceed = () => {
    if (currentStep === 1) {
      // Validar se tem barco selecionado e, se for escuna, se o tipo tem vagas
      if (!selectedDate || !selectedBoat) return false;
      
      // Para escunas, verificar se o tipo selecionado tem vagas
      if (selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined) {
        const limiteVagas = getLimiteVagas();
        return limiteVagas > 0;
      }
      
      return true;
    }
    if (currentStep === 2) {
      const limiteVagas = getLimiteVagas();
      return numberOfPeople >= 1 && numberOfPeople <= limiteVagas;
    }
    // Passos de dados das pessoas (3 até 2 + numberOfPeople)
    if (currentStep >= 3 && currentStep < 3 + numberOfPeople) {
      const personIndex = currentStep - 3;
      const person = people[personIndex];
      return person && person.name?.trim() && person.document?.trim() && (person.whatsapp?.trim() || person.phone?.trim()) && person.birthDate?.trim() && person.address?.trim();
    }
    // Último passo (resumo)
    return true;
  };

  const handleNext = () => {
    if (currentStep < totalSteps && canProceed()) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedBoat) {
      setError('Selecione um barco');
      return;
    }

    // Verificar se há vagas suficientes (considerando tipo de passeio para escunas)
    const limiteVagas = getLimiteVagas();
    if (numberOfPeople > limiteVagas) {
      const tipoTexto = selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined
        ? (escunaType === 'com-desembarque' ? 'com desembarque' : 'sem desembarque')
        : '';
      setError(`Não há vagas suficientes${tipoTexto ? ` para ${tipoTexto}` : ''}. Disponíveis: ${limiteVagas}`);
      return;
    }

    // Verificar se todos os dados estão preenchidos
    const missingData = people.findIndex(p => !p.name?.trim() || !p.document?.trim() || !(p.whatsapp?.trim() || p.phone?.trim()) || !p.birthDate?.trim() || !p.address?.trim());
    if (missingData !== -1) {
      setError(`Por favor, preencha todos os dados obrigatórios da pessoa ${missingData + 1}`);
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
        const seatNumber = baseTimestamp + index;
        
        const reservationData: Record<string, unknown> = {
          boatId: selectedBoat.id,
          seatNumber,
          status: 'pending',
          customerName: person.name,
          phone: person.whatsapp || person.phone || '',
          whatsapp: person.whatsapp || person.phone || '',
          address: person.address,
          document: person.document,
          birthDate: person.birthDate,
          email: person.email || '',
          paymentMethod: person.paymentMethod,
          totalAmount: person.amount,
          amountPaid: 0,
          amountDue: person.amount,
          vendorId: 'public',
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

      // Montar mensagem para WhatsApp (sem emojis problemáticos, usando texto simples)
      const peopleInfo = people.map((person, index) => {
        const whatsapp = person.whatsapp || person.phone || '';
        return `Pessoa ${index + 1}: ${person.name}${person.isChild ? ' (Criança)' : ''}\n` +
               `  WhatsApp: ${whatsapp}${person.email ? `\n  Email: ${person.email}` : ''}\n` +
               `  Valor: R$ ${person.amount.toFixed(2)}`;
      }).join('\n\n');

      const whatsappMessage = `Olá! Gostaria de efetuar o pagamento da minha reserva:\n\n` +
        `Data do Passeio: ${formatDateForDisplay(selectedBoat.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
        `Barco: ${selectedBoat.name}\n\n` +
        `Passageiros (${numberOfPeople}):\n${peopleInfo}\n\n` +
        `Valor Total: R$ ${totalAmount.toFixed(2)}\n` +
        `Forma de Pagamento Preferida: ${people[0]?.paymentMethod.toUpperCase() || 'PIX'}\n\n` +
        `Reserva já criada e aguardando aprovação.`;

      // Redirecionar para WhatsApp
      window.open(getWhatsAppLink(whatsappMessage), '_blank');
      
      // Fechar modal e resetar
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar reservas. Tente novamente.');
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
    const stepLabels = ['Data', 'Pessoas', ...Array.from({ length: numberOfPeople }, (_, i) => `Pessoa ${i + 1}`), 'Resumo'];
    const displaySteps = stepLabels.slice(0, totalSteps);
    
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 overflow-x-auto pb-2">
          {displaySteps.map((label, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 min-w-[60px]">
                <div className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all
                  ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-viva-blue text-white ring-4 ring-viva-blue/20' : 'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span className={`text-[10px] sm:text-xs mt-1 text-center ${isActive ? 'text-viva-blue font-bold' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-viva-blue to-viva-teal transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-viva-blue-dark">
              Nova Reserva
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">Passo {currentStep} de {totalSteps}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Barra de Progresso */}
        {renderProgressBar()}

        {/* Conteúdo do Passo */}
        <div className="min-h-[300px]">
          {/* PASSO 1: Seleção de Data e Barco */}
          {currentStep === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-viva-blue/10 rounded-full mb-3">
                  <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-viva-blue" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Quando será o passeio?</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Selecione a data no calendário</p>
              </div>

              {/* Calendário Visual */}
              <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                {/* Header do Calendário */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      const newMonth = new Date(calendarMonth);
                      newMonth.setMonth(newMonth.getMonth() - 1);
                      setCalendarMonth(newMonth);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition"
                  >
                    <ChevronLeft size={18} className="text-gray-600" />
                  </button>
                  <h3 className="text-sm sm:text-base font-bold text-gray-800 capitalize">{calendarMonthName}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newMonth = new Date(calendarMonth);
                      newMonth.setMonth(newMonth.getMonth() + 1);
                      setCalendarMonth(newMonth);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition"
                  >
                    <ChevronRight size={18} className="text-gray-600" />
                  </button>
                </div>

                {/* Dias da Semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Dias do Mês */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(calendarMonth).map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="w-8 h-8 sm:w-10 sm:h-10" />;
                    }

                    const status = getDayStatus(date);
                    const dateStr = date.toISOString().split('T')[0];

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={status.isPast || !status.hasBoat}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedBoat(null);
                        }}
                        className={`w-8 h-8 sm:w-10 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition ${
                          status.isSelected
                            ? 'bg-viva-blue text-white shadow-md'
                            : status.isPast
                            ? 'text-gray-300 cursor-not-allowed'
                            : status.hasBoat
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                            : status.isToday
                            ? 'bg-viva-blue/10 text-viva-blue ring-2 ring-viva-blue/30'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 sm:mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-100 border border-green-300"></div>
                    <span className="text-[10px] sm:text-xs text-gray-500">Disponível</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-viva-blue"></div>
                    <span className="text-[10px] sm:text-xs text-gray-500">Selecionado</span>
                  </div>
                </div>
              </div>

              {/* Data selecionada */}
              {selectedDate && (
                <div className="text-center py-2 px-4 bg-viva-blue/10 rounded-xl">
                  <p className="text-sm text-viva-blue-dark font-semibold">
                    📅 {formatDisplayDate(selectedDate)}
                  </p>
                </div>
              )}

              {selectedDate && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    🚢 Selecione o Barco
                  </label>
                  {filteredBoatsForDate.length === 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <p className="text-orange-700 font-medium">Nenhum barco disponível para esta data</p>
                      <p className="text-orange-600 text-sm">Tente selecionar outra data</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {filteredBoatsForDate.map((boat) => {
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
                          // Resetar quantidade de pessoas quando mudar barco
                          setNumberOfPeople(1);
                          setPeople([]);
                        }}
                            disabled={availableCount === 0}
                            className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected 
                                ? 'border-viva-blue bg-viva-blue/10 ring-2 ring-viva-blue/20' 
                                : availableCount === 0
                                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-viva-blue/50 hover:bg-viva-blue/5'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-lg">
                                    {boat.boatType === 'escuna' ? '🚢' : '🚤'}
                                  </span>
                                  <span className="font-bold text-gray-800">{boat.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    boat.boatType === 'escuna' 
                                      ? 'bg-viva-blue/20 text-viva-blue-dark' 
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {boat.boatType === 'escuna' ? 'Escuna' : 'Lancha'}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                  <strong>{availableCount}</strong> vagas totais disponíveis de {boat.seatsTotal}
                                </p>
                                
                                {/* Vagas por tipo de serviço - apenas para escunas */}
                                {boat.boatType === 'escuna' && boat.seatsWithLanding !== undefined && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">Com Desembarque:</span>
                                      <span className={`font-bold ${
                                        vagasComDesembarque <= 0 ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                        {vagasComDesembarque} livres / {boat.seatsWithLanding}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">Sem Desembarque (Panorâmico):</span>
                                      <span className={`font-bold ${
                                        vagasPanoramico <= 0 ? 'text-red-600' : 'text-blue-600'
                                      }`}>
                                        {vagasPanoramico} livres / {boat.seatsWithoutLanding}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                <p className="text-xs sm:text-sm text-viva-blue-dark font-semibold mt-1">
                                  R$ {getBasePriceForBoat(boat).toFixed(2)} por pessoa
                                </p>
                              </div>
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ml-3 ${
                                isSelected ? 'border-viva-blue bg-viva-blue' : 'border-gray-300'
                              }`}>
                                {isSelected && <span className="text-white text-xs sm:text-sm">✓</span>}
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
              {selectedBoat?.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Passeio</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const vagasPanoramico = (selectedBoat.seatsWithoutLanding || 0) - (selectedBoat.seatsWithoutLandingTaken || 0);
                      const vagasComDesembarque = (selectedBoat.seatsWithLanding || 0) - (selectedBoat.seatsWithLandingTaken || 0);
                      
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEscunaType('sem-desembarque');
                              // Resetar quantidade quando mudar tipo
                              setNumberOfPeople(1);
                              setPeople([]);
                            }}
                            disabled={vagasPanoramico <= 0}
                            className={`px-4 py-3 rounded-xl font-bold transition text-sm ${
                              escunaType === 'sem-desembarque'
                                ? 'bg-viva-blue text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } ${vagasPanoramico <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Sem Desembarque
                            {vagasPanoramico <= 0 && <span className="block text-xs mt-1 text-red-600">Sem vagas</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEscunaType('com-desembarque');
                              // Resetar quantidade quando mudar tipo
                              setNumberOfPeople(1);
                              setPeople([]);
                            }}
                            disabled={vagasComDesembarque <= 0}
                            className={`px-4 py-3 rounded-xl font-bold transition text-sm ${
                              escunaType === 'com-desembarque'
                                ? 'bg-viva-blue text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } ${vagasComDesembarque <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Com Desembarque
                            {vagasComDesembarque <= 0 && <span className="block text-xs mt-1 text-red-600">Sem vagas</span>}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: Quantidade de Pessoas */}
          {currentStep === 2 && selectedBoat && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-viva-orange/10 rounded-full mb-4">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 text-viva-orange" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Quantas pessoas vão no passeio?</h3>
                <p className="text-gray-500 text-sm">Selecione a quantidade de passageiros</p>
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
                    <div className="bg-viva-blue/10 border border-viva-blue/20 rounded-xl p-4 text-center">
                      <p className="text-viva-blue-dark text-base sm:text-lg">
                        <strong>{vagasDisponiveis}</strong> vagas totais disponíveis de <strong>{selectedBoat.seatsTotal}</strong>
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
                            <p className="text-sm font-semibold text-gray-700 mt-1">Com Desembarque</p>
                            <p className={`text-2xl font-black ${
                              vagasComDesembarque <= 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {vagasComDesembarque}
                            </p>
                            <p className="text-xs text-gray-500">vagas livres de {selectedBoat.seatsWithLanding}</p>
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
                            <p className="text-sm font-semibold text-gray-700 mt-1">Sem Desembarque</p>
                            <p className={`text-2xl font-black ${
                              vagasPanoramico <= 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {vagasPanoramico}
                            </p>
                            <p className="text-xs text-gray-500">vagas livres de {selectedBoat.seatsWithoutLanding}</p>
                            {escunaType === 'sem-desembarque' && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                                ✓ Selecionado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-4 sm:gap-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newCount = Math.max(1, numberOfPeople - 1);
                          setNumberOfPeople(newCount);
                        }}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl sm:text-3xl font-bold text-gray-600 transition shadow-sm"
                      >
                        −
                      </button>
                      <div className="text-center px-4 sm:px-6">
                        <span className="text-5xl sm:text-7xl font-black text-viva-blue">{numberOfPeople}</span>
                        <p className="text-gray-500 mt-2 text-base sm:text-lg">{numberOfPeople === 1 ? 'pessoa' : 'pessoas'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newCount = Math.min(limiteVagas, numberOfPeople + 1);
                          setNumberOfPeople(newCount);
                        }}
                        disabled={numberOfPeople >= limiteVagas}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl sm:text-3xl font-bold text-gray-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    {numberOfPeople > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-green-800 font-medium text-sm sm:text-lg">
                          {numberOfPeople} {numberOfPeople === 1 ? 'vaga será reservada' : 'vagas serão reservadas'}
                          {selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined && (
                            <span className="block text-sm mt-1">
                              ({escunaType === 'com-desembarque' ? 'Com Desembarque' : 'Sem Desembarque'})
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Aviso quando não há vagas do tipo selecionado */}
                    {selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined && limiteVagas <= 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <p className="text-red-700 font-medium">
                          Não há vagas disponíveis para {escunaType === 'com-desembarque' ? 'Com Desembarque' : 'Sem Desembarque'}
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
            <div className="space-y-4 sm:space-y-5">
              {(() => {
                const personIndex = currentStep - 3;
                const person = people[personIndex] || {
                  name: '',
                  document: '',
                  phone: '',
                  whatsapp: '',
                  birthDate: '',
                  email: '',
                  address: '',
                  isChild: false,
                  isHalfPrice: false,
                  amount: getBasePrice(),
                  paymentMethod: 'pix',
                  amountPaid: 0,
                };
                const base = getBasePrice();

                return (
                  <>
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-viva-green/10 rounded-full mb-3">
                        <Users className="w-6 h-6 sm:w-7 sm:h-7 text-viva-green" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                        Dados da Pessoa {personIndex + 1}
                      </h3>
                      <p className="text-gray-500 text-sm">Preencha as informações do passageiro</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nome Completo *
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
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none"
                          placeholder="Nome completo do passageiro"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Documento *
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
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none"
                            placeholder="CPF, RG, Passaporte..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Data de Nascimento *
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
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          WhatsApp *
                        </label>
                        <input
                          type="tel"
                          value={person.whatsapp || person.phone || ''}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[personIndex] = { 
                              ...person, 
                              whatsapp: e.target.value,
                              phone: e.target.value // Manter sincronizado para compatibilidade
                            };
                            setPeople(newPeople);
                          }}
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none"
                          placeholder="(48) 99999-9999 ou +55 48 99999-9999"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email (opcional)
                        </label>
                        <input
                          type="email"
                          value={person.email || ''}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[personIndex] = { ...person, email: e.target.value };
                            setPeople(newPeople);
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none"
                          placeholder="cliente@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Endereço Completo *
                        </label>
                        <textarea
                          value={person.address}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[personIndex] = { ...person, address: e.target.value };
                            setPeople(newPeople);
                          }}
                          required
                          rows={2}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none"
                          placeholder="Rua, número, bairro, cidade..."
                        />
                      </div>

                      {/* Checkbox para criança */}
                      <div className="flex items-center gap-2 p-3 bg-viva-orange/10 rounded-lg">
                        <input
                          type="checkbox"
                          id={`child-${personIndex}`}
                          checked={person.isChild || person.isHalfPrice}
                          onChange={(e) => {
                            const isChild = e.target.checked;
                            const newPeople = [...people];
                            newPeople[personIndex] = {
                              ...person,
                              isChild,
                              isHalfPrice: isChild,
                              amount: isChild ? base / 2 : base,
                            };
                            setPeople(newPeople);
                          }}
                          className="w-5 h-5 text-viva-blue border-gray-300 rounded focus:ring-viva-blue"
                        />
                        <label htmlFor={`child-${personIndex}`} className="text-sm font-semibold text-viva-orange cursor-pointer flex-1">
                          👶 Menor de 7 anos (meia entrada - R$ {(base / 2).toFixed(2)})
                        </label>
                      </div>

                      {/* Valor */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <span className="font-semibold">Valor:</span> R$ {person.amount.toFixed(2)} ({person.isChild || person.isHalfPrice ? 'meia entrada' : 'inteira'})
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ÚLTIMO PASSO: Resumo */}
          {currentStep === totalSteps && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full mb-3">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Resumo da Reserva</h3>
                <p className="text-gray-500 text-sm">Revise os dados antes de finalizar</p>
              </div>

              {/* Resumo */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6 space-y-4">
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">📅 Data do Passeio</h4>
                  <p className="text-gray-700">{formatDisplayDate(selectedBoat?.date || '')}</p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-2">🚢 Barco</h4>
                  <p className="text-gray-700">{selectedBoat?.name}</p>
                  {selectedBoat?.boatType === 'escuna' && (
                    <p className="text-sm text-gray-600 mt-1">
                      Tipo: {escunaType === 'com-desembarque' ? 'Com Desembarque' : 'Sem Desembarque'}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-2">👥 Passageiros ({numberOfPeople})</h4>
                  <div className="space-y-2">
                    {people.map((person, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="font-semibold text-gray-800">
                          {index + 1}. {person.name} {person.isChild ? '(Criança)' : ''}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          📞 {person.phone} | 💰 R$ {person.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-lg">Valor Total:</span>
                    <span className="text-2xl sm:text-3xl font-black text-green-700">R$ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Botões de navegação */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Voltar
            </button>
          )}
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="flex-1 px-4 py-3 bg-viva-blue text-white rounded-xl font-bold hover:bg-viva-blue-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Criando reserva...' : 'Efetuar pagamento'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
