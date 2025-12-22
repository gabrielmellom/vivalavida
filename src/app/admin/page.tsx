'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Boat, Reservation, PaymentMethod, UserRole } from '@/types';
import { Plus, Calendar, Users, CheckCircle, XCircle, Clock, DollarSign, FileText, LogOut, Edit2, Power, Trash2, BarChart3, Settings, Bell, Volume2, ChevronLeft, ChevronRight, User, Phone, Mail, MapPin, CreditCard, Sparkles, QrCode } from 'lucide-react';
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

// Cores para identificar grupos (paleta profissional) - GLOBAL
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

export default function AdminDashboard() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [seatsTotal, setSeatsTotal] = useState(40);
  const [ticketPrice, setTicketPrice] = useState('200');
  const [boatType, setBoatType] = useState<'escuna' | 'lancha'>('escuna');
  const [createBulk, setCreateBulk] = useState(false);
  const [bulkMonth, setBulkMonth] = useState('');
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showEditBoatModal, setShowEditBoatModal] = useState(false);
  const [boatToEdit, setBoatToEdit] = useState<Boat | null>(null);
  const [showDeleteBoatModal, setShowDeleteBoatModal] = useState(false);
  const [boatToDelete, setBoatToDelete] = useState<Boat | null>(null);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]); // Data para filtrar barcos
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showReservationWizard, setShowReservationWizard] = useState(false);
  const previousPendingCountRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Inicializar contexto de áudio (precisa de interação do usuário)
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Tocar um som silencioso para desbloquear
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 0.001; // Praticamente silencioso
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.1);
      
      setAudioUnlocked(true);
      console.log('🔊 Áudio desbloqueado!');
    } catch (error) {
      console.log('Erro ao inicializar áudio:', error);
    }
  }, []);

  // Função para tocar som de notificação
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !audioContextRef.current) {
      console.log('Som desabilitado ou não inicializado');
      return;
    }
    
    try {
      const ctx = audioContextRef.current;
      
      // Resumir contexto se estiver suspenso
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Criar uma sequência de beeps
      const playBeep = (startTime: number, frequency: number, duration: number = 0.2) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Volume mais alto
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Tocar sequência de beeps (plim plim plim)
      const now = ctx.currentTime;
      playBeep(now, 880, 0.15);         // Nota A5
      playBeep(now + 0.2, 1047, 0.15);  // Nota C6
      playBeep(now + 0.4, 1319, 0.15);  // Nota E6
      playBeep(now + 0.6, 1568, 0.3);   // Nota G6 (mais longo)
      
      console.log('🔔 Som tocado!');
    } catch (error) {
      console.log('Erro ao tocar som:', error);
    }
  }, [soundEnabled]);

  // Toggle do som (também inicializa o áudio)
  const toggleSound = useCallback(() => {
    if (!audioUnlocked) {
      initAudio();
    }
    setSoundEnabled(prev => !prev);
  }, [audioUnlocked, initAudio]);

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
      
      // Contar reservas pendentes
      const pendingCount = reservationsData.filter(r => r.status === 'pending').length;
      
      // Verificar se há novas reservas pendentes
      if (previousPendingCountRef.current !== null && pendingCount > previousPendingCountRef.current) {
        const newCount = pendingCount - previousPendingCountRef.current;
        setNewOrderCount(newCount);
        setNewOrderAlert(true);
        playNotificationSound();
        
        // Manter o alerta por 10 segundos
        setTimeout(() => {
          setNewOrderAlert(false);
          setNewOrderCount(0);
        }, 10000);
      }
      
      previousPendingCountRef.current = pendingCount;
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
      if (createBulk && bulkMonth) {
        // Criar barcos para todos os dias do mês
        const [year, month] = bulkMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const boatPromises = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const dateString = date.toISOString().split('T')[0];
          const dateFormatted = formatDate(dateString);
          
          let boatName = '';
          if (boatType === 'escuna') {
            boatName = `Escuna - ${dateFormatted}`;
          } else {
            boatName = `Lancha - ${dateFormatted}`;
          }

          const boatData = {
            name: boatName,
            date: dateString,
            seatsTotal,
            seatsTaken: 0,
            status: 'active',
            boatType,
            ticketPrice: parseFloat(ticketPrice) || 200,
            createdBy: user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          boatPromises.push(addDoc(collection(db, 'boats'), boatData));
        }

        await Promise.all(boatPromises);
        alert(`${daysInMonth} barcos criados com sucesso!`);
      } else {
        // Criar um único barco
        const dateFormatted = formatDate(selectedDate);
        let boatName = '';
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
          ticketPrice: parseFloat(ticketPrice) || 200,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, 'boats'), boatData);
      }

      setShowBoatModal(false);
      setSelectedDate('');
      setSeatsTotal(40);
      setTicketPrice('200');
      setBoatType('escuna');
      setCreateBulk(false);
      setBulkMonth('');
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
      
      // Verificar se ainda há vagas disponíveis
      if (!wasAlreadyApproved && currentSeatsTaken >= boatData.seatsTotal) {
        alert('Não há mais vagas disponíveis neste barco!');
        return;
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

  // Reservas pendentes e pré-reservas devem aparecer TODAS, independente da data do passeio
  // Ordenar para manter grupos juntos
  const pendingReservations = reservations
    .filter(r => r.status === 'pending' || r.status === 'pre_reserved')
    .sort((a, b) => {
      // Primeiro, ordenar por groupId para manter grupos juntos
      if (a.groupId && b.groupId) {
        if (a.groupId !== b.groupId) {
          return a.groupId.localeCompare(b.groupId);
        }
      }
      if (a.groupId && !b.groupId) return -1;
      if (!a.groupId && b.groupId) return 1;
      // Depois por data do passeio
      return new Date(a.rideDate).getTime() - new Date(b.rideDate).getTime();
    });
  const approvedReservations = filteredReservations.filter(r => r.status === 'approved');

  // Criar mapa de cores para grupos das reservas pendentes
  const pendingGroupColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let colorIndex = 0;
    
    pendingReservations.forEach(r => {
      if (r.groupId && !map.has(r.groupId)) {
        map.set(r.groupId, colorIndex);
        colorIndex++;
      }
    });
    
    return map;
  }, [pendingReservations]);

  // Contar membros de cada grupo das reservas pendentes
  const pendingGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    pendingReservations.forEach(r => {
      if (r.groupId) {
        counts.set(r.groupId, (counts.get(r.groupId) || 0) + 1);
      }
    });
    return counts;
  }, [pendingReservations]);

  // Função auxiliar para obter cor de grupo
  const getPendingGroupColor = (groupId: string | undefined) => {
    if (!groupId) return null;
    const colorIndex = pendingGroupColorMap.get(groupId);
    if (colorIndex === undefined) return null;
    return GROUP_COLORS[colorIndex % GROUP_COLORS.length];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Alerta de Novo Pedido */}
      {newOrderAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-pulse">
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 text-white py-4 px-4 shadow-lg">
            <div className="container mx-auto flex items-center justify-center gap-4">
              <Bell className="animate-bounce" size={28} />
              <div className="text-center">
                <p className="font-black text-xl">🎉 NOVO PEDIDO!</p>
                <p className="text-sm opacity-90">
                  {newOrderCount === 1 
                    ? 'Chegou 1 nova reserva!' 
                    : `Chegaram ${newOrderCount} novas reservas!`}
                </p>
              </div>
              <Bell className="animate-bounce" size={28} />
            </div>
          </div>
        </div>
      )}

      {/* Header - Responsivo */}
      <header className={`bg-white shadow-sm border-b ${newOrderAlert ? 'mt-20' : ''} transition-all duration-300`}>
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-viva-blue-dark">Painel Admin</h1>
              <p className="text-gray-600 text-xs sm:text-sm">Gerenciamento de Reservas</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Botão de Som */}
              <button
                onClick={() => {
                  toggleSound();
                  // Tocar som de teste quando ativar
                  if (!soundEnabled) {
                    setTimeout(() => {
                      playNotificationSound();
                    }, 100);
                  }
                }}
                className={`p-2 rounded-lg transition relative ${
                  soundEnabled && audioUnlocked
                    ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                    : soundEnabled && !audioUnlocked
                    ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                }`}
                title={
                  !audioUnlocked 
                    ? 'Clique para ativar o som' 
                    : soundEnabled 
                    ? 'Som ativado (clique para desativar)' 
                    : 'Som desativado (clique para ativar)'
                }
              >
                <Volume2 size={20} />
                {!audioUnlocked && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                )}
              </button>
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
          <div className="bg-white rounded-lg p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Barcos Ativos</p>
                <p className="text-2xl sm:text-3xl font-black text-viva-blue">{filteredBoats.filter(b => b.status === 'active').length}</p>
              </div>
              <Calendar className="text-viva-blue hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Pendentes</p>
                <p className="text-2xl sm:text-3xl font-black text-orange-500">{pendingReservations.length}</p>
              </div>
              <Clock className="text-orange-500 hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Aprovadas</p>
                <p className="text-2xl sm:text-3xl font-black text-green-500">{approvedReservations.length}</p>
              </div>
              <CheckCircle className="text-green-500 hidden sm:block" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-6 shadow-sm">
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
            onClick={() => setShowReservationWizard(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white px-3 sm:px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition text-sm sm:text-base col-span-2 sm:col-span-1 hover:from-green-700 hover:to-emerald-800"
          >
            <Sparkles size={18} />
            Criar Reserva
          </button>
          <button
            onClick={() => setShowBoatModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white px-3 sm:px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition text-sm sm:text-base"
          >
            <Plus size={18} />
            <span className="hidden xs:inline">Criar</span> Barco
          </button>
          <Link
            href="/admin/vendedores"
            className="flex items-center justify-center gap-2 bg-white border border-viva-blue text-viva-blue-dark px-3 sm:px-6 py-3 rounded-lg font-semibold hover:bg-viva-blue/5 transition text-sm sm:text-base"
          >
            <Users size={18} />
            <span className="hidden sm:inline">Gerenciar</span> Vendedores
          </Link>
          <Link
            href="/admin/checkin"
            className="flex items-center justify-center gap-2 bg-white border border-viva-orange text-viva-orange px-3 sm:px-6 py-3 rounded-lg font-semibold hover:bg-viva-orange/5 transition text-sm sm:text-base"
          >
            <CheckCircle size={18} />
            Check-in
          </Link>
          <Link
            href="/admin/vouchers"
            className="flex items-center justify-center gap-2 bg-white border border-indigo-600 text-indigo-600 px-3 sm:px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition text-sm sm:text-base"
          >
            <QrCode size={18} />
            <span className="hidden xs:inline">Gerar</span> Vouchers
          </Link>
          <Link
            href="/admin/relatorios"
            className="flex items-center justify-center gap-2 bg-white border border-slate-600 text-slate-700 px-3 sm:px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition text-sm sm:text-base"
          >
            <BarChart3 size={18} />
            Relatórios
          </Link>
          <Link
            href="/admin/financeiro"
            className="flex items-center justify-center gap-2 bg-white border border-red-600 text-red-600 px-3 sm:px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition text-sm sm:text-base"
          >
            <DollarSign size={18} />
            Financeiro
          </Link>
          <Link
            href="/admin/config-site"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-3 sm:px-6 py-3 rounded-lg font-bold hover:shadow-lg transition text-sm sm:text-base"
          >
            <Settings size={18} />
            Config Site
          </Link>
        </div>

        {/* Barcos */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-viva-blue-dark">Barcos Programados</h2>
            <div className="relative date-filter-container">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="flex items-center gap-2 bg-white border border-viva-blue text-viva-blue-dark px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-viva-blue/5 transition text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Calendar size={18} />
                {filterDate ? formatDate(filterDate) : 'Ver Todos'}
              </button>
              
              {showDateFilter && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-10 min-w-[280px]">
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
                <div className="bg-white rounded-lg p-12 text-center">
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
              <div key={boat.id} className="bg-white rounded-lg p-4 sm:p-5 shadow-sm border border-gray-100">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                        boat.boatType === 'escuna' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {boat.boatType === 'escuna' ? 'Escuna' : 'Lancha'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                        boat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {boat.status === 'active' ? (
                          <>
                            <CheckCircle size={12} className="inline mr-1" />
                            Ativo
                          </>
                        ) : 'Inativo'}
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
              <div className="bg-white rounded-lg p-6 text-center">
                <CheckCircle className="mx-auto text-green-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm">Nenhuma reserva pendente</p>
              </div>
            ) : (
              pendingReservations.map((reservation) => {
                const groupColor = getPendingGroupColor(reservation.groupId);
                const groupSize = reservation.groupId ? pendingGroupCounts.get(reservation.groupId) || 0 : 0;
                
                return (
                <div key={reservation.id} className={`rounded-lg p-4 shadow-sm border-2 ${
                  groupColor
                    ? `${groupColor.bg} ${groupColor.border}`
                    : reservation.status === 'pre_reserved' 
                      ? 'bg-orange-50 border-orange-300' 
                      : 'bg-white border-orange-100'
                }`}>
                  {/* Badge de Grupo */}
                  {groupColor && groupSize > 1 && (
                    <div className={`${groupColor.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-2`}>
                      <Users size={12} />
                      Grupo de {groupSize}
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {reservation.status === 'pre_reserved' && (
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block">
                          ⏳ PRÉ-RESERVA
                        </span>
                      )}
                      <p className="font-bold text-gray-900">{reservation.customerName}</p>
                      <p className="text-sm text-gray-500">{reservation.phone || 'Sem telefone'}</p>
                    </div>
                    {groupColor && (
                      <span className={`${groupColor.badge} text-white text-sm font-bold px-2.5 py-1 rounded-lg`}>
                        <Users size={14} />
                      </span>
                    )}
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
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${
                      groupColor 
                        ? `${groupColor.badge} text-white hover:opacity-90`
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    Ver Detalhes
                  </button>
                </div>
              );
              })
            )}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
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
                    pendingReservations.map((reservation) => {
                      const groupColor = getPendingGroupColor(reservation.groupId);
                      const groupSize = reservation.groupId ? pendingGroupCounts.get(reservation.groupId) || 0 : 0;
                      
                      return (
                      <tr key={reservation.id} className={`hover:bg-gray-50 ${
                        groupColor 
                          ? groupColor.bg 
                          : reservation.status === 'pre_reserved' 
                            ? 'bg-orange-50' 
                            : ''
                      }`}>
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            {/* Badge de grupo */}
                            {groupColor && groupSize > 1 && (
                              <span className={`${groupColor.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-flex items-center gap-1`}>
                                <Users size={10} />
                                Grupo de {groupSize}
                              </span>
                            )}
                            {reservation.status === 'pre_reserved' && (
                              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block ml-1">
                                ⏳ PRÉ-RESERVA
                              </span>
                            )}
                            <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                            <p className="text-sm text-gray-500">{reservation.phone || 'Sem telefone'}</p>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600">
                          {formatDate(reservation.rideDate)}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          {groupColor ? (
                            <span className={`${groupColor.badge} text-white font-bold px-2 py-1 rounded text-sm inline-flex items-center gap-1`}>
                              <Users size={12} />
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded text-sm">
                              Individual
                            </span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-900">
                          R$ {reservation.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <button
                            onClick={() => setSelectedReservation(reservation)}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition ${
                              groupColor 
                                ? `${groupColor.badge} text-white hover:opacity-90`
                                : 'bg-viva-blue text-white hover:bg-viva-blue-dark'
                            }`}
                          >
                            Ver Detalhes
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
        </div>
      </div>

      {/* Modal Criar Barco */}
      {showBoatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-md w-full max-h-[95vh] overflow-y-auto">
            <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-viva-blue-dark mb-4 sm:mb-6">
              <Users size={24} className="text-viva-blue" />
              Criar Novo Barco
            </h2>
            <form onSubmit={handleCreateBoat} className="space-y-4">
              {/* Tipo de Embarcação */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Embarcação *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBoatType('escuna')}
                    className={`px-3 sm:px-4 py-3 sm:py-4 rounded-lg font-bold transition flex flex-col items-center gap-1 ${
                      boatType === 'escuna'
                        ? 'bg-viva-blue text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Users size={24} />
                    <span>Escuna</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoatType('lancha')}
                    className={`px-3 sm:px-4 py-3 sm:py-4 rounded-lg font-bold transition flex flex-col items-center gap-1 ${
                      boatType === 'lancha'
                        ? 'bg-viva-blue text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Users size={24} />
                    <span>Lancha</span>
                  </button>
                </div>
              </div>

              {/* Opção de criar em lote */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createBulk}
                    onChange={(e) => {
                      setCreateBulk(e.target.checked);
                      if (!e.target.checked) {
                        setBulkMonth('');
                        setSelectedDate('');
                      }
                    }}
                    className="w-5 h-5"
                  />
                  <span className="font-semibold text-gray-700">Criar barcos para todo o mês (30 dias)</span>
                </label>
              </div>

              {createBulk ? (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar size={16} className="text-gray-500" />
                    Mês/Ano *
                  </label>
                  <input
                    type="month"
                    value={bulkMonth}
                    onChange={(e) => setBulkMonth(e.target.value)}
                    required
                    min={new Date().toISOString().slice(0, 7)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Serão criados barcos para todos os dias do mês selecionado</p>
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar size={16} className="text-gray-500" />
                    Data do Passeio *
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base bg-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Número de Vagas *</label>
                <input
                  type="number"
                  value={seatsTotal}
                  onChange={(e) => setSeatsTotal(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <DollarSign size={16} className="text-gray-500" />
                  Preço do Ingresso por Pessoa (R$) *
                </label>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base"
                  placeholder="200.00"
                />
                <p className="text-xs text-gray-500 mt-1">Crianças menores de 7 anos pagam metade deste valor</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBoatModal(false);
                    setBoatType('escuna');
                  }}
                  className="w-full sm:flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white rounded-lg font-bold hover:shadow-lg transition order-1 sm:order-2"
                >
                  {createBulk ? (
                    <>
                      <CheckCircle size={18} className="inline mr-1" />
                      Criar Barcos do Mês
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="inline mr-1" />
                      Criar Barco
                    </>
                  )}
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
          boats={boats}
          onClose={() => setSelectedReservation(null)}
          onApprove={handleApproveReservation}
          onReject={handleRejectReservation}
        />
      )}

      {/* Wizard de Reserva para Admin */}
      {showReservationWizard && (
        <AdminReservationWizard
          boats={boats}
          onClose={() => setShowReservationWizard(false)}
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
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-black text-viva-blue-dark mb-6">Editar Barco - {boat.name}</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-semibold mb-2">📌 ID do Barco:</p>
            <p className="text-xs text-blue-600 font-mono break-all">{boat.id}</p>
            <p className="text-xs text-blue-600 mt-2">
              Todas as reservas estão vinculadas a este ID e serão atualizadas automaticamente.
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 mb-2">
              <strong className="flex items-center gap-1">
                <span className="text-yellow-600">⚠</span>
                Atenção:
              </strong> Ao alterar a data do barco, todas as {boat.seatsTaken} reservas aprovadas serão automaticamente realocadas para a nova data.
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || newDate === currentDateString}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Realocar Barco'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Função para obter cor do grupo baseado no groupId
const getGroupColor = (groupId: string | undefined, groupColorMap: Map<string, number>) => {
  if (!groupId) return null;
  const colorIndex = groupColorMap.get(groupId);
  if (colorIndex === undefined) return null;
  return GROUP_COLORS[colorIndex % GROUP_COLORS.length];
};

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
  const availableSeats = boat.seatsTotal - boat.seatsTaken;
  const occupancyPercent = Math.round((boat.seatsTaken / boat.seatsTotal) * 100);

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

  // Contar quantos grupos existem
  const totalGroups = groupColorMap.size;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-viva-blue-dark truncate">{boat.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                <Calendar size={14} className="text-gray-500" />
                {formatDate(boat.date)}
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
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl sm:text-3xl font-black text-red-600">{boat.seatsTaken}</p>
            <p className="text-xs sm:text-sm text-red-600 font-medium">Ocupadas</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl sm:text-3xl font-black text-green-600">{availableSeats}</p>
            <p className="text-xs sm:text-sm text-green-600 font-medium">Disponíveis</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl sm:text-3xl font-black text-purple-600">{totalGroups}</p>
            <p className="text-xs sm:text-sm text-purple-600 font-medium">Grupos</p>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Ocupação do Barco</span>
            <span className="font-bold text-gray-800">{occupancyPercent}%</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                boat.seatsTaken >= boat.seatsTotal 
                  ? 'bg-red-500' 
                  : boat.seatsTaken >= boat.seatsTotal * 0.8 
                    ? 'bg-orange-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Lista de Reservas */}
          {reservations.length > 0 ? (
            <div>
              <h3 className="text-base sm:text-lg font-bold text-viva-blue-dark mb-3 sm:mb-4 flex items-center gap-2">
                ✅ Reservas Aprovadas
                <span className="bg-viva-blue text-white text-xs px-2 py-0.5 rounded-full">
                  {reservations.length}
                </span>
              </h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {reservations.map((reservation, index) => {
                  const groupColor = getGroupColor(reservation.groupId, groupColorMap);
                  const groupSize = reservation.groupId ? groupCounts.get(reservation.groupId) || 0 : 0;
                  
                  return (
                  <div
                    key={reservation.id}
                    className={`rounded-lg p-3 sm:p-4 border-2 ${
                      groupColor 
                        ? `${groupColor.bg} ${groupColor.border}` 
                        : 'bg-gray-50 border-transparent'
                    }`}
                  >
                    {/* Badge de Grupo */}
                    {groupColor && groupSize > 1 && (
                      <div className={`${groupColor.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-2`}>
                        <Users size={12} />
                        Grupo de {groupSize} pessoas
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className={`${
                        groupColor ? groupColor.badge : 'bg-gradient-to-br from-viva-blue to-viva-blue-dark'
                      } text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base shrink-0`}>
                        {groupColor ? <Users size={20} /> : index + 1}
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
                              <span className="flex items-center gap-1">
                                <CheckCircle size={12} className="text-green-600" />
                                Pago: R$ {reservation.amountPaid.toFixed(2)}
                              </span>
                            </span>
                          )}
                          {reservation.amountDue > 0 && (
                            <span className="text-xs text-orange-600 font-bold">
                              <span className="flex items-center gap-1">
                                <DollarSign size={12} className="text-orange-600" />
                                Falta: R$ {reservation.amountDue.toFixed(2)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Cancelar reserva de ${reservation.customerName}?\nA vaga ficará disponível.`)) {
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
                );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 font-medium">Nenhuma reserva aprovada ainda</p>
              <p className="text-gray-400 text-sm">As reservas aprovadas aparecerão aqui</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-viva-blue text-white rounded-lg font-bold hover:bg-viva-blue-dark transition"
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
  boats,
  onClose,
  onApprove,
  onReject,
}: {
  reservation: Reservation;
  boat: Boat;
  boats: Boat[];
  onClose: () => void;
  onApprove: (reservation: Reservation, amountPaid: number) => void;
  onReject: (reservationId: string) => void;
}) {
  const [amountPaid, setAmountPaid] = useState(reservation.amountPaid.toString());
  const [showReallocationModal, setShowReallocationModal] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
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
        <div className="bg-gradient-to-r from-viva-blue to-viva-blue-dark rounded-lg p-4 mb-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs mb-1">Cliente</p>
              <p className="font-bold text-lg sm:text-xl truncate">{reservation.customerName}</p>
            </div>
            <div className="bg-white text-viva-blue-dark font-black text-xl sm:text-2xl px-3 sm:px-4 py-2 rounded-lg ml-3">
              #{reservation.seatNumber}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
            {reservation.phone ? (
              <>
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
              </>
            ) : (
              <span className="text-white/60">Sem telefone cadastrado</span>
            )}
          </div>
        </div>

        {/* Aviso para Pré-reserva */}
        {reservation.status === 'pre_reserved' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-bold text-orange-800 mb-1">⏳ PRÉ-RESERVA</p>
            <p className="text-xs text-orange-700">
              Esta é uma pré-reserva criada sem dados completos do cliente. Complete os dados antes de aprovar.
            </p>
          </div>
        )}

        {/* Informações em Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Calendar size={14} className="text-gray-400" />
              Data do Passeio
            </p>
            <p className="font-bold text-sm sm:text-base text-gray-800">{formatDate(reservation.rideDate)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <p className="text-xs text-gray-500 mb-1">💳 Pagamento</p>
            <p className="font-bold text-sm sm:text-base text-gray-800 capitalize">{reservation.paymentMethod}</p>
          </div>
          {reservation.escunaType && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 col-span-2">
              <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Users size={14} className="text-gray-400" />
                Tipo de Passeio
              </p>
              <p className="font-bold text-sm sm:text-base text-gray-800">
                {reservation.escunaType === 'com-desembarque' ? 'Com Desembarque na Ilha' : 'Sem Desembarque (Panorâmico)'}
              </p>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 col-span-2">
            <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <MapPin size={14} className="text-gray-400" />
              Endereço
            </p>
            <p className="font-bold text-sm sm:text-base text-gray-800">{reservation.address}</p>
          </div>
        </div>

        {/* Valores - Responsivo */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
          <p className="flex items-center gap-1 text-xs text-gray-500 mb-3 font-semibold">
            <DollarSign size={14} className="text-gray-400" />
            Valores
          </p>
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
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2 text-base sm:text-lg"
              >
                <CheckCircle size={20} />
                Aprovar Reserva
              </button>
              <button
                onClick={() => onReject(reservation.id)}
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
              >
                <XCircle size={18} />
                Recusar
              </button>
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Fechar
              </button>
            </>
          ) : reservation.status === 'approved' ? (
            <>
              <button
                onClick={() => setShowReallocationModal(true)}
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition flex items-center justify-center gap-2"
              >
                🔄 Realocar Pessoa
              </button>
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Fechar
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-viva-blue text-white rounded-lg font-bold hover:bg-viva-blue-dark transition"
            >
              Fechar
            </button>
          )}
        </div>
        
        {/* Modal Realocação */}
        {showReallocationModal && (
          <ReallocationModal
            reservation={reservation}
            currentBoat={boat}
            boats={boats}
            onClose={() => setShowReallocationModal(false)}
            onReallocate={async (newBoatId: string, newSeatNumber: number) => {
              try {
                const reservationRef = doc(db, 'reservations', reservation.id);
                const newBoatRef = doc(db, 'boats', newBoatId);
                const oldBoatRef = doc(db, 'boats', reservation.boatId);
                
                // Buscar novo barco
                const newBoatDoc = await getDoc(newBoatRef);
                if (!newBoatDoc.exists()) {
                  alert('Barco não encontrado!');
                  return;
                }
                const newBoatData = newBoatDoc.data();
                
                // Verificar se o assento está disponível no novo barco
                const reservationsQuery = query(
                  collection(db, 'reservations'),
                  where('boatId', '==', newBoatId),
                  where('status', '==', 'approved')
                );
                const reservationsSnapshot = await getDocs(reservationsQuery);
                const takenSeats = reservationsSnapshot.docs
                  .map(doc => doc.data().seatNumber)
                  .filter((seat: number) => seat !== reservation.seatNumber || newBoatId !== reservation.boatId);
                
                if (takenSeats.includes(newSeatNumber)) {
                  alert(`O assento ${newSeatNumber} já está ocupado no barco selecionado!`);
                  return;
                }
                
                if (newSeatNumber > newBoatData.seatsTotal) {
                  alert(`O assento ${newSeatNumber} não existe neste barco (máximo: ${newBoatData.seatsTotal})!`);
                  return;
                }
                
                // Atualizar reserva
                await updateDoc(reservationRef, {
                  boatId: newBoatId,
                  seatNumber: newSeatNumber,
                  rideDate: newBoatData.date,
                  updatedAt: Timestamp.now(),
                });
                
                // Atualizar seatsTaken do barco antigo (se mudou de barco)
                if (reservation.boatId !== newBoatId) {
                  const oldBoatDoc = await getDoc(oldBoatRef);
                  if (oldBoatDoc.exists()) {
                    const oldBoatData = oldBoatDoc.data();
                    await updateDoc(oldBoatRef, {
                      seatsTaken: Math.max(0, (oldBoatData.seatsTaken || 0) - 1),
                      updatedAt: Timestamp.now(),
                    });
                  }
                  
                  // Atualizar seatsTaken do novo barco
                  await updateDoc(newBoatRef, {
                    seatsTaken: (newBoatData.seatsTaken || 0) + 1,
                    updatedAt: Timestamp.now(),
                  });
                }
                
                setShowReallocationModal(false);
                onClose();
                alert('Reserva realocada com sucesso!');
              } catch (error) {
                console.error('Erro ao realocar reserva:', error);
                alert('Erro ao realocar reserva');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function ReallocationModal({
  reservation,
  currentBoat,
  boats,
  onClose,
  onReallocate,
}: {
  reservation: Reservation;
  currentBoat: Boat;
  boats: Boat[];
  onClose: () => void;
  onReallocate: (newBoatId: string, newSeatNumber: number) => Promise<void>;
}) {
  const [selectedBoatId, setSelectedBoatId] = useState(currentBoat.id);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  const selectedBoat = boats.find(b => b.id === selectedBoatId);
  
  useEffect(() => {
    if (!selectedBoat) return;
    
    const loadAvailableSeats = async () => {
      const reservationsQuery = query(
        collection(db, 'reservations'),
        where('boatId', '==', selectedBoat.id),
        where('status', '==', 'approved')
      );
      const reservationsSnapshot = await getDocs(reservationsQuery);
      const takenSeats = reservationsSnapshot.docs
        .map(doc => doc.data().seatNumber)
        .filter((seat: number) => {
          // Excluir o assento atual se for o mesmo barco
          return selectedBoat.id !== reservation.boatId || seat !== reservation.seatNumber;
        });
      
      const available: number[] = [];
      for (let i = 1; i <= selectedBoat.seatsTotal; i++) {
        if (!takenSeats.includes(i)) {
          available.push(i);
        }
      }
      setAvailableSeats(available);
      setSelectedSeat(null);
    };
    
    loadAvailableSeats();
  }, [selectedBoat, reservation]);
  
  const handleSubmit = async () => {
    if (!selectedSeat || !selectedBoatId) {
      alert('Selecione um barco e um assento');
      return;
    }
    
    setLoading(true);
    try {
      await onReallocate(selectedBoatId, selectedSeat);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-black text-viva-blue-dark mb-4">Realocar Reserva</h3>
        <p className="text-gray-600 mb-4">
          Movendo: <strong>{reservation.customerName}</strong> (Assento #{reservation.seatNumber} no barco {currentBoat.name})
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione o Novo Barco</label>
            <select
              value={selectedBoatId}
              onChange={(e) => setSelectedBoatId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
            >
              {boats.filter(b => b.status === 'active').map(boat => (
                <option key={boat.id} value={boat.id}>
                  {boat.name} - {formatDate(boat.date)} ({boat.seatsTotal - boat.seatsTaken} vagas)
                </option>
              ))}
            </select>
          </div>
          
          {selectedBoat && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Selecione o Novo Assento ({availableSeats.length} disponíveis)
              </label>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {Array.from({ length: selectedBoat.seatsTotal }, (_, i) => {
                  const seatNum = i + 1;
                  const isAvailable = availableSeats.includes(seatNum);
                  const isCurrent = selectedBoat.id === reservation.boatId && seatNum === reservation.seatNumber;
                  
                  return (
                    <button
                      key={seatNum}
                      type="button"
                      onClick={() => isAvailable && !isCurrent && setSelectedSeat(seatNum)}
                      disabled={!isAvailable || isCurrent}
                      className={`px-3 py-2 rounded-lg font-bold transition text-sm ${
                        selectedSeat === seatNum
                          ? 'bg-viva-blue text-white'
                          : isCurrent
                          ? 'bg-yellow-200 text-yellow-700 cursor-not-allowed'
                          : isAvailable
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-500 cursor-not-allowed opacity-50'
                      }`}
                      title={isCurrent ? 'Assento atual' : isAvailable ? 'Livre' : 'Ocupado'}
                    >
                      {isCurrent ? (
                        <MapPin size={14} className="text-white" />
                      ) : isAvailable ? (
                        <CheckCircle size={14} className="text-white" />
                      ) : (
                        <XCircle size={14} className="text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedSeat && (
                <p className="mt-2 text-sm text-viva-blue font-semibold">
                  Assento {selectedSeat} selecionado
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedSeat}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition disabled:opacity-50"
          >
            {loading ? 'Realocando...' : 'Realocar'}
          </button>
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
      <div className="bg-white rounded-lg p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="text-red-600" size={40} />
          </div>
          <h2 className="text-3xl font-black text-red-600 mb-4">
            ATENÇÃO!
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
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

        <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
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

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <p className="text-sm font-bold text-yellow-800 text-center">
            <span className="flex items-center justify-center gap-2">
              <span className="text-yellow-600">⚠</span>
              Esta ação NÃO pode ser desfeita! O barco e todas as reservas serão permanentemente removidos.
            </span>
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-lg font-bold text-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-bold text-lg hover:shadow-lg transition"
          >
            SIM, EXCLUIR TUDO
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== WIZARD DE RESERVA PARA ADMIN =====
interface PersonData {
  name: string;
  document: string;
  phone: string;
  birthDate: string;
  email: string;
  address: string;
  isChild: boolean;
  isHalfPrice: boolean;
  amount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
}

function AdminReservationWizard({
  boats,
  onClose,
}: {
  boats: Boat[];
  onClose: () => void;
}) {
  // Estados do wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendors, setVendors] = useState<UserRole[]>([]);
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [people, setPeople] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [escunaType, setEscunaType] = useState<'sem-desembarque' | 'com-desembarque'>('sem-desembarque');

  // Calcular total de passos: 1 (data/vendedor) + 1 (qtd pessoas) + numberOfPeople (dados) + 1 (pagamento)
  const totalSteps = 3 + numberOfPeople;
  
  // Carregar vendedores
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const vendorQuery = query(collection(db, 'roles'), where('role', '==', 'vendor'));
        const vendorSnapshot = await getDocs(vendorQuery);
        const vendorsList = vendorSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
        })) as UserRole[];
        setVendors(vendorsList);
      } catch (error) {
        console.error('Erro ao carregar vendedores:', error);
      }
    };
    loadVendors();
  }, []);

  // Barcos disponíveis para a data selecionada
  const boatsForDate = boats.filter(boat => {
    const boatDate = new Date(boat.date).toISOString().split('T')[0];
    return boatDate === selectedDate;
  });

  // Buscar assentos disponíveis quando um barco é selecionado
  useEffect(() => {
    if (!selectedBoat) {
      setAvailableSeats([]);
      return;
    }

    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('boatId', '==', selectedBoat.id),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservations = snapshot.docs.map(doc => doc.data()) as Reservation[];
      const takenSeats = reservations.map(r => r.seatNumber);
      
      const available: number[] = [];
      for (let i = 1; i <= selectedBoat.seatsTotal; i++) {
        if (!takenSeats.includes(i)) {
          available.push(i);
        }
      }
      setAvailableSeats(available);
    });

    return unsubscribe;
  }, [selectedBoat]);

  // Inicializar array de pessoas quando mudar a quantidade
  useEffect(() => {
    const newPeople: PersonData[] = [];
    for (let i = 0; i < numberOfPeople; i++) {
      newPeople.push(people[i] || {
        name: '',
        document: '',
        phone: '',
        birthDate: '',
        email: '',
        address: '',
        isChild: false,
        isHalfPrice: false,
        amount: 200,
        paymentMethod: 'pix',
        amountPaid: 0,
      });
    }
    setPeople(newPeople);
  }, [numberOfPeople]);

  // Selecionar automaticamente os assentos quando a quantidade muda
  useEffect(() => {
    if (availableSeats.length > 0 && numberOfPeople > 0) {
      setSelectedSeats(availableSeats.slice(0, numberOfPeople));
    }
  }, [numberOfPeople, availableSeats]);

  // Calcular totais
  const totalAmount = people.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = people.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalRemaining = totalAmount - totalPaid;

  // Validações por passo
  const canProceed = () => {
    if (currentStep === 1) {
      return selectedDate && selectedBoat && selectedVendorId;
    }
    if (currentStep === 2) {
      const vagasDisponiveis = selectedBoat ? selectedBoat.seatsTotal - selectedBoat.seatsTaken : 0;
      return numberOfPeople >= 1 && numberOfPeople <= vagasDisponiveis;
    }
    // Passos de dados das pessoas
    if (currentStep >= 3 && currentStep < 3 + numberOfPeople) {
      const personIndex = currentStep - 3;
      const person = people[personIndex];
      return person && person.name && person.document && person.phone && person.birthDate;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBoat) {
      setError('Selecione um barco');
      return;
    }

    if (!selectedVendorId) {
      setError('Selecione um vendedor');
      return;
    }

    // Verificar se há vagas suficientes
    const vagasDisponiveis = selectedBoat.seatsTotal - selectedBoat.seatsTaken;
    if (numberOfPeople > vagasDisponiveis) {
      setError(`Não há vagas suficientes. Disponíveis: ${vagasDisponiveis}`);
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
        // Gerar número de identificação único baseado em timestamp
        const seatNumber = baseTimestamp + index;
        
        const reservationData: Record<string, unknown> = {
          boatId: selectedBoat.id,
          seatNumber, // Agora é apenas um ID único, não um assento real
          status: 'pending',
          customerName: person.name,
          phone: person.phone,
          whatsapp: person.phone,
          address: person.address || '',
          document: person.document,
          birthDate: person.birthDate,
          email: person.email || '',
          paymentMethod: person.paymentMethod,
          totalAmount: person.amount,
          amountPaid: person.amountPaid,
          amountDue: person.amount - person.amountPaid,
          vendorId: selectedVendorId,
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
      alert(`${people.length} reserva(s) criada(s) com sucesso!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar reservas');
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
    const stepLabels = ['Data', 'Pessoas', ...Array.from({ length: numberOfPeople }, (_, i) => `Pessoa ${i + 1}`), 'Pagamento'];
    const displaySteps = stepLabels.slice(0, totalSteps);
    
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {displaySteps.map((label, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? <CheckCircle size={20} className="text-white" /> : stepNum}
                </div>
                <span className={`text-xs mt-1 text-center ${isActive ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Nova Reserva (Admin)
            </h2>
            <p className="text-gray-500 text-sm">Passo {currentStep} de {totalSteps}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de Progresso */}
        {renderProgressBar()}

        {/* Conteúdo do Passo */}
        <div className="min-h-[300px]">
          {/* PASSO 1: Seleção de Data, Barco e Vendedor */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Configuração Inicial</h3>
                <p className="text-gray-500">Data, barco e vendedor responsável</p>
              </div>

              {/* Seleção de Vendedor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  👤 Vendedor Responsável *
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-lg"
                >
                  <option value="">Selecione um vendedor...</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.uid} value={vendor.uid}>
                      {vendor.name || vendor.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    Data do Passeio
                  </span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedBoat(null);
                    setSelectedSeats([]);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-lg"
                />
                {selectedDate && (
                  <p className="mt-2 text-sm text-green-600 font-medium">
                    {formatDisplayDate(selectedDate)}
                  </p>
                )}
              </div>

              {selectedDate && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <span className="flex items-center gap-2">
                      <Users size={16} className="text-gray-500" />
                      Selecione o Barco
                    </span>
                  </label>
                  {boatsForDate.length === 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                      <p className="text-orange-700 font-medium">Nenhum barco disponível para esta data</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {boatsForDate.map((boat) => {
                        const availableCount = boat.seatsTotal - boat.seatsTaken;
                        const isSelected = selectedBoat?.id === boat.id;
                        return (
                          <button
                            key={boat.id}
                            type="button"
                            onClick={() => {
                              setSelectedBoat(boat);
                              setSelectedSeats([]);
                            }}
                            disabled={availableCount === 0}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              isSelected 
                                ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                                : availableCount === 0
                                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Users size={16} className="text-gray-600" />
                                  <span className="font-bold text-gray-800">{boat.name}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {availableCount} vagas disponíveis de {boat.seatsTotal}
                                </p>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <span className="text-white text-sm">✓</span>}
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
              {selectedBoat?.boatType === 'escuna' && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Passeio</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEscunaType('sem-desembarque')}
                      className={`px-4 py-3 rounded-lg font-bold transition ${
                        escunaType === 'sem-desembarque'
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Sem Desembarque
                    </button>
                    <button
                      type="button"
                      onClick={() => setEscunaType('com-desembarque')}
                      className={`px-4 py-3 rounded-lg font-bold transition ${
                        escunaType === 'com-desembarque'
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Com Desembarque
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: Quantidade de Pessoas */}
          {currentStep === 2 && selectedBoat && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Quantas pessoas vão no passeio?</h3>
                <p className="text-gray-500">Selecione a quantidade de passageiros</p>
              </div>

              {/* Vagas disponíveis */}
              {(() => {
                const vagasDisponiveis = selectedBoat.seatsTotal - selectedBoat.seatsTaken;
                return (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-green-800 text-lg">
                        🎫 <strong>{vagasDisponiveis}</strong> vagas disponíveis de <strong>{selectedBoat.seatsTotal}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                      <button
                        type="button"
                        onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                        className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600 transition shadow-sm"
                      >
                        −
                      </button>
                      <div className="text-center px-6">
                        <span className="text-7xl font-black text-green-600">{numberOfPeople}</span>
                        <p className="text-gray-500 mt-2 text-lg">{numberOfPeople === 1 ? 'pessoa' : 'pessoas'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNumberOfPeople(Math.min(vagasDisponiveis, numberOfPeople + 1))}
                        disabled={numberOfPeople >= vagasDisponiveis}
                        className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    {numberOfPeople > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center animate-fadeIn">
                        <p className="text-green-800 font-medium text-lg">
                          ✅ {numberOfPeople} {numberOfPeople === 1 ? 'vaga será reservada' : 'vagas serão reservadas'}
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
            <div className="space-y-5 animate-fadeIn">
              {(() => {
                const personIndex = currentStep - 3;
                const person = people[personIndex] || {
                  name: '',
                  document: '',
                  phone: '',
                  birthDate: '',
                  email: '',
                  address: '',
                  isChild: false,
                  isHalfPrice: false,
                  amount: 200,
                  paymentMethod: 'pix',
                  amountPaid: 0,
                };
                const seatNumber = selectedSeats[personIndex];

                return (
                  <>
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4 text-white text-2xl font-bold">
                        {personIndex + 1}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Dados da Pessoa {personIndex + 1}
                      </h3>
                      <p className="text-gray-500">Vaga #{seatNumber}</p>
                    </div>

                    {/* Nome */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <User className="inline w-4 h-4 mr-1" /> Nome Completo *
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Nome completo do passageiro"
                      />
                    </div>

                    {/* Documento */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📄 Documento (CPF/RG) *
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Phone className="inline w-4 h-4 mr-1" /> Telefone *
                      </label>
                      <input
                        type="tel"
                        value={person.phone}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, phone: e.target.value };
                          setPeople(newPeople);
                        }}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="(48) 99999-9999"
                      />
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🎂 Data de Nascimento *
                      </label>
                      <input
                        type="date"
                        value={person.birthDate}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, birthDate: e.target.value };
                          setPeople(newPeople);
                        }}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Mail className="inline w-4 h-4 mr-1" /> Email
                      </label>
                      <input
                        type="email"
                        value={person.email}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, email: e.target.value };
                          setPeople(newPeople);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    {/* Endereço (opcional) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" /> Endereço <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={person.address}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, address: e.target.value };
                          setPeople(newPeople);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Rua, número, bairro..."
                      />
                    </div>

                    {/* Valor do Passeio */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-green-800 mb-2">
                        <span className="flex items-center gap-2">
                          <DollarSign size={16} className="text-green-600" />
                          Valor do Passeio (R$) *
                        </span>
                      </label>
                      <input
                        type="number"
                        value={person.amount || ''}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, amount: parseFloat(e.target.value) || 0 };
                          setPeople(newPeople);
                        }}
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-lg font-bold bg-white"
                        placeholder="200.00"
                      />
                    </div>

                    {/* É criança / Meia entrada */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          id={`child-${personIndex}`}
                          checked={person.isChild}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[personIndex] = { ...person, isChild: e.target.checked };
                            setPeople(newPeople);
                          }}
                          className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <label htmlFor={`child-${personIndex}`} className="font-semibold text-yellow-800 cursor-pointer">
                          👶 É criança (menor de 7 anos)?
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`half-${personIndex}`}
                          checked={person.isHalfPrice}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[personIndex] = { ...person, isHalfPrice: e.target.checked };
                            setPeople(newPeople);
                          }}
                          className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor={`half-${personIndex}`} className="font-semibold text-orange-700 cursor-pointer">
                          🎫 Paga meia entrada?
                        </label>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ÚLTIMO PASSO: Pagamento */}
          {currentStep === totalSteps && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CreditCard className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Pagamento</h3>
                <p className="text-gray-500">Configure o pagamento de cada pessoa</p>
              </div>

              {/* Resumo Total */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 font-medium">Valor Total:</span>
                  <span className="text-2xl font-black text-green-700">R$ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 font-medium">Total Recebido:</span>
                  <span className="text-xl font-bold text-blue-600">R$ {totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-green-300">
                  <span className="text-gray-800 font-bold">Valor Restante:</span>
                  <span className={`text-xl font-black ${totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    R$ {totalRemaining.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pagamento por pessoa */}
              <div className="space-y-4">
                {people.map((person, index) => (
                  <div key={index} className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-gray-800">Pessoa {index + 1}: {person.name}</span>
                        <span className="text-sm text-gray-500 ml-2">(Vaga #{selectedSeats[index]})</span>
                      </div>
                      <span className="font-bold text-green-700">R$ {person.amount.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Recebido</label>
                        <input
                          type="number"
                          value={person.amountPaid || ''}
                          onChange={(e) => {
                            const newPeople = [...people];
                            const value = parseFloat(e.target.value) || 0;
                            newPeople[index] = { ...person, amountPaid: Math.min(value, person.amount) };
                            setPeople(newPeople);
                          }}
                          min="0"
                          max={person.amount}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de Pagamento</label>
                        <select
                          value={person.paymentMethod}
                          onChange={(e) => {
                            const newPeople = [...people];
                            newPeople[index] = { ...person, paymentMethod: e.target.value as PaymentMethod };
                            setPeople(newPeople);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        >
                          <option value="pix">💠 PIX</option>
                          <option value="cartao">💳 Cartão</option>
                          <option value="dinheiro">💵 Dinheiro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 font-medium">
                  ⏳ A reserva será criada como <strong>pendente</strong> e precisará ser aprovada
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
            {error}
          </div>
        )}

        {/* Botões de Navegação */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft size={20} />
              Voltar
            </button>
          )}
          
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Criar Reserva{people.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

