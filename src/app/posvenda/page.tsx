'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Boat, Reservation } from '@/types';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Users, 
  Phone, 
  MapPin, 
  Mail,
  FileText,
  Ship,
  X,
  Anchor,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Formatar data sem problemas de timezone
const formatDateSafe = (dateString: string) => {
  if (!dateString) return '';
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

// Nomes dos meses em português
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function PosVendaDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [passengers, setPassengers] = useState<Reservation[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar todos os barcos com status 'completed' ou que já passaram
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const boatsQuery = query(collection(db, 'boats'));

    const unsubscribe = onSnapshot(boatsQuery, (snapshot) => {
      const boatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Boat[];

      // Filtrar apenas barcos que já passaram (data menor que hoje) ou com status completed
      const pastBoats = boatsData.filter(boat => {
        const boatDate = new Date(boat.date);
        boatDate.setHours(0, 0, 0, 0);
        return boatDate < today || boat.status === 'completed';
      });

      setBoats(pastBoats);
    });

    return () => unsubscribe();
  }, []);

  // Agrupar barcos por data
  const boatsByDate = useMemo(() => {
    const map: Record<string, Boat[]> = {};
    boats.forEach(boat => {
      const dateKey = boat.date.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(boat);
    });
    return map;
  }, [boats]);

  // Gerar dias do calendário
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Dias do mês anterior para preencher a primeira semana
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Dias do próximo mês para completar a última semana
    const remainingDays = 42 - days.length; // 6 semanas x 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  }, [currentMonth]);

  // Navegar meses
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Selecionar data com barco
  const handleSelectDate = async (dateStr: string) => {
    const boatsOnDate = boatsByDate[dateStr];
    if (!boatsOnDate || boatsOnDate.length === 0) return;

    setSelectedDate(dateStr);
    
    // Se tiver apenas um barco, seleciona automaticamente
    if (boatsOnDate.length === 1) {
      await loadPassengers(boatsOnDate[0]);
    } else {
      setSelectedBoat(null);
      setPassengers([]);
    }
  };

  // Carregar passageiros de um barco
  const loadPassengers = async (boat: Boat) => {
    setSelectedBoat(boat);
    setLoadingPassengers(true);
    setSearchTerm('');

    try {
      // Buscar reservas aprovadas e com check-in feito
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', boat.id),
        where('status', '==', 'approved')
      );

      const snapshot = await getDocs(reservationsQuery);
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Reservation[];

      // Ordenar por número do assento
      reservationsData.sort((a, b) => a.seatNumber - b.seatNumber);
      
      setPassengers(reservationsData);
    } catch (error) {
      console.error('Erro ao carregar passageiros:', error);
    } finally {
      setLoadingPassengers(false);
    }
  };

  // Filtrar passageiros
  const filteredPassengers = passengers.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(search) ||
      p.phone?.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search) ||
      p.document?.toLowerCase().includes(search)
    );
  });

  // Estatísticas
  const checkedInCount = passengers.filter(p => p.checkedIn).length;
  const notCheckedInCount = passengers.length - checkedInCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-purple-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
                <Anchor className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-purple-800">Pós-Venda</h1>
                <p className="text-purple-600 text-xs sm:text-sm">Dados de Passageiros</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-gray-600 text-xs sm:text-sm hidden sm:block max-w-[150px] truncate">
                {user?.email}
              </span>
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

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
              {/* Header do Calendário */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <div className="flex items-center justify-between text-white">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-lg font-bold">
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h2>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Dias da Semana */}
              <div className="grid grid-cols-7 bg-purple-50 border-b border-purple-100">
                {WEEKDAYS.map(day => (
                  <div key={day} className="py-2 text-center text-xs font-semibold text-purple-700">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid do Calendário */}
              <div className="grid grid-cols-7 p-2 gap-1">
                {calendarDays.map((day, index) => {
                  const dateStr = day.date.toISOString().split('T')[0];
                  const hasBoats = boatsByDate[dateStr] && boatsByDate[dateStr].length > 0;
                  const boatCount = boatsByDate[dateStr]?.length || 0;
                  const isSelected = selectedDate === dateStr;
                  const isToday = day.date.toDateString() === new Date().toDateString();

                  return (
                    <button
                      key={index}
                      onClick={() => hasBoats && handleSelectDate(dateStr)}
                      disabled={!hasBoats}
                      className={`
                        aspect-square rounded-lg text-sm font-semibold relative transition-all
                        ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                        ${hasBoats && day.isCurrentMonth 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white hover:shadow-lg hover:scale-105 cursor-pointer' 
                          : day.isCurrentMonth 
                            ? 'text-gray-600 hover:bg-gray-100' 
                            : ''
                        }
                        ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
                        ${isToday && !hasBoats ? 'bg-purple-100 text-purple-700' : ''}
                        ${!hasBoats ? 'cursor-default' : ''}
                      `}
                    >
                      {day.date.getDate()}
                      {hasBoats && day.isCurrentMonth && boatCount > 1 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                          {boatCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-600 rounded"></div>
                    <span className="text-gray-600">Barco com passageiros</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Barcos do Dia Selecionado */}
            {selectedDate && boatsByDate[selectedDate] && boatsByDate[selectedDate].length > 1 && (
              <div className="mt-4 bg-white rounded-2xl shadow-lg border border-purple-100 p-4">
                <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                  <Ship size={18} />
                  Barcos em {formatDateSafe(selectedDate)}
                </h3>
                <div className="space-y-2">
                  {boatsByDate[selectedDate].map(boat => (
                    <button
                      key={boat.id}
                      onClick={() => loadPassengers(boat)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition ${
                        selectedBoat?.id === boat.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <p className="font-semibold text-gray-800">{boat.name}</p>
                      <p className="text-sm text-gray-500">
                        {boat.boatType === 'escuna' ? '🚢 Escuna' : '🚤 Lancha'} • {boat.seatsTotal} lugares
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lista de Passageiros */}
          <div className="lg:col-span-2">
            {selectedBoat ? (
              <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
                {/* Header com Info do Barco */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Ship size={20} />
                        <h2 className="text-xl font-bold">{selectedBoat.name}</h2>
                      </div>
                      <p className="text-purple-200 text-sm">
                        {formatDateSafe(selectedBoat.date)} • 
                        {selectedBoat.boatType === 'escuna' ? ' Escuna' : ' Lancha'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBoat(null);
                        setPassengers([]);
                        setSelectedDate(null);
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                      <p className="text-purple-200 text-xs mb-1">Total</p>
                      <p className="text-2xl font-black">{passengers.length}</p>
                    </div>
                    <div className="bg-green-500/30 rounded-xl p-3 text-center backdrop-blur-sm">
                      <p className="text-green-200 text-xs mb-1">Embarcaram</p>
                      <p className="text-2xl font-black">{checkedInCount}</p>
                    </div>
                    <div className="bg-orange-500/30 rounded-xl p-3 text-center backdrop-blur-sm">
                      <p className="text-orange-200 text-xs mb-1">Não embarcaram</p>
                      <p className="text-2xl font-black">{notCheckedInCount}</p>
                    </div>
                  </div>
                </div>

                {/* Busca */}
                <div className="p-4 border-b border-gray-100">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Buscar por nome, telefone, email ou documento..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                </div>

                {/* Lista de Passageiros */}
                <div className="max-h-[500px] overflow-y-auto">
                  {loadingPassengers ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Carregando passageiros...</p>
                    </div>
                  ) : filteredPassengers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm 
                        ? `Nenhum passageiro encontrado para "${searchTerm}"`
                        : 'Nenhum passageiro encontrado'
                      }
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredPassengers.map((passenger) => (
                        <div
                          key={passenger.id}
                          className={`p-4 hover:bg-gray-50 transition ${
                            passenger.checkedIn ? 'bg-green-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Número do Assento */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                              passenger.checkedIn
                                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {passenger.seatNumber}
                            </div>

                            {/* Dados do Passageiro */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 truncate">
                                  {passenger.customerName}
                                </h3>
                                {passenger.checkedIn && (
                                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle size={12} />
                                    Embarcou
                                  </span>
                                )}
                              </div>

                              <div className="grid sm:grid-cols-2 gap-1 text-sm text-gray-600">
                                {passenger.phone && (
                                  <div className="flex items-center gap-1.5">
                                    <Phone size={14} className="text-gray-400" />
                                    <span>{passenger.phone}</span>
                                  </div>
                                )}
                                {passenger.email && (
                                  <div className="flex items-center gap-1.5">
                                    <Mail size={14} className="text-gray-400" />
                                    <span className="truncate">{passenger.email}</span>
                                  </div>
                                )}
                                {passenger.document && (
                                  <div className="flex items-center gap-1.5">
                                    <FileText size={14} className="text-gray-400" />
                                    <span>{passenger.document}</span>
                                  </div>
                                )}
                                {passenger.address && (
                                  <div className="flex items-center gap-1.5 sm:col-span-2">
                                    <MapPin size={14} className="text-gray-400 shrink-0" />
                                    <span className="truncate">{passenger.address}</span>
                                  </div>
                                )}
                              </div>

                              {/* Info adicional */}
                              {passenger.birthDate && (
                                <div className="mt-2 text-xs text-gray-500">
                                  Nascimento: {formatDateSafe(passenger.birthDate)}
                                </div>
                              )}
                            </div>

                            {/* WhatsApp Button */}
                            {passenger.whatsapp && (
                              <a
                                href={`https://wa.me/${passenger.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                                title="Abrir WhatsApp"
                              >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-12 text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="text-purple-500" size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  Selecione uma data no calendário
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Clique em um dia marcado em <span className="text-green-600 font-semibold">verde</span> para 
                  ver os dados dos passageiros que viajaram nesse barco.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

