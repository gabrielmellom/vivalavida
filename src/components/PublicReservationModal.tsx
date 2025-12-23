'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Boat, Reservation, PaymentMethod } from '@/types';
import { Calendar, Users, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface PublicReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SeatData {
  name: string;
  isChild: boolean; // menor de 7 anos paga meia
  phone: string;
  whatsapp: string;
  email: string;
  document: string;
  birthDate: string;
  address: string;
}

export default function PublicReservationModal({ isOpen, onClose }: PublicReservationModalProps) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seatData, setSeatData] = useState<Record<number, SeatData>>({});
  const [expandedSeats, setExpandedSeats] = useState<Set<number>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Estados do calendário
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [boatsForSelectedDate, setBoatsForSelectedDate] = useState<Boat[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Buscar barcos ativos do dia ou próximos dias
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
        // Se for erro de índice faltando, tenta buscar sem orderBy
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
            // Filtrar por data e ordenar manualmente
            const filtered = boatsData
              .filter(b => b.date >= today)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setBoats(filtered);
          });
        }
      }
    );

    return unsubscribe;
  }, [isOpen]);

  useEffect(() => {
    if (!selectedBoat) {
      setAvailableSeats([]);
      return;
    }

    // Buscar reservas aprovadas para o barco selecionado
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('boatId', '==', selectedBoat.id),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(
      reservationsQuery,
      (snapshot) => {
        const reservations = snapshot.docs.map(doc => doc.data()) as Reservation[];
        const takenSeats = reservations.map(r => r.seatNumber);
        
        const available: number[] = [];
        for (let i = 1; i <= selectedBoat.seatsTotal; i++) {
          if (!takenSeats.includes(i)) {
            available.push(i);
          }
        }
        setAvailableSeats(available);
      },
      (error) => {
        console.error('Erro ao carregar assentos disponíveis:', error);
        // Em caso de erro, mostra todos os assentos como disponíveis
        const available: number[] = [];
        for (let i = 1; i <= selectedBoat.seatsTotal; i++) {
          available.push(i);
        }
        setAvailableSeats(available);
      }
    );

    return unsubscribe;
  }, [selectedBoat]);

  const handleSelectBoat = (boat: Boat) => {
    setSelectedBoat(boat);
    setSelectedSeats([]);
    setSeatData({});
    setError('');
  };

  // Calcular valores totais usando o preço do barco (com useMemo para garantir reatividade)
  const totalAmount = useMemo(() => {
    if (!selectedBoat) return 0;
    
    const base = selectedBoat.ticketPrice || 200;
    let total = 0;
    
    selectedSeats.forEach(seat => {
      const data = seatData[seat];
      if (data?.isChild) {
        total += base / 2; // Meia entrada para crianças
      } else {
        total += base;
      }
    });
    
    return total;
  }, [selectedBoat, selectedSeats, seatData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoat || selectedSeats.length === 0) {
      setError('Selecione um barco e pelo menos um assento');
      return;
    }

    // Validar que todos os assentos têm dados completos
    const missingData = selectedSeats.filter(seat => {
      const data = seatData[seat];
      return !data?.name?.trim() || !data?.phone?.trim() || !data?.address?.trim();
    });
    
    if (missingData.length > 0) {
      setError(`Por favor, preencha o nome, telefone e endereço para todos os assentos selecionados (assentos: ${missingData.join(', ')})`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Verificar se os assentos ainda estão disponíveis
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', selectedBoat.id),
        where('status', '==', 'approved')
      );
      const reservationsSnapshot = await getDocs(reservationsQuery);
      const approvedReservations = reservationsSnapshot.docs.map(doc => doc.data()) as Reservation[];
      const takenSeats = approvedReservations.map(r => r.seatNumber);

      const unavailableSeats = selectedSeats.filter(seat => takenSeats.includes(seat));
      if (unavailableSeats.length > 0) {
        setError(`Os assentos ${unavailableSeats.join(', ')} já estão ocupados. Por favor, selecione outros assentos.`);
        setLoading(false);
        return;
      }

      // Criar reservas no banco
      const groupId = selectedSeats.length > 1 ? `group_${Date.now()}` : undefined;
      const base = selectedBoat.ticketPrice || 200;
      
      // Calcular valores por assento
      const seatValues = selectedSeats.map(seat => {
        const data = seatData[seat] || { name: '', isChild: false };
        return data.isChild ? base / 2 : base;
      });
      
      // Criar reservas
      const reservations = selectedSeats.map((seatNumber, index) => {
        const data = seatData[seatNumber] || { 
          name: '', 
          isChild: false, 
          phone: '', 
          whatsapp: '', 
          email: '', 
          document: '', 
          birthDate: '',
          address: ''
        };
        const seatTotal = seatValues[index];
        
        const reservationData: Record<string, unknown> = {
          boatId: selectedBoat.id,
          seatNumber,
          status: 'pending' as const,
          customerName: data.name,
          phone: data.phone,
          whatsapp: data.whatsapp || data.phone,
          address: data.address,
          paymentMethod,
          totalAmount: seatTotal,
          amountPaid: 0,
          amountDue: seatTotal,
          vendorId: 'public',
          rideDate: selectedBoat.date,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        // Adicionar campos opcionais apenas se tiverem valor
        if (data.document) reservationData.document = data.document;
        if (data.birthDate) reservationData.birthDate = data.birthDate;
        if (data.email) reservationData.email = data.email;
        if (groupId) reservationData.groupId = groupId;
        
        return reservationData;
      });

      // Criar uma reserva para cada assento selecionado
      const reservationPromises = reservations.map(async (reservation) => {
        return addDoc(collection(db, 'reservations'), reservation);
      });

      await Promise.all(reservationPromises);

      // Montar mensagem para WhatsApp
      const seatsInfo = selectedSeats.sort((a, b) => a - b).map(seat => {
        const data = seatData[seat] || { 
          name: '', 
          isChild: false, 
          phone: '', 
          whatsapp: '', 
          email: '', 
          document: '', 
          birthDate: '',
          address: ''
        };
        const seatPrice = data.isChild ? base / 2 : base;
        return `Assento ${seat}: ${data.name} (${data.isChild ? 'Criança' : 'Adulto'}) - R$ ${seatPrice.toFixed(2)}\n` +
               `  📞 ${data.phone}${data.whatsapp && data.whatsapp !== data.phone ? ` | 📱 ${data.whatsapp}` : ''}${data.email ? ` | 📧 ${data.email}` : ''}\n` +
               `  📍 ${data.address}`;
      }).join('\n\n');

      const whatsappMessage = `Olá! Gostaria de fazer uma reserva:\n\n` +
        `📅 Data: ${formatDateForDisplay(selectedBoat.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
        `🚢 Barco: ${selectedBoat.name}\n\n` +
        `👥 Passageiros:\n${seatsInfo}\n\n` +
        `💰 Valor Total: R$ ${totalAmount.toFixed(2)}\n` +
        `💳 Forma de Pagamento: ${paymentMethod.toUpperCase()}`;

      // Redirecionar para WhatsApp
      window.open(`https://wa.me/5548999999999?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
      
      // Fechar modal e resetar formulário
      onClose();
      setSelectedBoat(null);
      setSelectedSeats([]);
      setSeatData({});
      setExpandedSeats(new Set());
      setPaymentMethod('pix');
      setSelectedDate(null);
      setBoatsForSelectedDate([]);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar reserva. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-viva-blue-dark">Reservar Passeio</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seleção de Barco via Calendário */}
            {!selectedBoat ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Selecione a Data do Passeio
                </label>
                
                {/* Calendário */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-4">
                  {/* Header do Calendário */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <h3 className="font-bold text-viva-blue-dark capitalize">
                      {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* Dias da semana */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Dias do mês */}
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const year = currentMonth.getFullYear();
                      const month = currentMonth.getMonth();
                      const firstDay = new Date(year, month, 1);
                      const lastDay = new Date(year, month + 1, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const days = [];
                      
                      // Dias vazios antes do primeiro dia do mês
                      for (let i = 0; i < firstDay.getDay(); i++) {
                        days.push(<div key={`empty-${i}`} className="p-2" />);
                      }
                      
                      // Dias do mês
                      for (let day = 1; day <= lastDay.getDate(); day++) {
                        const date = new Date(year, month, day, 12, 0, 0);
                        const dateStr = date.toISOString().split('T')[0];
                        const isPast = date < today;
                        
                        // Verificar se tem barco nesse dia
                        const boatsOnDay = boats.filter(b => {
                          const boatDateStr = b.date.split('T')[0];
                          return boatDateStr === dateStr;
                        });
                        const hasBoat = boatsOnDay.length > 0;
                        const totalAvailable = boatsOnDay.reduce((sum, b) => sum + (b.seatsTotal - b.seatsTaken), 0);
                        const isSelected = selectedDate === dateStr;
                        
                        days.push(
                          <button
                            key={day}
                            type="button"
                            disabled={isPast || !hasBoat}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setBoatsForSelectedDate(boatsOnDay);
                            }}
                            className={`relative p-2 rounded-lg text-sm font-semibold transition ${
                              isSelected
                                ? 'bg-viva-blue text-white'
                                : isPast
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : hasBoat
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                                    : 'text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            {day}
                            {hasBoat && !isPast && (
                              <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-green-500'
                              }`} />
                            )}
                          </button>
                        );
                      }
                      
                      return days;
                    })()}
                  </div>

                  {/* Legenda */}
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-200 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-100 rounded border border-green-300" />
                      <span className="text-gray-600">Com passeio</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-100 rounded border border-gray-300" />
                      <span className="text-gray-600">Sem passeio</span>
                    </div>
                  </div>
                </div>

                {/* Barcos do dia selecionado */}
                {selectedDate && boatsForSelectedDate.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={18} className="text-viva-blue" />
                      Barcos em {formatDateForDisplay(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {boatsForSelectedDate.map((boat) => {
                        const availableCount = boat.seatsTotal - boat.seatsTaken;
                        return (
                          <button
                            key={boat.id}
                            type="button"
                            onClick={() => handleSelectBoat(boat)}
                            disabled={availableCount === 0}
                            className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-viva-blue hover:bg-viva-blue/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-viva-blue-dark">{boat.name}</p>
                                <p className="text-sm text-gray-600">
                                  {boat.boatType === 'escuna' ? '🚢 Escuna' : '🚤 Lancha'} • R$ {(boat.ticketPrice || 200).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className={`flex items-center gap-1 text-sm font-semibold ${
                                  availableCount > 10 ? 'text-green-600' : availableCount > 0 ? 'text-orange-600' : 'text-red-600'
                                }`}>
                                  <Users size={16} />
                                  <span>{availableCount} vagas</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDate && boatsForSelectedDate.length === 0 && (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-xl">
                    Nenhum barco disponível nesta data
                  </div>
                )}

                {!selectedDate && boats.length > 0 && (
                  <div className="text-center py-4 text-gray-500 bg-blue-50 rounded-xl">
                    <Calendar className="mx-auto mb-2 text-viva-blue" size={24} />
                    <p>Clique em um dia verde para ver os barcos disponíveis</p>
                  </div>
                )}

                {boats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Não há passeios disponíveis no momento
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Barco Selecionado */}
                <div className="bg-viva-blue/10 border-2 border-viva-blue rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-viva-blue-dark">{selectedBoat.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatDateForDisplay(selectedBoat.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBoat(null);
                        setSelectedSeats([]);
                        setSeatData({});
                        setExpandedSeats(new Set());
                        setSelectedDate(null);
                        setBoatsForSelectedDate([]);
                      }}
                      className="text-sm text-viva-blue hover:text-viva-blue-dark font-semibold"
                    >
                      Trocar Data
                    </button>
                  </div>
                </div>

                {/* Seleção de Assentos (Múltiplos para grupo) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Selecione os Assentos {selectedSeats.length > 0 && `(${selectedSeats.length} selecionado${selectedSeats.length > 1 ? 's' : ''})`} ({availableSeats.length} disponíveis)
                  </label>
                  <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-xl">
                    {Array.from({ length: selectedBoat.seatsTotal }, (_, i) => {
                      const seatNum = i + 1;
                      const isAvailable = availableSeats.includes(seatNum);
                      const isSelected = selectedSeats.includes(seatNum);
                      
                      return (
                        <button
                          key={seatNum}
                          type="button"
                          onClick={() => {
                            if (isAvailable) {
                              if (isSelected) {
                                setSelectedSeats(selectedSeats.filter(s => s !== seatNum));
                                // Remover dados do assento
                                const newSeatData = { ...seatData };
                                delete newSeatData[seatNum];
                                setSeatData(newSeatData);
                                // Remover do expanded
                                const newExpanded = new Set(expandedSeats);
                                newExpanded.delete(seatNum);
                                setExpandedSeats(newExpanded);
                              } else {
                                setSelectedSeats([...selectedSeats, seatNum]);
                                // Inicializar dados do assento
                                setSeatData({
                                  ...seatData,
                                  [seatNum]: { 
                                    name: '', 
                                    isChild: false,
                                    phone: '',
                                    whatsapp: '',
                                    email: '',
                                    document: '',
                                    birthDate: '',
                                    address: ''
                                  }
                                });
                                // Expandir automaticamente o novo assento
                                setExpandedSeats(new Set([...expandedSeats, seatNum]));
                              }
                            }
                          }}
                          disabled={!isAvailable}
                          className={`px-3 py-2 rounded-lg font-bold transition text-sm ${
                            isSelected
                              ? 'bg-viva-blue text-white'
                              : isAvailable
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-500 cursor-not-allowed opacity-50'
                          }`}
                          title={isAvailable ? 'Livre' : 'Ocupado'}
                        >
                          {isAvailable ? '✓' : '✗'}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-green-100 rounded"></div>
                      <span>Livre</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-100 rounded"></div>
                      <span>Ocupado</span>
                    </div>
                  </div>
                  {selectedSeats.length > 0 && (
                    <p className="mt-2 text-sm text-viva-blue font-semibold">
                      {selectedSeats.length} assento{selectedSeats.length > 1 ? 's' : ''} selecionado{selectedSeats.length > 1 ? 's' : ''}: {selectedSeats.sort((a, b) => a - b).join(', ')}
                    </p>
                  )}
                </div>

                {/* Dados por Assento - Accordion */}
                {selectedSeats.length > 0 && (
                  <div className="border-2 border-viva-blue/20 rounded-xl p-4 bg-viva-blue/5">
                    <h3 className="text-lg font-bold text-viva-blue-dark mb-4">
                      Dados dos Passageiros ({selectedSeats.length} {selectedSeats.length === 1 ? 'passageiro' : 'passageiros'})
                    </h3>
                    <div className="space-y-2">
                      {selectedSeats.sort((a, b) => a - b).map((seatNum) => {
                        const data = seatData[seatNum] || { 
                          name: '', 
                          isChild: false, 
                          phone: '', 
                          whatsapp: '', 
                          email: '', 
                          document: '', 
                          birthDate: '',
                          address: ''
                        };
                        const isExpanded = expandedSeats.has(seatNum);
                        const base = selectedBoat.ticketPrice || 200;
                        const seatPrice = data.isChild ? base / 2 : base;
                        
                        return (
                          <div key={seatNum} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Header do Accordion */}
                            <button
                              type="button"
                              onClick={() => {
                                const newExpanded = new Set(expandedSeats);
                                if (isExpanded) {
                                  newExpanded.delete(seatNum);
                                } else {
                                  newExpanded.add(seatNum);
                                }
                                setExpandedSeats(newExpanded);
                              }}
                              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-3 flex-1 text-left">
                                <div className="bg-viva-blue text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0">
                                  #{seatNum}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-viva-blue-dark">
                                      {data.name || `Assento ${seatNum}`}
                                    </h4>
                                    {data.isChild && (
                                      <span className="bg-viva-orange/20 text-viva-orange text-xs font-semibold px-2 py-0.5 rounded-full">
                                        👶 Criança
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {data.name ? `${data.isChild ? 'Meia entrada' : 'Inteira'} - R$ ${seatPrice.toFixed(2)}` : 'Clique para preencher os dados'}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 ml-2">
                                {isExpanded ? (
                                  <ChevronUp className="text-gray-400" size={20} />
                                ) : (
                                  <ChevronDown className="text-gray-400" size={20} />
                                )}
                              </div>
                            </button>
                            
                            {/* Conteúdo do Accordion */}
                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-gray-200 pt-4 space-y-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nome Completo *
                                  </label>
                                  <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => {
                                      setSeatData({
                                        ...seatData,
                                        [seatNum]: { ...data, name: e.target.value }
                                      });
                                    }}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                                    placeholder={`Nome do passageiro do assento ${seatNum}`}
                                  />
                                </div>
                                
                                <div className="flex items-center gap-2 p-3 bg-viva-orange/10 rounded-lg">
                                  <input
                                    type="checkbox"
                                    id={`child-${seatNum}`}
                                    checked={data.isChild}
                                    onChange={(e) => {
                                      setSeatData({
                                        ...seatData,
                                        [seatNum]: { ...data, isChild: e.target.checked }
                                      });
                                    }}
                                    className="w-5 h-5 text-viva-blue border-gray-300 rounded focus:ring-viva-blue"
                                  />
                                  <label htmlFor={`child-${seatNum}`} className="text-sm font-semibold text-viva-orange cursor-pointer flex-1">
                                    👶 Menor de 7 anos (meia entrada - R$ {(base / 2).toFixed(2)})
                                  </label>
                                </div>

                                {/* Dados de Contato do Passageiro */}
                                <div className="border-t border-gray-200 pt-4 space-y-3">
                                  <h5 className="text-sm font-bold text-gray-700">Dados de Contato</h5>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Telefone *
                                      </label>
                                      <input
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => {
                                          setSeatData({
                                            ...seatData,
                                            [seatNum]: { ...data, phone: e.target.value }
                                          });
                                        }}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                                        placeholder="(48) 99999-9999"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        WhatsApp (opcional)
                                      </label>
                                      <input
                                        type="tel"
                                        value={data.whatsapp}
                                        onChange={(e) => {
                                          setSeatData({
                                            ...seatData,
                                            [seatNum]: { ...data, whatsapp: e.target.value }
                                          });
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                                        placeholder="(48) 99999-9999"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email
                                      </label>
                                      <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => {
                                          setSeatData({
                                            ...seatData,
                                            [seatNum]: { ...data, email: e.target.value }
                                          });
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                                        placeholder="cliente@email.com"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Documento (CPF/RG)
                                      </label>
                                      <input
                                        type="text"
                                        value={data.document}
                                        onChange={(e) => {
                                          setSeatData({
                                            ...seatData,
                                            [seatNum]: { ...data, document: e.target.value }
                                          });
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                                        placeholder="000.000.000-00"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                      Data de Nascimento
                                    </label>
                                    <input
                                      type="date"
                                      value={data.birthDate}
                                      onChange={(e) => {
                                        setSeatData({
                                          ...seatData,
                                          [seatNum]: { ...data, birthDate: e.target.value }
                                        });
                                      }}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                      Endereço *
                                    </label>
                                    <textarea
                                      value={data.address}
                                      onChange={(e) => {
                                        setSeatData({
                                          ...seatData,
                                          [seatNum]: { ...data, address: e.target.value }
                                        });
                                      }}
                                      required
                                      rows={2}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                                      placeholder="Rua, número, bairro, cidade..."
                                    />
                                  </div>
                                </div>

                                {data.name && (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm text-green-800">
                                      <span className="font-semibold">Valor:</span> R$ {seatPrice.toFixed(2)} ({data.isChild ? 'meia entrada' : 'inteira'})
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Informações de Pagamento */}
                <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
                  <h3 className="text-lg font-bold text-green-800 mb-4">💰 Informações de Pagamento</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Preço por Pessoa (Adulto)</label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-700 font-bold">
                        R$ {(selectedBoat.ticketPrice || 200).toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Crianças menores de 7 anos pagam metade (R$ {((selectedBoat.ticketPrice || 200) / 2).toFixed(2)})</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Forma de Pagamento *</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                      >
                        <option value="pix">PIX</option>
                        <option value="cartao">Cartão</option>
                        <option value="dinheiro">Dinheiro</option>
                      </select>
                    </div>
                  </div>

                  {/* Resumo de Valores */}
                  <div className="bg-white rounded-lg p-4 border border-green-300">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Valor Total:</span>
                        <span className="text-xl font-black text-green-700">R$ {totalAmount.toFixed(2)}</span>
                      </div>
                      {selectedSeats.length > 0 && (
                        <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                          <p className="font-semibold mb-1">Detalhamento:</p>
                          <ul className="list-disc list-inside mt-1">
                            {selectedSeats.sort((a, b) => a - b).map(seat => {
                              const data = seatData[seat] || { name: '', isChild: false };
                              const base = selectedBoat.ticketPrice || 200;
                              const seatPrice = data.isChild ? base / 2 : base;
                              return (
                                <li key={seat}>
                                  Assento {seat} ({data.isChild ? 'Criança' : 'Adulto'}): R$ {seatPrice.toFixed(2)}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

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
                    disabled={loading || selectedSeats.length === 0 || selectedSeats.some(seat => !seatData[seat]?.name?.trim())}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Finalizar e Enviar para WhatsApp'}
                  </button>
                </div>
              </>
            )}
          </form>
      </div>
    </div>
  );
}

