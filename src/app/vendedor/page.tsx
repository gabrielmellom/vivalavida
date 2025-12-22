'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, onSnapshot, Timestamp, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Boat, Reservation, PaymentMethod, Payment } from '@/types';
import { DollarSign } from 'lucide-react';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reservationForPayment, setReservationForPayment] = useState<Reservation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
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
                                setPaymentAmount('');
                                setPaymentMethod('pix');
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
      
      {/* Modal Registrar Pagamento */}
      {showPaymentModal && reservationForPayment && user && (
        <PaymentModal
          reservation={reservationForPayment}
          onClose={() => {
            setShowPaymentModal(false);
            setReservationForPayment(null);
            setPaymentAmount('');
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
              setPaymentAmount('');
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-black text-viva-blue-dark mb-4">Registrar Pagamento</h3>
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-lg font-bold"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none"
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

interface SeatData {
  name: string;
  isChild: boolean; // menor de 7 anos paga meia
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
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seatData, setSeatData] = useState<Record<number, SeatData>>({});
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [document, setDocument] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [escunaType, setEscunaType] = useState<'sem-desembarque' | 'com-desembarque'>('sem-desembarque');
  const [basePrice, setBasePrice] = useState('200'); // Preço base por pessoa
  const [amountPaid, setAmountPaid] = useState('0'); // Valor pago na hora
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

  // Calcular valores totais
  const calculateTotals = () => {
    const base = parseFloat(basePrice) || 0;
    let totalAmount = 0;
    
    selectedSeats.forEach(seat => {
      const data = seatData[seat];
      if (data?.isChild) {
        totalAmount += base / 2; // Meia entrada para crianças
      } else {
        totalAmount += base;
      }
    });
    
    const paid = parseFloat(amountPaid) || 0;
    const remaining = Math.max(0, totalAmount - paid);
    
    return { totalAmount, paid, remaining };
  };

  const { totalAmount, paid, remaining } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0) {
      setError('Selecione pelo menos um assento');
      return;
    }
    if (boat.boatType === 'escuna' && !escunaType) {
      setError('Selecione o tipo de passeio');
      return;
    }

    // Validar que todos os assentos têm nome
    const missingNames = selectedSeats.filter(seat => !seatData[seat]?.name?.trim());
    if (missingNames.length > 0) {
      setError(`Por favor, preencha o nome para todos os assentos selecionados (assentos: ${missingNames.join(', ')})`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Verificar se os assentos ainda estão disponíveis (evitar race condition)
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', boat.id),
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

      // Gerar groupId para reservas em grupo
      const groupId = selectedSeats.length > 1 ? `group_${Date.now()}` : undefined;
      const base = parseFloat(basePrice) || 0;
      const totalPaid = parseFloat(amountPaid) || 0;
      
      // Calcular valores por assento e distribuir o pagamento proporcionalmente
      const seatValues = selectedSeats.map(seat => {
        const data = seatData[seat] || { name: '', isChild: false };
        return data.isChild ? base / 2 : base;
      });
      const totalValue = seatValues.reduce((sum, val) => sum + val, 0);
      
      // Distribuir o pagamento proporcionalmente entre as reservas
      let remainingPaid = totalPaid;
      const reservations = selectedSeats.map((seatNumber, index) => {
        const data = seatData[seatNumber] || { name: '', isChild: false };
        const seatTotal = seatValues[index];
        const proportionalPaid = index === selectedSeats.length - 1 
          ? remainingPaid // Última reserva recebe o restante para evitar erros de arredondamento
          : Math.round((seatTotal / totalValue) * totalPaid * 100) / 100;
        remainingPaid -= proportionalPaid;
        
        const reservationData: Record<string, unknown> = {
          boatId: boat.id,
          seatNumber,
          status: 'pending',
          customerName: data.name,
          phone,
          whatsapp: whatsapp || phone,
          address,
          paymentMethod,
          totalAmount: seatTotal,
          amountPaid: proportionalPaid,
          amountDue: seatTotal - proportionalPaid,
          vendorId,
          rideDate: boat.date,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Adicionar campos opcionais apenas se tiverem valor
        if (document) reservationData.document = document;
        if (birthDate) reservationData.birthDate = birthDate;
        if (email) reservationData.email = email;
        if (groupId) reservationData.groupId = groupId;

        // Adicionar escunaType apenas se for escuna
        if (boat.boatType === 'escuna') {
          reservationData.escunaType = escunaType;
        }

        return reservationData;
      });

      // Criar uma reserva para cada assento selecionado
      const reservationPromises = reservations.map(async (reservationData) => {
        return addDoc(collection(db, 'reservations'), reservationData);
      });

      await Promise.all(reservationPromises);

      // Limpar formulário
      setSelectedSeats([]);
      setSeatData({});
      setPhone('');
      setWhatsapp('');
      setAddress('');
      setDocument('');
      setBirthDate('');
      setEmail('');
      setPaymentMethod('pix');
      setEscunaType('sem-desembarque');
      setBasePrice('200');
      setAmountPaid('0');
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
          {/* Seleção de Assentos (Múltiplos para grupo) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Selecione os Assentos {selectedSeats.length > 0 && `(${selectedSeats.length} selecionado${selectedSeats.length > 1 ? 's' : ''})`}
            </label>
            <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-xl">
              {Array.from({ length: boat.seatsTotal }, (_, i) => {
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
                        } else {
                          setSelectedSeats([...selectedSeats, seatNum]);
                          // Inicializar dados do assento
                          setSeatData({
                            ...seatData,
                            [seatNum]: { name: '', isChild: false }
                          });
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

          {/* Dados por Assento */}
          {selectedSeats.length > 0 && (
            <div className="border-2 border-viva-blue/20 rounded-xl p-4 bg-viva-blue/5">
              <h3 className="text-lg font-bold text-viva-blue-dark mb-4">
                Dados dos Passageiros ({selectedSeats.length} {selectedSeats.length === 1 ? 'passageiro' : 'passageiros'})
              </h3>
              <div className="space-y-4">
                {selectedSeats.sort((a, b) => a - b).map((seatNum) => {
                  const data = seatData[seatNum] || { name: '', isChild: false };
                  return (
                    <div key={seatNum} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-viva-blue-dark">Assento #{seatNum}</h4>
                        <div className="flex items-center gap-2">
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
                            className="w-4 h-4 text-viva-blue border-gray-300 rounded focus:ring-viva-blue"
                          />
                          <label htmlFor={`child-${seatNum}`} className="text-sm font-semibold text-viva-orange cursor-pointer">
                            👶 Menor de 7 anos (meia entrada)
                          </label>
                        </div>
                      </div>
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
                      {data.isChild && (
                        <p className="mt-2 text-xs text-viva-orange font-semibold">
                          💰 Valor: R$ {(parseFloat(basePrice) / 2).toFixed(2)} (meia entrada)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dados de Contato (compartilhados) */}
          <div className="border-t-2 border-gray-200 pt-4">
            <h3 className="text-lg font-bold text-viva-blue-dark mb-4">Dados de Contato</h3>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Documento (CPF/RG)</label>
              <input
                type="text"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Data de Nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                placeholder="cliente@email.com"
              />
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

          {/* Informações de Pagamento */}
          <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
            <h3 className="text-lg font-bold text-green-800 mb-4">💰 Informações de Pagamento</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preço Base por Pessoa (R$) *</label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                  placeholder="200.00"
                />
                <p className="text-xs text-gray-500 mt-1">Crianças menores de 7 anos pagam metade</p>
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
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Valor Recebido na Hora:</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value) || 0;
                      if (numValue >= 0 && numValue <= totalAmount) {
                        setAmountPaid(value);
                      }
                    }}
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-right font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-800">Valor Restante:</span>
                  <span className={`text-xl font-black ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    R$ {remaining.toFixed(2)}
                  </span>
                </div>
                {selectedSeats.length > 0 && (
                  <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                    <p>Detalhamento:</p>
                    <ul className="list-disc list-inside mt-1">
                      {selectedSeats.sort((a, b) => a - b).map(seat => {
                        const data = seatData[seat] || { name: '', isChild: false };
                        const seatPrice = data.isChild ? parseFloat(basePrice) / 2 : parseFloat(basePrice);
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Criando...' : selectedSeats.length > 1 ? `Criar ${selectedSeats.length} Reservas` : 'Criar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

