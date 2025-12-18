'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Boat, Reservation, PaymentMethod } from '@/types';
import { Calendar, Users, CheckCircle, LogOut, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function VendedorDashboard() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]); // Data para filtrar barcos
  const [showDateFilter, setShowDateFilter] = useState(false);
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


  const handleSelectBoat = (boat: Boat) => {
    setSelectedBoat(boat);
    setShowReservationModal(true);
  };

  // Formatar data sem problemas de timezone
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  // Fechar filtro ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDateFilter && !target.closest('.date-filter-container')) {
        setShowDateFilter(false);
      }
    };

    if (showDateFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateFilter]);

  // Filtrar reservas pela data selecionada (por rideDate) e excluir canceladas
  const filteredReservations = myReservations.filter(r => {
    const reservationDate = new Date(r.rideDate).toISOString().split('T')[0];
    return reservationDate === filterDate && r.status !== 'cancelled';
  });

  // Filtrar barcos pela data selecionada
  const filteredBoats = boats.filter(boat => {
    const boatDate = new Date(boat.date).toISOString().split('T')[0];
    return boatDate === filterDate;
  });

  // Estatísticas da data selecionada
  const filteredApproved = filteredReservations.filter(r => r.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Responsivo */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-viva-blue-dark">Painel Vendedor</h1>
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
        {/* Stats - Grid responsivo */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Barcos</p>
                <p className="text-2xl sm:text-3xl font-black text-viva-blue">{filteredBoats.length}</p>
              </div>
              <Calendar className="text-viva-blue hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Reservas</p>
                <p className="text-2xl sm:text-3xl font-black text-orange-500">{filteredReservations.length}</p>
              </div>
              <Users className="text-orange-500 hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
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

        {/* Barcos Disponíveis */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-viva-blue-dark">Barcos Disponíveis</h2>
            <div className="relative date-filter-container">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="flex items-center gap-2 bg-white border-2 border-viva-blue text-viva-blue-dark px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-viva-blue/5 transition text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Calendar size={18} />
                {formatDate(filterDate)}
              </button>
              
              {showDateFilter && (
                <div className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10 min-w-[280px]">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Selecionar Data
                      </label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => {
                          setFilterDate(e.target.value);
                          setShowDateFilter(false);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setFilterDate(today);
                          setShowDateFilter(false);
                        }}
                        className="flex-1 px-3 py-2 bg-viva-blue/10 text-viva-blue rounded-lg text-sm font-semibold hover:bg-viva-blue/20 transition"
                      >
                        Hoje
                      </button>
                      <button
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setFilterDate(tomorrow.toISOString().split('T')[0]);
                          setShowDateFilter(false);
                        }}
                        className="flex-1 px-3 py-2 bg-viva-blue/10 text-viva-blue rounded-lg text-sm font-semibold hover:bg-viva-blue/20 transition"
                      >
                        Amanhã
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {filteredBoats.length === 0 ? (
            <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
              <Calendar className="mx-auto text-gray-400 mb-4" size={40} />
              <p className="text-gray-600 font-semibold mb-2 text-sm sm:text-base">
                Nenhum barco disponível para {formatDate(filterDate)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredBoats.map((boat) => {
              const availableSeats = boat.seatsTotal - boat.seatsTaken;
              return (
                <div key={boat.id} className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                  {/* Header do Card */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        boat.boatType === 'escuna' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {boat.boatType === 'escuna' ? '🚢' : '🚤'}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-viva-blue-dark truncate">{boat.name}</h3>
                    </div>
                  </div>
                  
                  {/* Info do Barco */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                      <Calendar size={16} className="text-viva-blue shrink-0" />
                      <span className="font-semibold text-sm">{formatDateSafe(boat.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                      <Users size={16} className="text-viva-blue shrink-0" />
                      <span className="text-sm">
                        <span className="font-bold">{boat.seatsTaken}</span> / {boat.seatsTotal} ocupados
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          availableSeats === 0 
                            ? 'bg-red-500' 
                            : availableSeats <= 5 
                              ? 'bg-orange-500' 
                              : 'bg-viva-green'
                        }`}
                        style={{ width: `${(boat.seatsTaken / boat.seatsTotal) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {availableSeats > 0 
                        ? `${availableSeats} vagas disponíveis` 
                        : '❌ Lotado'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectBoat(boat)}
                    disabled={availableSeats === 0}
                    className="w-full bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Plus size={18} />
                    {availableSeats > 0 ? 'Criar Reserva' : 'Lotado'}
                  </button>
                </div>
              );
              })}
            </div>
          )}
        </div>

        {/* Minhas Reservas */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-viva-blue-dark mb-3 sm:mb-4">
            Minhas Reservas - {formatDate(filterDate)}
          </h2>
          
          {/* Versão Mobile - Cards */}
          <div className="sm:hidden space-y-3">
            {filteredReservations.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <Users className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm">Nenhuma reserva para {formatDate(filterDate)}</p>
              </div>
            ) : (
              filteredReservations.map((reservation) => (
                <div key={reservation.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{reservation.customerName}</p>
                      <p className="text-sm text-gray-500">{reservation.phone}</p>
                    </div>
                    <span className="bg-viva-blue text-white text-sm font-bold px-2.5 py-1 rounded-lg">
                      #{reservation.seatNumber}
                    </span>
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
                    <span className="font-bold text-viva-blue-dark">
                      R$ {reservation.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assento</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma reserva para {formatDate(filterDate)}
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((reservation) => (
                      <tr key={reservation.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                            <p className="text-sm text-gray-500">{reservation.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600">
                          {formatDateSafe(reservation.rideDate)}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className="bg-viva-blue/10 text-viva-blue-dark font-bold px-2 py-1 rounded text-sm">
                            #{reservation.seatNumber}
                          </span>
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
                          R$ {reservation.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Criar Reserva */}
      {showReservationModal && selectedBoat && (
        <ReservationModal
          boat={selectedBoat}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedBoat(null);
            setSelectedSeat(null);
          }}
          vendorId={user?.uid || ''}
          key={selectedBoat.id}
        />
      )}
    </div>
  );
}

function ReservationModal({
  boat,
  onClose,
  vendorId,
}: {
  boat: Boat;
  onClose: () => void;
  vendorId: string;
}) {
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [escunaType, setEscunaType] = useState<'sem-desembarque' | 'com-desembarque'>('sem-desembarque');
  const [totalAmount, setTotalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Buscar assentos disponíveis em tempo real
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);

  useEffect(() => {
    if (!boat) {
      setAvailableSeats([]);
      return;
    }

    // Buscar reservas aprovadas para calcular assentos disponíveis
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('boatId', '==', boat.id),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservations = snapshot.docs.map(doc => doc.data()) as Reservation[];
      const takenSeats = reservations.map(r => r.seatNumber);
      
      const available: number[] = [];
      for (let i = 1; i <= boat.seatsTotal; i++) {
        if (!takenSeats.includes(i)) {
          available.push(i);
        }
      }
      setAvailableSeats(available);
    });

    return unsubscribe;
  }, [boat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatNumber) {
      setError('Selecione um assento');
      return;
    }
    if (boat.boatType === 'escuna' && !escunaType) {
      setError('Selecione o tipo de passeio');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Verificar se o assento ainda está disponível (evitar race condition)
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', boat.id),
        where('status', '==', 'approved')
      );
      const reservationsSnapshot = await getDocs(reservationsQuery);
      const approvedReservations = reservationsSnapshot.docs.map(doc => doc.data()) as Reservation[];
      const takenSeats = approvedReservations.map(r => r.seatNumber);

      if (takenSeats.includes(seatNumber)) {
        setError(`O assento ${seatNumber} já está ocupado. Por favor, selecione outro assento.`);
        setLoading(false);
        return;
      }

      const reservationData: any = {
        boatId: boat.id,
        seatNumber,
        status: 'pending',
        customerName,
        phone,
        whatsapp: whatsapp || phone,
        address,
        paymentMethod,
        totalAmount: parseFloat(totalAmount) || 0,
        amountPaid: 0,
        amountDue: parseFloat(totalAmount) || 0,
        vendorId,
        rideDate: boat.date,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Adicionar escunaType apenas se for escuna
      if (boat.boatType === 'escuna') {
        reservationData.escunaType = escunaType;
      }

      await addDoc(collection(db, 'reservations'), reservationData);

      // Limpar formulário
      setSeatNumber(null);
      setCustomerName('');
      setPhone('');
      setWhatsapp('');
      setAddress('');
      setPaymentMethod('pix');
      setEscunaType('sem-desembarque');
      setTotalAmount('');
      setError('');

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar reserva');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-black text-viva-blue-dark mb-6">Nova Reserva - {boat.name}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção de Assento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Selecione o Assento</label>
            <div className="grid grid-cols-8 gap-2">
              {availableSeats.map((seat) => (
                <button
                  key={seat}
                  type="button"
                  onClick={() => setSeatNumber(seat)}
                  className={`px-4 py-3 rounded-lg font-bold transition ${
                    seatNumber === seat
                      ? 'bg-viva-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {seat}
                </button>
              ))}
            </div>
            {seatNumber && (
              <p className="mt-2 text-sm text-viva-blue font-semibold">Assento {seatNumber} selecionado</p>
            )}
          </div>

          {/* Tipo de Passeio (apenas para Escuna) */}
          {boat.boatType === 'escuna' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Passeio *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEscunaType('sem-desembarque')}
                  className={`px-4 py-3 rounded-xl font-bold transition ${
                    escunaType === 'sem-desembarque'
                      ? 'bg-viva-green text-white shadow-lg'
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
                      ? 'bg-viva-green text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Com Desembarque
                </button>
              </div>
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Cliente *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="(48) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp (opcional)</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
              placeholder="(48) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Endereço *</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Total (R$) *</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="200.00"
              />
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
              disabled={loading || !seatNumber}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

