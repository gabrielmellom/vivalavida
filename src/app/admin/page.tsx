'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Boat, Reservation } from '@/types';
import { Plus, Calendar, Users, CheckCircle, XCircle, Clock, DollarSign, FileText, LogOut, Edit2, Power, Trash2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Formatar data sem problemas de timezone (fora do componente para ser acessível a todos)
const formatDate = (dateString: string) => {
  // Se a string estiver vazia ou inválida, retorna string vazia
  if (!dateString) return '';
  // Pega apenas a parte YYYY-MM-DD (antes do T se houver)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

export default function AdminDashboard() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [seatsTotal, setSeatsTotal] = useState(40);
  const [boatType, setBoatType] = useState<'escuna' | 'lancha'>('escuna');
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showEditBoatModal, setShowEditBoatModal] = useState(false);
  const [boatToEdit, setBoatToEdit] = useState<Boat | null>(null);
  const [showDeleteBoatModal, setShowDeleteBoatModal] = useState(false);
  const [boatToDelete, setBoatToDelete] = useState<Boat | null>(null);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]); // Data para filtrar barcos
  const [showDateFilter, setShowDateFilter] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Listener em tempo real para barcos
    const boatsQuery = query(collection(db, 'boats'));
    const unsubscribeBoats = onSnapshot(boatsQuery, (snapshot) => {
      const boatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Boat[];
      setBoats(boatsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });

    // Listener em tempo real para reservas
    const reservationsQuery = query(collection(db, 'reservations'));
    const unsubscribeReservations = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        rideDate: doc.data().rideDate,
      })) as Reservation[];
      setReservations(reservationsData);
    });

    return () => {
      unsubscribeBoats();
      unsubscribeReservations();
    };
  }, []);

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

  const handleCreateBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Gerar nome do barco baseado no tipo
      let boatName = '';
      // Formatar data sem problemas de timezone (usando a função formatDate)
      const dateFormatted = formatDate(selectedDate);
      if (boatType === 'escuna') {
        boatName = `Escuna - ${dateFormatted}`;
      } else {
        boatName = `Lancha - ${dateFormatted}`;
      }

      const boatData = {
        name: boatName,
        date: selectedDate,
        seatsTotal,
        seatsTaken: 0,
        status: 'active',
        boatType,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'boats'), boatData);
      setShowBoatModal(false);
      setSelectedDate('');
      setSeatsTotal(40);
      setBoatType('escuna');
    } catch (error) {
      console.error('Erro ao criar barco:', error);
      alert('Erro ao criar barco');
    }
  };

  const handleApproveReservation = async (reservation: Reservation, amountPaid: number) => {
    try {
      // Validar valores
      if (amountPaid < 0) {
        alert('O valor pago não pode ser negativo!');
        return;
      }
      if (amountPaid > reservation.totalAmount) {
        alert('O valor pago não pode ser maior que o valor total!');
        return;
      }

      const boatRef = doc(db, 'boats', reservation.boatId);
      const reservationRef = doc(db, 'reservations', reservation.id);

      // Buscar barco atual
      const boatDocSnap = await getDoc(boatRef);
      
      if (!boatDocSnap.exists()) {
        alert('Barco não encontrado!');
        return;
      }
      
      const boatData = boatDocSnap.data();
      const currentSeatsTaken = boatData.seatsTaken || 0;
      
      // Se a reserva já estava aprovada, não incrementar seatsTaken novamente
      const wasAlreadyApproved = reservation.status === 'approved';
      
      if (!wasAlreadyApproved && currentSeatsTaken >= boatData.seatsTotal) {
        alert('Não há mais assentos disponíveis!');
        return;
      }

      // Verificar se o assento ainda está disponível
      if (!wasAlreadyApproved) {
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('boatId', '==', reservation.boatId),
          where('status', '==', 'approved')
        );
        const reservationsSnapshot = await getDocs(reservationsQuery);
        const approvedReservations = reservationsSnapshot.docs.map(doc => doc.data()) as Reservation[];
        const takenSeats = approvedReservations.map(r => r.seatNumber);
        
        if (takenSeats.includes(reservation.seatNumber)) {
          alert(`O assento ${reservation.seatNumber} já está ocupado por outra reserva aprovada!`);
          return;
        }
      }

      await updateDoc(reservationRef, {
        status: 'approved',
        amountPaid,
        amountDue: reservation.totalAmount - amountPaid,
        updatedAt: Timestamp.now(),
      });

      // Incrementar seatsTaken apenas se não estava aprovado antes
      if (!wasAlreadyApproved) {
        await updateDoc(boatRef, {
          seatsTaken: currentSeatsTaken + 1,
          updatedAt: Timestamp.now(),
        });
      }

      setSelectedReservation(null);
    } catch (error) {
      console.error('Erro ao aprovar reserva:', error);
      alert('Erro ao aprovar reserva');
    }
  };

  const handleRejectReservation = async (reservationId: string) => {
    try {
      // Buscar a reserva para verificar se já estava aprovada
      const reservation = reservations.find(r => r.id === reservationId);
      if (!reservation) {
        alert('Reserva não encontrada!');
        return;
      }

      const reservationRef = doc(db, 'reservations', reservationId);
      
      // Se a reserva estava aprovada, decrementar seatsTaken do barco
      if (reservation.status === 'approved') {
        const boatRef = doc(db, 'boats', reservation.boatId);
        const boatDocSnap = await getDoc(boatRef);
        
        if (boatDocSnap.exists()) {
          const boatData = boatDocSnap.data();
          const currentSeatsTaken = boatData.seatsTaken || 0;
          
          // Decrementar apenas se for maior que zero
          if (currentSeatsTaken > 0) {
            await updateDoc(boatRef, {
              seatsTaken: currentSeatsTaken - 1,
              updatedAt: Timestamp.now(),
            });
          }
        }
      }

      await updateDoc(reservationRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });
      
      setSelectedReservation(null);
    } catch (error) {
      console.error('Erro ao recusar reserva:', error);
      alert('Erro ao recusar reserva');
    }
  };

  const handleCheckIn = async (reservationId: string) => {
    try {
      await updateDoc(doc(db, 'reservations', reservationId), {
        checkedIn: true,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Erro ao fazer check-in:', error);
      alert('Erro ao fazer check-in');
    }
  };

  const handleToggleBoatStatus = async (boat: Boat) => {
    try {
      const newStatus = boat.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'boats', boat.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Erro ao alterar status do barco:', error);
      alert('Erro ao alterar status do barco');
    }
  };

  const handleEditBoat = (boat: Boat) => {
    setBoatToEdit(boat);
    setShowEditBoatModal(true);
  };

  const handleUpdateBoatDate = async (newDate: string) => {
    if (!boatToEdit) return;

    try {
      const boatRef = doc(db, 'boats', boatToEdit.id);
      
      // Atualizar data do barco
      await updateDoc(boatRef, {
        date: newDate,
        updatedAt: Timestamp.now(),
      });

      // Buscar todas as reservas deste barco e atualizar a data
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', boatToEdit.id)
      );
      
      const reservationsSnapshot = await getDocs(reservationsQuery);
      const updatePromises = reservationsSnapshot.docs.map(reservationDoc =>
        updateDoc(doc(db, 'reservations', reservationDoc.id), {
          rideDate: newDate,
          updatedAt: Timestamp.now(),
        })
      );

      await Promise.all(updatePromises);
      
      setShowEditBoatModal(false);
      setBoatToEdit(null);
      alert('Data do barco e reservas atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar data do barco:', error);
      alert('Erro ao atualizar data do barco');
    }
  };

  const handleDeleteBoat = (boat: Boat) => {
    setBoatToDelete(boat);
    setShowDeleteBoatModal(true);
  };

  const confirmDeleteBoat = async () => {
    if (!boatToDelete) return;

    try {
      const boatRef = doc(db, 'boats', boatToDelete.id);
      
      // Buscar todas as reservas deste barco
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', boatToDelete.id)
      );
      
      const reservationsSnapshot = await getDocs(reservationsQuery);
      
      // Cancelar todas as reservas relacionadas
      const cancelPromises = reservationsSnapshot.docs.map(reservationDoc =>
        updateDoc(doc(db, 'reservations', reservationDoc.id), {
          status: 'cancelled',
          updatedAt: Timestamp.now(),
        })
      );

      await Promise.all(cancelPromises);
      
      // Excluir o barco
      await deleteDoc(boatRef);
      
      setShowDeleteBoatModal(false);
      setBoatToDelete(null);
      alert('Barco e reservas excluídos com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir barco:', error);
      alert('Erro ao excluir barco');
    }
  };

  // Função para sincronizar seatsTaken com reservas aprovadas (útil para corrigir inconsistências)
  const syncBoatSeats = async (boatId: string) => {
    try {
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', boatId),
        where('status', '==', 'approved')
      );
      
      const reservationsSnapshot = await getDocs(reservationsQuery);
      const approvedCount = reservationsSnapshot.docs.length;
      
      const boatRef = doc(db, 'boats', boatId);
      await updateDoc(boatRef, {
        seatsTaken: approvedCount,
        updatedAt: Timestamp.now(),
      });
      
      return approvedCount;
    } catch (error) {
      console.error('Erro ao sincronizar assentos:', error);
      throw error;
    }
  };

  // Filtrar por data do filtro selecionado
  const today = filterDate || new Date().toISOString().split('T')[0];
  const filteredBoats = boats.filter(boat => {
    const boatDate = new Date(boat.date).toISOString().split('T')[0];
    return boatDate === today;
  });
  
  const filteredReservations = reservations.filter(r => {
    const reservationDate = new Date(r.rideDate).toISOString().split('T')[0];
    return reservationDate === today;
  });

  // Reservas pendentes devem aparecer TODAS, independente da data do passeio
  const pendingReservations = reservations.filter(r => r.status === 'pending');
  const approvedReservations = filteredReservations.filter(r => r.status === 'approved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Responsivo */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-viva-blue-dark">Painel Admin</h1>
              <p className="text-gray-600 text-xs sm:text-sm">Gerenciamento de Reservas</p>
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
        {/* Stats - Grid responsivo 2x2 no mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Barcos Ativos</p>
                <p className="text-2xl sm:text-3xl font-black text-viva-blue">{filteredBoats.filter(b => b.status === 'active').length}</p>
              </div>
              <Calendar className="text-viva-blue hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Pendentes</p>
                <p className="text-2xl sm:text-3xl font-black text-orange-500">{pendingReservations.length}</p>
              </div>
              <Clock className="text-orange-500 hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Aprovadas</p>
                <p className="text-2xl sm:text-3xl font-black text-green-500">{approvedReservations.length}</p>
              </div>
              <CheckCircle className="text-green-500 hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Reservas</p>
                <p className="text-2xl sm:text-3xl font-black text-viva-blue-dark">{filteredReservations.length}</p>
              </div>
              <FileText className="text-viva-blue-dark hidden sm:block" size={32} />
            </div>
          </div>
        </div>

        {/* Actions - Grid responsivo para mobile */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-8">
          <button
            onClick={() => setShowBoatModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white px-3 sm:px-6 py-3 rounded-xl font-bold hover:shadow-lg transition text-sm sm:text-base"
          >
            <Plus size={18} />
            <span className="hidden xs:inline">Criar</span> Barco
          </button>
          <Link
            href="/admin/vendedores"
            className="flex items-center justify-center gap-2 bg-white border-2 border-viva-blue text-viva-blue-dark px-3 sm:px-6 py-3 rounded-xl font-bold hover:bg-viva-blue/5 transition text-sm sm:text-base"
          >
            <Users size={18} />
            <span className="hidden sm:inline">Gerenciar</span> Vendedores
          </Link>
          <Link
            href="/admin/checkin"
            className="flex items-center justify-center gap-2 bg-white border-2 border-viva-orange text-viva-orange px-3 sm:px-6 py-3 rounded-xl font-bold hover:bg-viva-orange/5 transition text-sm sm:text-base"
          >
            <CheckCircle size={18} />
            Check-in
          </Link>
          <Link
            href="/admin/relatorios"
            className="flex items-center justify-center gap-2 bg-white border-2 border-purple-600 text-purple-600 px-3 sm:px-6 py-3 rounded-xl font-bold hover:bg-purple-600/5 transition text-sm sm:text-base"
          >
            <BarChart3 size={18} />
            Relatórios
          </Link>
        </div>

        {/* Barcos */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-viva-blue-dark">Barcos Programados</h2>
            <div className="relative date-filter-container">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="flex items-center gap-2 bg-white border-2 border-viva-blue text-viva-blue-dark px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-viva-blue/5 transition text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Calendar size={18} />
                {filterDate ? formatDate(filterDate) : 'Ver Todos'}
              </button>
              
              {showDateFilter && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10 min-w-[280px]">
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
                    <button
                      onClick={() => {
                        setFilterDate('');
                        setShowDateFilter(false);
                      }}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                    >
                      Ver Todos
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filtrar barcos pela data selecionada */}
          {(() => {

            if (filteredBoats.length === 0) {
              return (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600 font-semibold mb-2">
                    {filterDate 
                      ? `Nenhum barco encontrado para ${formatDate(filterDate)}`
                      : 'Nenhum barco encontrado'
                    }
                  </p>
                  <p className="text-sm text-gray-500">
                    Selecione outra data ou crie um novo barco
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredBoats.filter(b => b.status === 'active').map((boat) => (
              <div key={boat.id} className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                        boat.boatType === 'escuna' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {boat.boatType === 'escuna' ? '🚢 Escuna' : '🚤 Lancha'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                        boat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {boat.status === 'active' ? '✓ Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-viva-blue-dark truncate">{boat.name}</h3>
                  </div>
                </div>

                {/* Info do Barco */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar size={16} className="text-viva-blue shrink-0" />
                      <span className="font-semibold text-sm sm:text-base">{formatDate(boat.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <Users size={16} className="text-viva-blue shrink-0" />
                    <span className="text-sm sm:text-base">
                      <span className="font-bold text-viva-blue-dark">{boat.seatsTaken}</span> / {boat.seatsTotal} ocupados
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        boat.seatsTaken >= boat.seatsTotal 
                          ? 'bg-red-500' 
                          : boat.seatsTaken >= boat.seatsTotal * 0.8 
                            ? 'bg-orange-500' 
                            : 'bg-viva-green'
                      }`}
                      style={{ width: `${Math.min((boat.seatsTaken / boat.seatsTotal) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {boat.seatsTotal - boat.seatsTaken} vagas disponíveis
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedBoat(boat);
                      setSelectedReservation(null);
                    }}
                    className="w-full bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    Ver Reservas
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditBoat(boat)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-500/10 text-orange-600 rounded-lg hover:bg-orange-500/20 transition text-sm font-medium"
                      title="Editar Barco"
                    >
                      <Edit2 size={16} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={() => handleToggleBoatStatus(boat)}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition text-sm font-medium ${
                        boat.status === 'active'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                      }`}
                      title={boat.status === 'active' ? 'Desativar' : 'Ativar'}
                    >
                      <Power size={16} />
                      <span className="hidden sm:inline">{boat.status === 'active' ? 'Desativar' : 'Ativar'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBoat(boat)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition text-sm font-medium"
                      title="Excluir Barco"
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Reservas Pendentes */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-viva-blue-dark mb-3 sm:mb-4 flex items-center gap-2">
            <Clock size={20} className="text-orange-500" />
            Reservas Pendentes
            {pendingReservations.length > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingReservations.length}
              </span>
            )}
          </h2>
          
          {/* Versão Mobile - Cards */}
          <div className="sm:hidden space-y-3">
            {pendingReservations.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <CheckCircle className="mx-auto text-green-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm">Nenhuma reserva pendente</p>
              </div>
            ) : (
              pendingReservations.map((reservation) => (
                <div key={reservation.id} className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{reservation.customerName}</p>
                      <p className="text-sm text-gray-500">{reservation.phone}</p>
                    </div>
                    <span className="bg-viva-blue text-white text-sm font-bold px-2.5 py-1 rounded-lg">
                      #{reservation.seatNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Calendar size={14} />
                      {formatDate(reservation.rideDate)}
                    </div>
                    <span className="font-bold text-viva-blue-dark">
                      R$ {reservation.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedReservation(reservation)}
                    className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600 transition"
                  >
                    Ver Detalhes
                  </button>
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
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingReservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        <CheckCircle className="mx-auto text-green-400 mb-2" size={32} />
                        Nenhuma reserva pendente
                      </td>
                    </tr>
                  ) : (
                    pendingReservations.map((reservation) => (
                      <tr key={reservation.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                            <p className="text-sm text-gray-500">{reservation.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600">
                          {formatDate(reservation.rideDate)}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className="bg-viva-blue/10 text-viva-blue-dark font-bold px-2 py-1 rounded text-sm">
                            #{reservation.seatNumber}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-900">
                          R$ {reservation.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <button
                            onClick={() => setSelectedReservation(reservation)}
                            className="bg-viva-blue text-white px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-viva-blue-dark transition"
                          >
                            Ver Detalhes
                          </button>
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

      {/* Modal Criar Barco */}
      {showBoatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-black text-viva-blue-dark mb-4 sm:mb-6">🚢 Criar Novo Barco</h2>
            <form onSubmit={handleCreateBoat} className="space-y-4">
              {/* Tipo de Embarcação */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Embarcação *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBoatType('escuna')}
                    className={`px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-bold transition flex flex-col items-center gap-1 ${
                      boatType === 'escuna'
                        ? 'bg-viva-blue text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-2xl">🚢</span>
                    <span>Escuna</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoatType('lancha')}
                    className={`px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-bold transition flex flex-col items-center gap-1 ${
                      boatType === 'lancha'
                        ? 'bg-viva-blue text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-2xl">🚤</span>
                    <span>Lancha</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data do Passeio *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Número de Vagas *</label>
                <input
                  type="number"
                  value={seatsTotal}
                  onChange={(e) => setSeatsTotal(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBoatModal(false);
                    setBoatType('escuna');
                  }}
                  className="w-full sm:flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white rounded-xl font-bold hover:shadow-lg transition order-1 sm:order-2"
                >
                  ✓ Criar Barco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Barco */}
      {showEditBoatModal && boatToEdit && (
        <EditBoatModal
          boat={boatToEdit}
          onClose={() => {
            setShowEditBoatModal(false);
            setBoatToEdit(null);
          }}
          onSave={handleUpdateBoatDate}
        />
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteBoatModal && boatToDelete && (
        <DeleteBoatModal
          boat={boatToDelete}
          reservationsCount={reservations.filter(r => r.boatId === boatToDelete.id).length}
          onClose={() => {
            setShowDeleteBoatModal(false);
            setBoatToDelete(null);
          }}
          onConfirm={confirmDeleteBoat}
        />
      )}

      {/* Modal Visualização de Assentos */}
      {selectedBoat && !selectedReservation && (
        <BoatSeatsModal
          boat={selectedBoat}
          reservations={reservations.filter(r => r.boatId === selectedBoat.id && r.status === 'approved')}
          onClose={() => setSelectedBoat(null)}
          onCancelReservation={handleRejectReservation}
        />
      )}

      {/* Modal Detalhes Reserva */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          boat={boats.find(b => b.id === selectedReservation.boatId)!}
          onClose={() => setSelectedReservation(null)}
          onApprove={handleApproveReservation}
          onReject={handleRejectReservation}
        />
      )}
    </div>
  );
}

function EditBoatModal({
  boat,
  onClose,
  onSave,
}: {
  boat: Boat;
  onClose: () => void;
  onSave: (newDate: string) => void;
}) {
  // Converter data ISO para formato YYYY-MM-DD para o input date
  const getCurrentDateString = () => {
    const date = new Date(boat.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [newDate, setNewDate] = useState(getCurrentDateString());
  const [loading, setLoading] = useState(false);
  const currentDateString = getCurrentDateString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDate === currentDateString) {
      alert('A data não foi alterada!');
      return;
    }
    
    setLoading(true);
    try {
      // Converter para formato ISO completo
      const isoDate = new Date(newDate + 'T00:00:00').toISOString();
      await onSave(isoDate);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-black text-viva-blue-dark mb-6">Editar Barco - {boat.name}</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-semibold mb-2">📌 ID do Barco:</p>
            <p className="text-xs text-blue-600 font-mono break-all">{boat.id}</p>
            <p className="text-xs text-blue-600 mt-2">
              Todas as reservas estão vinculadas a este ID e serão atualizadas automaticamente.
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>⚠️ Atenção:</strong> Ao alterar a data do barco, todas as {boat.seatsTaken} reservas aprovadas serão automaticamente realocadas para a nova data.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Data Atual do Passeio
            </label>
            <input
              type="text"
              value={formatDate(boat.date)}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nova Data do Passeio *
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || newDate === currentDateString}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Realocar Barco'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BoatSeatsModal({
  boat,
  reservations,
  onClose,
  onCancelReservation,
}: {
  boat: Boat;
  reservations: Reservation[];
  onClose: () => void;
  onCancelReservation: (reservationId: string) => void;
}) {
  const takenSeats = reservations.map(r => r.seatNumber);
  const availableSeats = boat.seatsTotal - boat.seatsTaken;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-viva-blue-dark truncate">{boat.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                📅 {formatDate(boat.date)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-viva-blue-dark">
                👥 {boat.seatsTaken}/{boat.seatsTotal}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition shrink-0"
          >
            <XCircle size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl sm:text-3xl font-black text-red-600">{boat.seatsTaken}</p>
            <p className="text-xs text-red-600">Ocupados</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl sm:text-3xl font-black text-green-600">{availableSeats}</p>
            <p className="text-xs text-green-600">Disponíveis</p>
          </div>
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Legenda */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm bg-gray-50 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded"></div>
              <span className="text-gray-700">Ocupado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gray-300 rounded"></div>
              <span className="text-gray-700">Livre</span>
            </div>
          </div>

          {/* Grade de Assentos - Responsivo */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2">
            {Array.from({ length: boat.seatsTotal }, (_, i) => {
              const seatNumber = i + 1;
              const isTaken = takenSeats.includes(seatNumber);
              const reservation = reservations.find(r => r.seatNumber === seatNumber);
              
              return (
                <div
                  key={seatNumber}
                  className={`relative p-2 sm:p-3 rounded-lg text-center font-bold transition ${
                    isTaken
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                  title={reservation ? `${reservation.customerName} - ${reservation.phone}` : 'Disponível'}
                >
                  <div className="text-sm sm:text-base">{seatNumber}</div>
                  {reservation && (
                    <div className="text-[10px] sm:text-xs mt-0.5 opacity-90 truncate hidden sm:block">
                      {reservation.customerName.split(' ')[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lista de Reservas */}
          {reservations.length > 0 && (
            <div className="border-t pt-4 sm:pt-6">
              <h3 className="text-base sm:text-lg font-bold text-viva-blue-dark mb-3 sm:mb-4 flex items-center gap-2">
                ✅ Reservas Aprovadas
                <span className="bg-viva-blue text-white text-xs px-2 py-0.5 rounded-full">
                  {reservations.length}
                </span>
              </h3>
              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-gray-50 rounded-xl p-3 sm:p-4"
                  >
                    {/* Mobile Layout */}
                    <div className="flex items-start gap-3">
                      <div className="bg-red-500 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                        #{reservation.seatNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm sm:text-base truncate">{reservation.customerName}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{reservation.phone}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs font-semibold text-gray-700">
                            R$ {reservation.totalAmount.toFixed(2)}
                          </span>
                          {reservation.amountPaid > 0 && (
                            <span className="text-xs text-green-600">
                              ✓ Pago: R$ {reservation.amountPaid.toFixed(2)}
                            </span>
                          )}
                          {reservation.amountDue > 0 && (
                            <span className="text-xs text-orange-600 font-bold">
                              ⚠ Falta: R$ {reservation.amountDue.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Cancelar reserva de ${reservation.customerName}?\nO assento #${reservation.seatNumber} ficará disponível.`)) {
                            onCancelReservation(reservation.id);
                          }
                        }}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition shrink-0"
                        title="Cancelar Reserva"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-viva-blue text-white rounded-xl font-bold hover:bg-viva-blue-dark transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationDetailModal({
  reservation,
  boat,
  onClose,
  onApprove,
  onReject,
}: {
  reservation: Reservation;
  boat: Boat;
  onClose: () => void;
  onApprove: (reservation: Reservation, amountPaid: number) => void;
  onReject: (reservationId: string) => void;
}) {
  const [amountPaid, setAmountPaid] = useState(reservation.amountPaid.toString());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-viva-blue-dark">Detalhes da Reserva</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <XCircle size={24} className="text-gray-400" />
          </button>
        </div>
        
        {/* Card do Cliente */}
        <div className="bg-gradient-to-r from-viva-blue to-viva-blue-dark rounded-xl p-4 mb-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs mb-1">Cliente</p>
              <p className="font-bold text-lg sm:text-xl truncate">{reservation.customerName}</p>
            </div>
            <div className="bg-white text-viva-blue-dark font-black text-xl sm:text-2xl px-3 sm:px-4 py-2 rounded-xl ml-3">
              #{reservation.seatNumber}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
            <span className="flex items-center gap-1">
              📞 {reservation.phone}
            </span>
            {reservation.whatsapp && reservation.whatsapp !== reservation.phone && (
              <a 
                href={`https://wa.me/${reservation.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-300 hover:text-green-200"
              >
                💬 WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Informações em Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
            <p className="text-xs text-gray-500 mb-1">📅 Data do Passeio</p>
            <p className="font-bold text-sm sm:text-base text-gray-800">{formatDate(reservation.rideDate)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
            <p className="text-xs text-gray-500 mb-1">💳 Pagamento</p>
            <p className="font-bold text-sm sm:text-base text-gray-800 capitalize">{reservation.paymentMethod}</p>
          </div>
          {reservation.escunaType && (
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 col-span-2">
              <p className="text-xs text-gray-500 mb-1">🚢 Tipo de Passeio</p>
              <p className="font-bold text-sm sm:text-base text-gray-800">
                {reservation.escunaType === 'com-desembarque' ? '🏝️ Com Desembarque na Ilha' : '🌊 Sem Desembarque (Panorâmico)'}
              </p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 col-span-2">
            <p className="text-xs text-gray-500 mb-1">📍 Endereço</p>
            <p className="font-bold text-sm sm:text-base text-gray-800">{reservation.address}</p>
          </div>
        </div>

        {/* Valores - Responsivo */}
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4">
          <p className="text-xs text-gray-500 mb-3 font-semibold">💰 Valores</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="font-black text-base sm:text-xl text-viva-blue-dark">
                R$ {reservation.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Pago</p>
              <p className="font-black text-base sm:text-xl text-green-600">
                R$ {reservation.amountPaid.toFixed(2)}
              </p>
            </div>
            <div className={`text-center p-2 sm:p-3 rounded-lg ${reservation.amountDue > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
              <p className="text-xs text-gray-500 mb-1">Falta</p>
              <p className={`font-black text-base sm:text-xl ${reservation.amountDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                R$ {reservation.amountDue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Input de valor pago (se pendente) */}
        {reservation.status === 'pending' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              💵 Valor Pago (R$)
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => {
                const value = e.target.value;
                const numValue = parseFloat(value);
                if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= reservation.totalAmount)) {
                  setAmountPaid(value);
                }
              }}
              step="0.01"
              min="0"
              max={reservation.totalAmount}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-lg font-bold"
              placeholder="0.00"
            />
            {parseFloat(amountPaid) > reservation.totalAmount && (
              <p className="mt-1 text-sm text-red-600">⚠️ O valor pago não pode ser maior que o total!</p>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-3 pt-2">
          {reservation.status === 'pending' ? (
            <>
              {/* Botões em coluna no mobile, linha no desktop */}
              <button
                onClick={() => {
                  const paid = parseFloat(amountPaid) || 0;
                  if (paid < 0) {
                    alert('O valor pago não pode ser negativo!');
                    return;
                  }
                  if (paid > reservation.totalAmount) {
                    alert('O valor pago não pode ser maior que o valor total!');
                    return;
                  }
                  onApprove(reservation, paid);
                }}
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 text-base sm:text-lg"
              >
                <CheckCircle size={20} />
                Aprovar Reserva
              </button>
              <button
                onClick={() => onReject(reservation.id)}
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
              >
                <XCircle size={18} />
                Recusar
              </button>
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                Fechar
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-viva-blue text-white rounded-xl font-bold hover:bg-viva-blue-dark transition"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteBoatModal({
  boat,
  reservationsCount,
  onClose,
  onConfirm,
}: {
  boat: Boat;
  reservationsCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="text-red-600" size={40} />
          </div>
          <h2 className="text-3xl font-black text-red-600 mb-4">
            ATENÇÃO!
          </h2>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
            <p className="text-2xl font-bold text-red-700 mb-2">
              Você está excluindo o barco
            </p>
            <p className="text-xl font-bold text-red-600 mb-4">
              VAI PERDER TUDO
            </p>
            <p className="text-lg font-semibold text-red-700">
              TEM CERTEZA DISSO?
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
          <div>
            <p className="text-sm text-gray-600 mb-1">Barco:</p>
            <p className="font-bold text-lg text-gray-900">{boat.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Data:</p>
            <p className="font-bold text-gray-900">
              {formatDate(boat.date)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Reservas relacionadas:</p>
            <p className="font-bold text-red-600 text-xl">
              {reservationsCount} reserva{reservationsCount !== 1 ? 's' : ''} serão canceladas
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">ID do Barco:</p>
            <p className="font-mono text-xs text-gray-600 break-all">{boat.id}</p>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
          <p className="text-sm font-bold text-yellow-800 text-center">
            ⚠️ Esta ação NÃO pode ser desfeita! O barco e todas as reservas serão permanentemente removidos.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition"
          >
            SIM, EXCLUIR TUDO
          </button>
        </div>
      </div>
    </div>
  );
}

