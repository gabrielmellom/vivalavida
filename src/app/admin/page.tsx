'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Boat, Reservation, PaymentMethod, UserRole } from '@/types';
import { Plus, Calendar, Users, CheckCircle, XCircle, Clock, DollarSign, FileText, LogOut, Edit2, Power, Trash2, BarChart3, Settings, Bell, Volume2, ChevronLeft, ChevronRight, User, Phone, Mail, MapPin, CreditCard, Sparkles, QrCode, Menu, X, Cloud, Sun, CloudRain, CloudSun, Wind, Droplets, Ship, TrendingUp, Download } from 'lucide-react';
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

export default function AdminDashboard() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [seatsTotal, setSeatsTotal] = useState(40);
  const [seatsWithLanding, setSeatsWithLanding] = useState(10); // Vagas com desembarque
  const [seatsWithoutLanding, setSeatsWithoutLanding] = useState(30); // Vagas sem desembarque
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
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);
  const [boatToEditPrice, setBoatToEditPrice] = useState<Boat | null>(null);
  const [newTicketPrice, setNewTicketPrice] = useState('');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]); // Data para filtrar barcos
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date()); // Mês do calendário
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showReservationWizard, setShowReservationWizard] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [weather, setWeather] = useState<{temp: number; condition: string; humidity: number; wind: number} | null>(null);
  const [showWeatherForecast, setShowWeatherForecast] = useState(false);
  const [weekForecast, setWeekForecast] = useState<{
    date: string;
    tempMax: number;
    tempMin: number;
    condition: string;
    weatherCode: number;
    precipitation: number;
    windMax: number;
  }[]>([]);
  const [dayNotes, setDayNotes] = useState<Map<string, string>>(new Map());
  const [currentNote, setCurrentNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const previousPendingCountRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { user, userRole, signOut } = useAuth();
  const router = useRouter();

  // Buscar previsão do tempo de Florianópolis (atual + 7 dias)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Usando API gratuita Open-Meteo para Florianópolis - incluindo previsão de 7 dias
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-27.5954&longitude=-48.5480&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=America/Sao_Paulo&forecast_days=7'
        );
        const data = await response.json();
        
        // Previsão atual
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            condition: getWeatherCondition(data.current.weather_code),
            humidity: data.current.relative_humidity_2m,
            wind: Math.round(data.current.wind_speed_10m),
          });
        }
        
        // Previsão de 7 dias
        if (data.daily) {
          const forecast = data.daily.time.map((date: string, index: number) => ({
            date,
            tempMax: Math.round(data.daily.temperature_2m_max[index]),
            tempMin: Math.round(data.daily.temperature_2m_min[index]),
            condition: getWeatherCondition(data.daily.weather_code[index]),
            weatherCode: data.daily.weather_code[index],
            precipitation: Math.round(data.daily.precipitation_sum[index]),
            windMax: Math.round(data.daily.wind_speed_10m_max[index]),
          }));
          setWeekForecast(forecast);
        }
      } catch (error) {
        console.log('Erro ao buscar previsão:', error);
      }
    };
    fetchWeather();
    // Atualizar a cada 30 minutos
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Converter código do tempo para texto
  const getWeatherCondition = (code: number): string => {
    if (code === 0) return 'Ensolarado';
    if (code <= 3) return 'Parcialmente nublado';
    if (code <= 48) return 'Nublado';
    if (code <= 67) return 'Chuva';
    if (code <= 77) return 'Neve';
    if (code <= 82) return 'Pancadas';
    return 'Tempestade';
  };

  // Ícone do tempo baseado na condição
  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="text-gray-400" size={32} />;
    const condition = weather.condition.toLowerCase();
    if (condition.includes('ensolarado')) return <Sun className="text-amber-500" size={32} />;
    if (condition.includes('parcialmente')) return <CloudSun className="text-amber-400" size={32} />;
    if (condition.includes('chuva') || condition.includes('pancadas')) return <CloudRain className="text-blue-500" size={32} />;
    return <Cloud className="text-gray-500" size={32} />;
  };

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

  // Carregar notas do dia do Firebase
  useEffect(() => {
    const notesQuery = query(collection(db, 'dayNotes'));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notesMap = new Map<string, string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date && data.note) {
          notesMap.set(data.date, data.note);
        }
      });
      setDayNotes(notesMap);
    });

    return () => unsubscribeNotes();
  }, []);

  // Atualizar nota atual quando muda a data filtrada
  useEffect(() => {
    if (filterDate) {
      setCurrentNote(dayNotes.get(filterDate) || '');
    }
  }, [filterDate, dayNotes]);

  // Salvar nota do dia
  const saveDayNote = async () => {
    if (!filterDate) return;
    
    setSavingNote(true);
    try {
      // Usar a data como ID do documento
      const noteRef = doc(db, 'dayNotes', filterDate);
      if (currentNote.trim()) {
        await setDoc(noteRef, {
          date: filterDate,
          note: currentNote.trim(),
          updatedAt: Timestamp.now(),
        });
      } else {
        // Se a nota estiver vazia, deletar o documento
        await deleteDoc(noteRef);
      }
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      alert('Erro ao salvar nota. Tente novamente.');
    } finally {
      setSavingNote(false);
    }
  };

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
            // Vagas por tipo de serviço (apenas para escunas)
            seatsWithLanding: boatType === 'escuna' ? seatsWithLanding : undefined,
            seatsWithLandingTaken: boatType === 'escuna' ? 0 : undefined,
            seatsWithoutLanding: boatType === 'escuna' ? seatsWithoutLanding : undefined,
            seatsWithoutLandingTaken: boatType === 'escuna' ? 0 : undefined,
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
          // Vagas por tipo de serviço (apenas para escunas)
          seatsWithLanding: boatType === 'escuna' ? seatsWithLanding : undefined,
          seatsWithLandingTaken: boatType === 'escuna' ? 0 : undefined,
          seatsWithoutLanding: boatType === 'escuna' ? seatsWithoutLanding : undefined,
          seatsWithoutLandingTaken: boatType === 'escuna' ? 0 : undefined,
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
      setSeatsWithLanding(10);
      setSeatsWithoutLanding(30);
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
      
      const boatData = boatDocSnap.data() as Boat;
      const currentSeatsTaken = boatData.seatsTaken || 0;
      
      // Se a reserva já estava aprovada, não incrementar seatsTaken novamente
      const wasAlreadyApproved = reservation.status === 'approved';
      
      // Verificar se ainda há vagas disponíveis (geral)
      if (!wasAlreadyApproved && currentSeatsTaken >= boatData.seatsTotal) {
        alert('Não há mais vagas disponíveis neste barco!');
        return;
      }

      // Verificar vagas por tipo de serviço (para escunas)
      if (!wasAlreadyApproved && boatData.boatType === 'escuna' && boatData.seatsWithLanding !== undefined) {
        const isWithLanding = reservation.escunaType === 'com-desembarque';
        
        if (isWithLanding) {
          const currentWithLandingTaken = boatData.seatsWithLandingTaken || 0;
          if (currentWithLandingTaken >= (boatData.seatsWithLanding || 0)) {
            alert(`Não há mais vagas com desembarque disponíveis! (${currentWithLandingTaken}/${boatData.seatsWithLanding})`);
            return;
          }
        } else {
          const currentWithoutLandingTaken = boatData.seatsWithoutLandingTaken || 0;
          if (currentWithoutLandingTaken >= (boatData.seatsWithoutLanding || 0)) {
            alert(`Não há mais vagas panorâmicas disponíveis! (${currentWithoutLandingTaken}/${boatData.seatsWithoutLanding})`);
            return;
          }
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
        const updateData: Record<string, unknown> = {
          seatsTaken: currentSeatsTaken + 1,
          updatedAt: Timestamp.now(),
        };
        
        // Atualizar contadores por tipo de serviço (para escunas)
        if (boatData.boatType === 'escuna' && boatData.seatsWithLanding !== undefined) {
          const isWithLanding = reservation.escunaType === 'com-desembarque';
          if (isWithLanding) {
            updateData.seatsWithLandingTaken = (boatData.seatsWithLandingTaken || 0) + 1;
          } else {
            updateData.seatsWithoutLandingTaken = (boatData.seatsWithoutLandingTaken || 0) + 1;
          }
        }
        
        await updateDoc(boatRef, updateData);
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
          const boatData = boatDocSnap.data() as Boat;
          const currentSeatsTaken = boatData.seatsTaken || 0;
          
          // Decrementar apenas se for maior que zero
          if (currentSeatsTaken > 0) {
            const updateData: Record<string, unknown> = {
              seatsTaken: currentSeatsTaken - 1,
              updatedAt: Timestamp.now(),
            };
            
            // Decrementar contadores por tipo de serviço (para escunas)
            if (boatData.boatType === 'escuna' && boatData.seatsWithLanding !== undefined) {
              const isWithLanding = reservation.escunaType === 'com-desembarque';
              if (isWithLanding) {
                const currentWithLandingTaken = boatData.seatsWithLandingTaken || 0;
                if (currentWithLandingTaken > 0) {
                  updateData.seatsWithLandingTaken = currentWithLandingTaken - 1;
                }
              } else {
                const currentWithoutLandingTaken = boatData.seatsWithoutLandingTaken || 0;
                if (currentWithoutLandingTaken > 0) {
                  updateData.seatsWithoutLandingTaken = currentWithoutLandingTaken - 1;
                }
              }
            }
            
            await updateDoc(boatRef, updateData);
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

  const handleEditPrice = (boat: Boat) => {
    setBoatToEditPrice(boat);
    setNewTicketPrice(boat.ticketPrice.toString());
    setShowEditPriceModal(true);
  };

  const handleUpdateBoatPrice = async () => {
    if (!boatToEditPrice) return;

    const priceValue = parseFloat(newTicketPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    try {
      const boatRef = doc(db, 'boats', boatToEditPrice.id);
      
      // Atualizar preço do barco
      await updateDoc(boatRef, {
        ticketPrice: priceValue,
        updatedAt: Timestamp.now(),
      });

      // Fechar modal e limpar estados
      setShowEditPriceModal(false);
      setBoatToEditPrice(null);
      setNewTicketPrice('');

      alert('Valor atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar valor do barco:', error);
      alert('Erro ao atualizar valor do barco');
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

  // Dados do calendário - quais dias têm barco e quais têm reservas
  const calendarData = useMemo(() => {
    const boatDates = new Map<string, { hasBoat: boolean; hasReservations: boolean; reservationCount: number }>();
    
    // Marcar dias com barco
    boats.forEach(boat => {
      if (boat.status !== 'active') return;
      const dateKey = new Date(boat.date).toISOString().split('T')[0];
      if (!boatDates.has(dateKey)) {
        boatDates.set(dateKey, { hasBoat: true, hasReservations: false, reservationCount: 0 });
      }
    });
    
    // Marcar dias com reservas
    reservations.forEach(r => {
      if (r.status === 'cancelled') return;
      const dateKey = new Date(r.rideDate).toISOString().split('T')[0];
      const existing = boatDates.get(dateKey);
      if (existing) {
        existing.hasReservations = true;
        existing.reservationCount++;
      }
    });
    
    return boatDates;
  }, [boats, reservations]);

  // Funções do calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = domingo
    
    const days: (Date | null)[] = [];
    
    // Adicionar espaços vazios para os dias antes do primeiro dia do mês
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Adicionar os dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getCalendarDayStatus = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const data = calendarData.get(dateKey);
    const isToday = dateKey === new Date().toISOString().split('T')[0];
    const isSelected = dateKey === filterDate;
    const hasNote = dayNotes.has(dateKey);
    
    return {
      hasBoat: data?.hasBoat || false,
      hasReservations: data?.hasReservations || false,
      reservationCount: data?.reservationCount || 0,
      isToday,
      isSelected,
      hasNote,
    };
  };

  const calendarMonthName = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

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

  // Nome do dia da semana
  const getDayName = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[new Date().getDay()];
  };

  // Data formatada
  const getFormattedDate = () => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const d = new Date();
    return `${d.getDate()} de ${months[d.getMonth()]}`;
  };

  // Calcular variação de reservas vs ontem
  const getReservationTrend = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const todayCount = reservations.filter(r => r.rideDate === today).length;
    const yesterdayCount = reservations.filter(r => r.rideDate === yesterday).length;
    if (yesterdayCount === 0) return { percent: 0, isUp: true };
    const percent = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
    return { percent: Math.abs(percent), isUp: percent >= 0 };
  };

  const trend = getReservationTrend();

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Alerta de Novo Pedido */}
      {newOrderAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-pulse">
          <div className="bg-emerald-600 text-white py-3 px-4 shadow-lg">
            <div className="container mx-auto flex items-center justify-center gap-3">
              <Bell className="animate-bounce" size={24} />
              <p className="font-semibold">
                {newOrderCount === 1 
                  ? '🎉 Nova reserva recebida!' 
                  : `🎉 ${newOrderCount} novas reservas!`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Lateral (Sidebar) */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${showSideMenu ? 'visible' : 'invisible'}`}>
        {/* Overlay */}
        <div 
          className={`absolute inset-0 bg-black/50 transition-opacity ${showSideMenu ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowSideMenu(false)}
        />
        
        {/* Sidebar */}
        <div className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ${showSideMenu ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6">
            {/* Header do Menu */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-800">Menu</h2>
              <button 
                onClick={() => setShowSideMenu(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={24} className="text-slate-600" />
              </button>
            </div>

            {/* Links de Navegação */}
            <nav className="space-y-2">
              <Link
                href="/admin/vendedores"
                onClick={() => setShowSideMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition text-slate-700"
              >
                <Users size={20} />
                <span className="font-medium">Gerenciar Equipe</span>
              </Link>
              <Link
                href="/admin/checkin"
                onClick={() => setShowSideMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition text-slate-700"
              >
                <CheckCircle size={20} />
                <span className="font-medium">Check-in</span>
              </Link>
              <Link
                href="/admin/vouchers"
                onClick={() => setShowSideMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition text-slate-700"
              >
                <QrCode size={20} />
                <span className="font-medium">Gerar Vouchers</span>
              </Link>
              <Link
                href="/admin/relatorios"
                onClick={() => setShowSideMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition text-slate-700"
              >
                <BarChart3 size={20} />
                <span className="font-medium">Relatórios</span>
              </Link>
              <Link
                href="/admin/financeiro"
                onClick={() => setShowSideMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition text-slate-700"
              >
                <DollarSign size={20} />
                <span className="font-medium">Financeiro</span>
              </Link>
              <Link
                href="/admin/config-site"
                onClick={() => setShowSideMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition text-slate-700"
              >
                <Settings size={20} />
                <span className="font-medium">Configurações do Site</span>
              </Link>
              
              {/* Previsão do Tempo */}
              <button
                onClick={() => {
                  setShowSideMenu(false);
                  setShowWeatherForecast(true);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sky-50 transition text-sky-700 w-full relative"
              >
                <Cloud size={20} />
                <span className="font-medium">Previsão 7 Dias</span>
                {weekForecast.some(day => {
                  const boatOnDay = boats.find(b => b.date.split('T')[0] === day.date && b.status === 'active');
                  const isBadWeather = day.weatherCode > 50;
                  return boatOnDay && isBadWeather;
                }) && (
                  <span className="absolute right-4 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                )}
              </button>
            </nav>

            {/* Configurações de Som */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={() => {
                  toggleSound();
                  if (!soundEnabled) {
                    setTimeout(() => playNotificationSound(), 100);
                  }
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition ${
                  soundEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Volume2 size={20} />
                <span className="font-medium">
                  {soundEnabled ? 'Notificações Ativadas' : 'Notificações Desativadas'}
                </span>
              </button>
            </div>

            {/* Logout */}
            <div className="mt-6">
              <button
                onClick={() => {
                  signOut();
                  router.push('/login');
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition"
              >
                <LogOut size={20} />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Previsão do Tempo 7 Dias */}
      {showWeatherForecast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWeatherForecast(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Cloud size={24} />
                    Previsão do Tempo
                  </h2>
                  <p className="text-sky-100 text-sm">Florianópolis - Próximos 7 dias</p>
                </div>
                <button
                  onClick={() => setShowWeatherForecast(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Tempo atual */}
              {weather && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    {getWeatherIcon()}
                  </div>
                  <div>
                    <p className="text-4xl font-black">{weather.temp}°C</p>
                    <p className="text-sky-100">{weather.condition}</p>
                  </div>
                  <div className="ml-auto text-right text-sm text-sky-100">
                    <p className="flex items-center gap-1 justify-end">
                      <Droplets size={14} /> {weather.humidity}%
                    </p>
                    <p className="flex items-center gap-1 justify-end">
                      <Wind size={14} /> {weather.wind} km/h
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Lista de 7 dias */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {/* Legenda de alertas */}
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                  <Bell size={16} />
                  Dias com alerta são barcos ativos com previsão de chuva
                </p>
              </div>
              
              <div className="space-y-2">
                {weekForecast.map((day, index) => {
                  const dateObj = new Date(day.date + 'T12:00:00');
                  const isToday = index === 0;
                  const dayName = isToday ? 'Hoje' : dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                  const dateFormatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                  
                  // Verificar se há barco ativo neste dia
                  const boatOnDay = boats.find(b => b.date.split('T')[0] === day.date && b.status === 'active');
                  const reservationsOnDay = boatOnDay 
                    ? reservations.filter(r => r.boatId === boatOnDay.id && r.status === 'approved').length 
                    : 0;
                  
                  // Verificar se o tempo é ruim (código > 50 = chuva ou pior)
                  const isBadWeather = day.weatherCode > 50;
                  const hasAlert = boatOnDay && isBadWeather;
                  
                  // Ícone baseado no código
                  const getWeatherIconSmall = (code: number) => {
                    if (code === 0) return <Sun size={24} className="text-amber-500" />;
                    if (code <= 3) return <CloudSun size={24} className="text-amber-400" />;
                    if (code <= 48) return <Cloud size={24} className="text-slate-400" />;
                    if (code <= 67) return <CloudRain size={24} className="text-blue-500" />;
                    if (code <= 82) return <CloudRain size={24} className="text-blue-600" />;
                    return <CloudRain size={24} className="text-purple-600" />;
                  };
                  
                  return (
                    <div 
                      key={day.date}
                      className={`p-4 rounded-xl transition ${
                        hasAlert 
                          ? 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300' 
                          : boatOnDay 
                            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                            : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Data */}
                        <div className="w-16 text-center">
                          <p className={`text-sm font-bold ${isToday ? 'text-sky-600' : 'text-slate-700'}`}>
                            {dayName}
                          </p>
                          <p className="text-xs text-slate-500">{dateFormatted}</p>
                        </div>
                        
                        {/* Ícone do tempo */}
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          {getWeatherIconSmall(day.weatherCode)}
                        </div>
                        
                        {/* Temperaturas */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-800">{day.tempMax}°</span>
                            <span className="text-sm text-slate-400">{day.tempMin}°</span>
                          </div>
                          <p className="text-xs text-slate-500">{day.condition}</p>
                        </div>
                        
                        {/* Info do barco */}
                        <div className="text-right">
                          {boatOnDay ? (
                            <div className={`text-xs ${hasAlert ? 'text-orange-700' : 'text-emerald-700'}`}>
                              <p className="font-bold flex items-center gap-1 justify-end">
                                <Ship size={12} />
                                Barco ativo
                              </p>
                              <p>{reservationsOnDay} reservas</p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">Sem barco</p>
                          )}
                        </div>
                        
                        {/* Alerta */}
                        {hasAlert && (
                          <div className="ml-2">
                            <span className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full animate-pulse">
                              <Bell size={16} />
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Detalhes extras se tiver alerta */}
                      {hasAlert && (
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-orange-700 font-semibold flex items-center gap-1">
                              <CloudRain size={16} />
                              Precipitação: {day.precipitation}mm
                            </span>
                            <span className="text-orange-700 font-semibold flex items-center gap-1">
                              <Wind size={16} />
                              Vento: até {day.windMax}km/h
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-orange-600 font-medium">
                            ⚠️ Atenção: Previsão de chuva com {reservationsOnDay} reservas confirmadas!
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowWeatherForecast(false)}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Clean & Professional */}
      <header className={`bg-white ${newOrderAlert ? 'mt-12' : ''} transition-all duration-300`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Greeting */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {userRole?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">DASHBOARD</p>
                <h1 className="text-lg font-bold text-slate-800">
                  Olá, {userRole?.name?.split(' ')[0] || 'Capitão'}
                </h1>
              </div>
            </div>

            {/* Right: Notification + Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toggleSound();
                  if (!soundEnabled) setTimeout(() => playNotificationSound(), 100);
                }}
                className={`relative p-2.5 rounded-xl transition ${
                  soundEnabled && audioUnlocked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Bell size={20} />
                {pendingReservations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingReservations.length > 9 ? '9+' : pendingReservations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowSideMenu(true)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <Menu size={20} className="text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Data atual */}
        <p className="text-slate-500 text-sm mb-6">{getDayName()}, {getFormattedDate()}</p>

        {/* Stats Cards - 2 columns */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Reservas Hoje */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <FileText size={20} className="text-slate-600" />
              </div>
              <span className="text-xs text-slate-500">Reservas<br/>Hoje</span>
            </div>
            <p className="text-3xl font-bold text-slate-800 mb-1">
              {reservations.filter(r => r.rideDate === new Date().toISOString().split('T')[0]).length}
            </p>
            <div className={`flex items-center gap-1 text-xs ${trend.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              <TrendingUp size={14} className={!trend.isUp ? 'rotate-180' : ''} />
              <span>{trend.isUp ? '+' : '-'}{trend.percent}% vs ontem</span>
            </div>
          </div>

          {/* Previsão do Tempo - Clicável para ver 7 dias */}
          <button
            onClick={() => setShowWeatherForecast(true)}
            className="bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            {/* Indicador de alerta se houver dias ruins com barcos */}
            {weekForecast.some(day => {
              const boatOnDay = boats.find(b => b.date.split('T')[0] === day.date && b.status === 'active');
              const isBadWeather = day.weatherCode > 50; // Chuva ou pior
              return boatOnDay && isBadWeather;
            }) && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-sky-50 rounded-xl group-hover:bg-sky-100 transition-colors">
                {getWeatherIcon()}
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Floripa</span>
                <p className="text-[10px] text-sky-600 font-medium">Ver 7 dias →</p>
              </div>
            </div>
            {weather ? (
              <>
                <p className="text-3xl font-bold text-slate-800 mb-1">{weather.temp}°C</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Droplets size={12} />
                    {weather.humidity}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Wind size={12} />
                    {weather.wind}km/h
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">Carregando...</p>
            )}
          </button>
        </div>

        {/* Ações Rápidas */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-500 mb-3">Ações Rápidas</h2>
          
          {/* Botão Principal - Novo Passeio */}
          <button
            onClick={() => setShowReservationWizard(true)}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition mb-3 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">Novo Passeio</p>
                <p className="text-white/80 text-sm">Agendar uma nova saída</p>
              </div>
            </div>
            <ChevronRight size={24} className="opacity-60 group-hover:translate-x-1 transition" />
          </button>

          {/* Botão Secundário - Criar Barco */}
          <button
            onClick={() => setShowBoatModal(true)}
            className="w-full bg-white border border-slate-200 text-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Ship size={20} className="text-slate-600" />
              </div>
              <span className="font-medium">Criar Novo Barco</span>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Barcos Programados */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Barcos Programados</h2>

          {/* Container do Calendário + Observações */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
          
          {/* Calendário Visual - Clean Design - Responsivo */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 sm:max-w-md lg:max-w-lg shrink-0">
            {/* Header do Calendário */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button
                onClick={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(newMonth.getMonth() - 1);
                  setCalendarMonth(newMonth);
                }}
                className="p-2 sm:p-3 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft size={18} className="sm:w-5 sm:h-5 text-slate-600" />
              </button>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 capitalize">{calendarMonthName}</h3>
              <button
                onClick={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setCalendarMonth(newMonth);
                }}
                className="p-2 sm:p-3 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight size={18} className="sm:w-5 sm:h-5 text-slate-600" />
              </button>
            </div>

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-3">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-slate-400 py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do Mês */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {getDaysInMonth(calendarMonth).map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14" />;
                }

                const status = getCalendarDayStatus(date);
                const dateStr = date.toISOString().split('T')[0];

                return (
                  <button
                    key={dateStr}
                    onClick={() => setFilterDate(dateStr)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl flex flex-col items-center justify-center text-sm sm:text-base font-medium transition relative ${
                      status.isSelected
                        ? 'bg-slate-800 text-white shadow-md'
                        : status.hasReservations
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : status.hasBoat
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : status.isToday
                        ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-400 ring-offset-1'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span>{date.getDate()}</span>
                    {status.hasReservations && !status.isSelected && (
                      <span className="text-[8px] sm:text-[10px] font-bold">{status.reservationCount}</span>
                    )}
                    {/* Indicador de nota */}
                    {status.hasNote && (
                      <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                        status.isSelected ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} title="Tem observação" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500"></div>
                <span className="text-xs sm:text-sm text-slate-500">Com reservas</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-200"></div>
                <span className="text-xs sm:text-sm text-slate-500">Barco</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full ring-2 ring-sky-400 bg-sky-100"></div>
                <span className="text-xs sm:text-sm text-slate-500">Hoje</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs sm:text-sm text-slate-500">Obs</span>
              </div>
            </div>

            {/* Botão Voltar para Hoje */}
            {filterDate !== new Date().toISOString().split('T')[0] && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    const todayDate = new Date();
                    setFilterDate(todayDate.toISOString().split('T')[0]);
                    setCalendarMonth(todayDate);
                  }}
                  className="text-sm sm:text-base text-sky-600 hover:text-sky-700 font-medium"
                >
                  ← Voltar para Hoje
                </button>
              </div>
            )}
          </div>

          {/* Card de Observações do Dia - Ao lado no PC */}
          {filterDate && (
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex-1 lg:max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={18} className="text-slate-400" />
                <span className="font-semibold text-slate-700">
                  Observações
                </span>
                {dayNotes.has(filterDate) && (
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                )}
              </div>
              <p className="text-sm text-slate-500 mb-3">{formatDate(filterDate)}</p>
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Anotações para este dia..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none resize-none mb-3"
                rows={4}
              />
              <button
                onClick={saveDayNote}
                disabled={savingNote || currentNote === (dayNotes.get(filterDate) || '')}
                className="w-full px-4 py-2 bg-viva-blue text-white text-sm font-medium rounded-lg hover:bg-viva-blue-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingNote ? 'Salvando...' : 'Salvar Observação'}
              </button>
            </div>
          )}
          
          </div>
          {/* Fim do Container Calendário + Observações */}

          {/* Filtrar barcos pela data selecionada */}
          {(() => {

            if (filteredBoats.length === 0) {
              return (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-slate-400" size={32} />
                  </div>
                  <p className="text-slate-700 font-semibold mb-1">
                    {filterDate 
                      ? `Nenhum barco para ${formatDate(filterDate)}`
                      : 'Nenhum barco encontrado'
                    }
                  </p>
                  <p className="text-sm text-slate-500">
                    Selecione outra data ou crie um novo barco
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBoats.filter(b => b.status === 'active').map((boat) => (
              <div key={boat.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
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
                  
                  {/* Vagas por tipo de serviço - apenas para escunas */}
                  {boat.boatType === 'escuna' && boat.seatsWithLanding !== undefined && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">🏝️ Com Desembarque:</span>
                        <span className={`font-bold ${
                          (boat.seatsWithLandingTaken || 0) >= (boat.seatsWithLanding || 0) 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {boat.seatsWithLandingTaken || 0} / {boat.seatsWithLanding || 0}
                          <span className="text-gray-500 font-normal ml-1">
                            ({(boat.seatsWithLanding || 0) - (boat.seatsWithLandingTaken || 0)} livres)
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">🚤 Panorâmico:</span>
                        <span className={`font-bold ${
                          (boat.seatsWithoutLandingTaken || 0) >= (boat.seatsWithoutLanding || 0) 
                            ? 'text-red-600' 
                            : 'text-blue-600'
                        }`}>
                          {boat.seatsWithoutLandingTaken || 0} / {boat.seatsWithoutLanding || 0}
                          <span className="text-gray-500 font-normal ml-1">
                            ({(boat.seatsWithoutLanding || 0) - (boat.seatsWithoutLandingTaken || 0)} livres)
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Mensagem para barcos antigos sem divisão */}
                  {boat.boatType === 'escuna' && boat.seatsWithLanding === undefined && (
                    <p className="text-xs text-gray-400 mt-2 italic">
                      Barco sem divisão de vagas por tipo
                    </p>
                  )}
                  
                  {/* Vagas disponíveis geral */}
                  {boat.boatType !== 'escuna' && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      {boat.seatsTotal - boat.seatsTaken} vagas disponíveis
                    </p>
                  )}
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
                  <button
                    onClick={() => handleEditPrice(boat)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-viva-yellow/10 text-viva-orange border border-viva-orange/30 rounded-lg hover:bg-viva-yellow/20 transition text-sm font-medium"
                    title="Editar Valor do Barco"
                  >
                    <DollarSign size={16} />
                    Editar Valor (R${boat.ticketPrice})
                  </button>
                  <button
                    onClick={() => handleToggleBoatStatus(boat)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    title="Desativar Barco"
                  >
                    <Power size={16} />
                    Desativar
                  </button>
                </div>
              </div>
                ))}
              </div>
            );
          })()}
          
          {/* Barcos Desativados */}
          {(() => {
            const inactiveBoatsForDate = boats.filter(boat => {
              const boatDate = new Date(boat.date).toISOString().split('T')[0];
              return boatDate === filterDate && boat.status === 'inactive';
            });
            
            if (inactiveBoatsForDate.length === 0) return null;
            
            return (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Power size={16} />
                  Barcos Desativados ({inactiveBoatsForDate.length})
                </h3>
                <div className="space-y-2">
                  {inactiveBoatsForDate.map((boat) => (
                    <div key={boat.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">{boat.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {boat.seatsTaken}/{boat.seatsTotal} vagas
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleBoatStatus(boat)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition flex items-center gap-1"
                      >
                        <Power size={14} />
                        Reativar
                      </button>
                    </div>
                  ))}
                </div>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Número Total de Vagas *</label>
                <input
                  type="number"
                  value={seatsTotal}
                  onChange={(e) => {
                    const total = Number(e.target.value);
                    setSeatsTotal(total);
                    // Atualizar automaticamente a divisão de vagas
                    if (boatType === 'escuna') {
                      const withLanding = Math.round(total * 0.25); // 25% com desembarque
                      setSeatsWithLanding(withLanding);
                      setSeatsWithoutLanding(total - withLanding);
                    }
                  }}
                  required
                  min={1}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base"
                />
              </div>

              {/* Vagas por tipo de serviço - apenas para Escuna */}
              {boatType === 'escuna' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    🏝️ Distribuição de Vagas por Tipo de Serviço
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">
                        Com Desembarque
                      </label>
                      <input
                        type="number"
                        value={seatsWithLanding}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSeatsWithLanding(val);
                          setSeatsWithoutLanding(seatsTotal - val);
                        }}
                        min={0}
                        max={seatsTotal}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-base font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">
                        Sem Desembarque (Panorâmico)
                      </label>
                      <input
                        type="number"
                        value={seatsWithoutLanding}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSeatsWithoutLanding(val);
                          setSeatsWithLanding(seatsTotal - val);
                        }}
                        min={0}
                        max={seatsTotal}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-base font-semibold"
                      />
                    </div>
                  </div>
                  {seatsWithLanding + seatsWithoutLanding !== seatsTotal && (
                    <p className="text-xs text-red-600 font-semibold">
                      ⚠️ A soma ({seatsWithLanding + seatsWithoutLanding}) deve ser igual ao total ({seatsTotal})
                    </p>
                  )}
                </div>
              )}

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
          reservations={reservations.filter(r => r.boatId === selectedBoat.id && (r.status === 'approved' || r.status === 'cancelled' || r.status === 'no_show'))}
          allBoats={boats}
          onClose={() => setSelectedBoat(null)}
          onCancelReservation={handleRejectReservation}
          onSelectReservation={setSelectedReservation}
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

      {/* Modal de Editar Valor do Barco */}
      {showEditPriceModal && boatToEditPrice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-viva-blue-dark mb-4 flex items-center gap-2">
              <DollarSign className="text-viva-orange" size={28} />
              Editar Valor do Barco
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Barco:</strong> {boatToEditPrice.name}
              </p>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Data:</strong> {formatDate(boatToEditPrice.date)}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Valor atual:</strong> R$ {boatToEditPrice.ticketPrice.toFixed(2)}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💰 Novo Valor por Pessoa (Adulto)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                <input
                  type="number"
                  value={newTicketPrice}
                  onChange={(e) => setNewTicketPrice(e.target.value)}
                  placeholder="Ex: 200.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-orange focus:border-viva-orange outline-none text-lg font-bold"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Este valor será atualizado em todos os lugares do sistema automaticamente
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong className="flex items-center gap-1 mb-1">
                  <span className="text-yellow-600">⚠</span>
                  Atenção:
                </strong>
                O novo valor será aplicado para novas reservas. As reservas já existentes manterão o valor original.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditPriceModal(false);
                  setBoatToEditPrice(null);
                  setNewTicketPrice('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateBoatPrice}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-viva-orange to-viva-yellow text-white rounded-lg font-bold hover:shadow-lg transition"
              >
                Atualizar Valor
              </button>
            </div>
          </div>
        </div>
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
  allBoats,
  onClose,
  onCancelReservation,
  onSelectReservation,
}: {
  boat: Boat;
  reservations: Reservation[];
  allBoats: Boat[];
  onClose: () => void;
  onCancelReservation: (reservationId: string) => void;
  onSelectReservation: (reservation: Reservation) => void;
}) {
  const [showInactive, setShowInactive] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [reservationToMove, setReservationToMove] = useState<Reservation | null>(null);
  
  const activeReservations = reservations.filter(r => r.status === 'approved');
  const inactiveReservations = reservations.filter(r => r.status === 'cancelled' || r.status === 'no_show');
  
  const availableSeats = boat.seatsTotal - boat.seatsTaken;
  const occupancyPercent = Math.round((boat.seatsTaken / boat.seatsTotal) * 100);

  // Função para baixar CSV
  const downloadCSV = () => {
    const headers = ['#', 'Nome', 'Telefone', 'WhatsApp', 'Email', 'Documento', 'Endereço', 'Valor Total', 'Pago', 'Pendente', 'Forma Pagamento', 'Tipo Passeio'];
    const rows = sortedReservations.map((r, index) => [
      index + 1,
      r.customerName || '',
      r.phone || '',
      r.whatsapp || '',
      r.email || '',
      r.document || '',
      r.address || '',
      r.totalAmount.toFixed(2),
      r.amountPaid.toFixed(2),
      r.amountDue.toFixed(2),
      r.paymentMethod.toUpperCase(),
      r.escunaType === 'com-desembarque' ? 'Com Desembarque' : 'Sem Desembarque'
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservas_${boat.name}_${formatDate(boat.date)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Criar mapa de cores para grupos
  const groupColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let colorIndex = 0;
    
    activeReservations.forEach(r => {
      if (r.groupId && !map.has(r.groupId)) {
        map.set(r.groupId, colorIndex);
        colorIndex++;
      }
    });
    
    return map;
  }, [activeReservations]);

  // Contar membros de cada grupo
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activeReservations.forEach(r => {
      if (r.groupId) {
        counts.set(r.groupId, (counts.get(r.groupId) || 0) + 1);
      }
    });
    return counts;
  }, [activeReservations]);

  // Contar quantos grupos existem
  const totalGroups = groupColorMap.size;

  // Ordenar reservas para manter grupos juntos
  const sortedReservations = useMemo(() => {
    return [...activeReservations].sort((a, b) => {
      // Primeiro: reservas com grupo vêm antes
      if (a.groupId && !b.groupId) return -1;
      if (!a.groupId && b.groupId) return 1;
      
      // Se ambos têm grupo, agrupa pelo groupId
      if (a.groupId && b.groupId) {
        if (a.groupId < b.groupId) return -1;
        if (a.groupId > b.groupId) return 1;
      }
      
      // Dentro do mesmo grupo ou sem grupo, mantém ordem original
      return 0;
    });
  }, [activeReservations]);

  // Função para marcar como não compareceu
  const handleMarkNoShow = async (reservation: Reservation) => {
    const reason = prompt(`${reservation.customerName} não compareceu?\n\nDigite o motivo (opcional):`);
    if (reason === null) return; // Cancelou
    
    try {
      await updateDoc(doc(db, 'reservations', reservation.id), {
        status: 'no_show',
        noShowReason: reason || 'Não compareceu',
        updatedAt: Timestamp.now(),
      });
      
      // Decrementar vagas do barco
      const boatRef = doc(db, 'boats', reservation.boatId);
      const boatDoc = await getDoc(boatRef);
      if (boatDoc.exists()) {
        const boatData = boatDoc.data() as Boat;
        const updateData: Record<string, unknown> = {
          seatsTaken: Math.max(0, (boatData.seatsTaken || 0) - 1),
          updatedAt: Timestamp.now(),
        };
        
        // Atualizar contadores por tipo
        if (boatData.boatType === 'escuna' && boatData.seatsWithLanding !== undefined) {
          if (reservation.escunaType === 'com-desembarque') {
            updateData.seatsWithLandingTaken = Math.max(0, (boatData.seatsWithLandingTaken || 0) - 1);
          } else {
            updateData.seatsWithoutLandingTaken = Math.max(0, (boatData.seatsWithoutLandingTaken || 0) - 1);
          }
        }
        
        await updateDoc(boatRef, updateData);
      }
      
      alert(`${reservation.customerName} foi marcado como "Não Compareceu"`);
    } catch (error) {
      console.error('Erro ao marcar não comparecimento:', error);
      alert('Erro ao atualizar. Tente novamente.');
    }
  };

  // Calcular totais financeiros
  const totalReceita = activeReservations.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalRecebido = activeReservations.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalPendente = activeReservations.reduce((sum, r) => sum + r.amountDue, 0);

  // Cores simples para tags de grupo
  const groupTagColors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-indigo-100 text-indigo-700',
  ];
  
  const getGroupTagColor = (groupId: string | undefined) => {
    if (!groupId) return '';
    const index = Array.from(groupColorMap.keys()).indexOf(groupId);
    return groupTagColors[index % groupTagColors.length];
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden flex flex-col">
      {/* Header Fixo */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">{boat.name}</h1>
              <p className="text-xs sm:text-sm text-gray-500">{formatDate(boat.date)} • {boat.seatsTaken}/{boat.seatsTotal} passageiros</p>
            </div>
            <div className="flex gap-2">
              {activeReservations.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-600 transition"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Baixar Lista</span>
                  <span className="sm:hidden">CSV</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-2 bg-viva-blue text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-viva-blue-dark transition"
              >
                Fechar
              </button>
            </div>
          </div>
          
          {/* Resumo Simples */}
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <span className="text-gray-500">Ocupação: </span>
              <span className="font-semibold text-gray-900">{occupancyPercent}%</span>
            </div>
            <div>
              <span className="text-gray-500">Vagas livres: </span>
              <span className="font-semibold text-gray-900">{availableSeats}</span>
            </div>
            {totalGroups > 0 && (
              <div>
                <span className="text-gray-500">Grupos: </span>
                <span className="font-semibold text-gray-900">{totalGroups}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          
          {/* Lista de Passageiros */}
          {activeReservations.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Lista de Passageiros ({activeReservations.length})
                </h2>
              </div>
              
              {/* Versão Mobile - Cards */}
              <div className="md:hidden space-y-3">
                {sortedReservations.map((reservation, index) => {
                  const groupSize = reservation.groupId ? groupCounts.get(reservation.groupId) || 0 : 0;
                  const isGroupMember = groupSize > 1;
                  const groupTagColor = getGroupTagColor(reservation.groupId);
                  
                  return (
                    <div key={reservation.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                            <h3 className="text-base font-bold text-gray-900">{reservation.customerName || 'Sem nome'}</h3>
                            {isGroupMember && (
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full ${groupTagColor}`}>
                                G{groupSize}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">📞 {reservation.phone || '-'}</p>
                          {reservation.email && (
                            <p className="text-xs text-gray-500">✉️ {reservation.email}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 mb-0.5">Valor Total</p>
                          <p className="text-sm font-bold text-gray-900">R$ {reservation.totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 mb-0.5">Status</p>
                          {reservation.amountDue > 0 ? (
                            <p className="text-sm font-bold text-amber-600">Falta R$ {reservation.amountDue.toFixed(2)}</p>
                          ) : (
                            <p className="text-sm font-bold text-green-600">✓ Pago</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setReservationToMove(reservation);
                            setShowMoveModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                        >
                          <Edit2 size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Cancelar reserva de ${reservation.customerName}?`)) {
                              onCancelReservation(reservation.id);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        >
                          <Trash2 size={14} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Versão Desktop - Tabela */}
              <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">#</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Passageiro</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Contato</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Valor</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedReservations.map((reservation, index) => {
                      const groupSize = reservation.groupId ? groupCounts.get(reservation.groupId) || 0 : 0;
                      const isGroupMember = groupSize > 1;
                      const groupTagColor = getGroupTagColor(reservation.groupId);
                      
                      return (
                        <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">{reservation.customerName || 'Sem nome'}</p>
                                  {isGroupMember && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${groupTagColor}`}>
                                      G{groupSize}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 sm:hidden">{reservation.phone || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                            {reservation.phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="text-sm font-medium text-gray-900">R$ {reservation.totalAmount.toFixed(2)}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {reservation.amountDue > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700">
                                Falta R$ {reservation.amountDue.toFixed(2)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
                                Pago
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setReservationToMove(reservation);
                                  setShowMoveModal(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Cancelar reserva de ${reservation.customerName}?`)) {
                                    onCancelReservation(reservation.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Cancelar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumo Financeiro */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Total: </span>
                    <span className="font-semibold text-gray-900">R$ {totalReceita.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Recebido: </span>
                    <span className="font-semibold text-green-600">R$ {totalRecebido.toFixed(2)}</span>
                  </div>
                  {totalPendente > 0 && (
                    <div>
                      <span className="text-gray-500">Pendente: </span>
                      <span className="font-semibold text-amber-600">R$ {totalPendente.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">Nenhum passageiro confirmado</p>
              <p className="text-sm text-gray-400 mt-1">As reservas aprovadas aparecerão aqui</p>
            </div>
          )}

          {/* Reservas Inativas */}
          {inactiveReservations.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <span>{showInactive ? '▼' : '▶'}</span>
                <span>Reservas canceladas ({inactiveReservations.length})</span>
              </button>
              
              {showInactive && (
                <div className="mt-3 space-y-2">
                  {inactiveReservations.map((reservation) => (
                    <div key={reservation.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                      <div>
                        <span className="text-gray-600">{reservation.customerName}</span>
                        <span className="text-gray-400 ml-2">
                          {reservation.status === 'no_show' ? '(não compareceu)' : '(cancelado)'}
                        </span>
                      </div>
                      <span className="text-gray-400 line-through">R$ {reservation.totalAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal para Editar Reserva */}
      {showMoveModal && reservationToMove && (
        <MoveReservationModal
          reservation={reservationToMove}
          currentBoat={boat}
          boats={allBoats.filter(b => b.status === 'active')}
          onClose={() => {
            setShowMoveModal(false);
            setReservationToMove(null);
          }}
        />
      )}
    </div>
  );
}

// Modal para editar reserva e mover para outro barco
function MoveReservationModal({
  reservation,
  currentBoat,
  boats,
  onClose,
}: {
  reservation: Reservation;
  currentBoat: Boat;
  boats: Boat[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'dados' | 'mover'>('dados');
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados de edição dos dados
  const [editName, setEditName] = useState(reservation.customerName || '');
  const [editPhone, setEditPhone] = useState(reservation.phone || '');
  const [editWhatsapp, setEditWhatsapp] = useState(reservation.whatsapp || '');
  const [editDocument, setEditDocument] = useState(reservation.document || '');
  const [editBirthDate, setEditBirthDate] = useState(reservation.birthDate || '');
  const [editEmail, setEditEmail] = useState(reservation.email || '');
  const [editAddress, setEditAddress] = useState(reservation.address || '');
  const [editTotalAmount, setEditTotalAmount] = useState(reservation.totalAmount.toString());
  const [editAmountPaid, setEditAmountPaid] = useState(reservation.amountPaid.toString());
  const [editPaymentMethod, setEditPaymentMethod] = useState(reservation.paymentMethod || 'pix');
  const [editEscunaType, setEditEscunaType] = useState(reservation.escunaType || 'sem-desembarque');
  const [editIsChild, setEditIsChild] = useState(reservation.isChild || false);
  const [editIsHalfPrice, setEditIsHalfPrice] = useState(reservation.isHalfPrice || false);
  
  const selectedBoat = boats.find(b => b.id === selectedBoatId);
  
  // Filtrar barcos disponíveis (excluir o atual e barcos lotados)
  const availableBoats = boats.filter(b => {
    if (b.id === currentBoat.id) return false;
    const hasSpace = b.seatsTaken < b.seatsTotal;
    // Se for escuna, verificar vagas por tipo
    if (b.boatType === 'escuna' && b.seatsWithLanding !== undefined) {
      if (reservation.escunaType === 'com-desembarque') {
        return (b.seatsWithLandingTaken || 0) < (b.seatsWithLanding || 0);
      } else {
        return (b.seatsWithoutLandingTaken || 0) < (b.seatsWithoutLanding || 0);
      }
    }
    return hasSpace;
  });

  // Salvar edição dos dados
  const handleSaveData = async () => {
    setLoading(true);
    try {
      const totalAmount = parseFloat(editTotalAmount) || 0;
      const amountPaidValue = parseFloat(editAmountPaid) || 0;
      const amountDue = totalAmount - amountPaidValue;

      await updateDoc(doc(db, 'reservations', reservation.id), {
        customerName: editName,
        phone: editPhone,
        whatsapp: editWhatsapp || editPhone,
        document: editDocument,
        birthDate: editBirthDate,
        email: editEmail,
        address: editAddress,
        totalAmount,
        amountPaid: amountPaidValue,
        amountDue: Math.max(0, amountDue),
        paymentMethod: editPaymentMethod,
        escunaType: currentBoat.boatType === 'escuna' ? editEscunaType : undefined,
        isChild: editIsChild,
        isHalfPrice: editIsHalfPrice,
        updatedAt: Timestamp.now(),
      });
      
      alert('✅ Dados atualizados com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleMove = async () => {
    if (!selectedBoatId || !selectedBoat) {
      alert('Selecione um barco');
      return;
    }
    
    setLoading(true);
    try {
      // Atualizar reserva para o novo barco
      await updateDoc(doc(db, 'reservations', reservation.id), {
        boatId: selectedBoatId,
        rideDate: selectedBoat.date,
        updatedAt: Timestamp.now(),
      });
      
      // Decrementar vagas do barco antigo
      const oldBoatRef = doc(db, 'boats', currentBoat.id);
      const oldBoatUpdateData: Record<string, unknown> = {
        seatsTaken: Math.max(0, currentBoat.seatsTaken - 1),
        updatedAt: Timestamp.now(),
      };
      
      if (currentBoat.boatType === 'escuna' && currentBoat.seatsWithLanding !== undefined) {
        if (reservation.escunaType === 'com-desembarque') {
          oldBoatUpdateData.seatsWithLandingTaken = Math.max(0, (currentBoat.seatsWithLandingTaken || 0) - 1);
        } else {
          oldBoatUpdateData.seatsWithoutLandingTaken = Math.max(0, (currentBoat.seatsWithoutLandingTaken || 0) - 1);
        }
      }
      
      await updateDoc(oldBoatRef, oldBoatUpdateData);
      
      // Incrementar vagas do novo barco
      const newBoatRef = doc(db, 'boats', selectedBoatId);
      const newBoatDoc = await getDoc(newBoatRef);
      if (newBoatDoc.exists()) {
        const newBoatData = newBoatDoc.data() as Boat;
        const newBoatUpdateData: Record<string, unknown> = {
          seatsTaken: (newBoatData.seatsTaken || 0) + 1,
          updatedAt: Timestamp.now(),
        };
        
        if (newBoatData.boatType === 'escuna' && newBoatData.seatsWithLanding !== undefined) {
          if (reservation.escunaType === 'com-desembarque') {
            newBoatUpdateData.seatsWithLandingTaken = (newBoatData.seatsWithLandingTaken || 0) + 1;
          } else {
            newBoatUpdateData.seatsWithoutLandingTaken = (newBoatData.seatsWithoutLandingTaken || 0) + 1;
          }
        }
        
        await updateDoc(newBoatRef, newBoatUpdateData);
      }
      
      alert(`${reservation.customerName} foi movido para ${selectedBoat.name}!`);
      onClose();
    } catch (error) {
      console.error('Erro ao mover reserva:', error);
      alert('Erro ao mover reserva. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Editar Reserva</h3>
            <p className="text-sm text-gray-500">{reservation.customerName || 'Cliente'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5">
          {/* Tabs */}
          <div className="flex gap-4 mb-5 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('dados')}
              className={`pb-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === 'dados'
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Dados
            </button>
            <button
              onClick={() => setActiveTab('mover')}
              className={`pb-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === 'mover'
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Mover de Barco
            </button>
          </div>

          {/* Tab: Editar Dados */}
          {activeTab === 'dados' && (
            <div className="space-y-4">
              {/* Dados Pessoais */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Documento</label>
                    <input
                      type="text"
                      value={editDocument}
                      onChange={(e) => setEditDocument(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                      placeholder="CPF/RG"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nascimento</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      value={editBirthDate}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                        if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
                        value = value.slice(0, 10);
                        setEditBirthDate(value);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                      placeholder="(48) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
                    <input
                      type="tel"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                      placeholder="(48) 99999-9999"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                      placeholder="Rua, número, bairro..."
                    />
                  </div>
                </div>
              </div>

              {/* Valores e Pagamento */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-3">Pagamento</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total</label>
                    <input
                      type="number"
                      value={editTotalAmount}
                      onChange={(e) => setEditTotalAmount(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pago</label>
                    <input
                      type="number"
                      value={editAmountPaid}
                      onChange={(e) => setEditAmountPaid(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Forma</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as 'pix' | 'cartao' | 'dinheiro')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                    >
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>
                {(parseFloat(editTotalAmount) - parseFloat(editAmountPaid)) > 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Restante: R$ {Math.max(0, (parseFloat(editTotalAmount) || 0) - (parseFloat(editAmountPaid) || 0)).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Tipo de Passeio (para escunas) */}
              {currentBoat.boatType === 'escuna' && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-3">Tipo de Passeio</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditEscunaType('sem-desembarque')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${
                        editEscunaType === 'sem-desembarque'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Panorâmico
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditEscunaType('com-desembarque')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${
                        editEscunaType === 'com-desembarque'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Com Desembarque
                    </button>
                  </div>
                </div>
              )}

              {/* Opções Especiais */}
              <div className="pt-3 border-t border-gray-100 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsChild}
                    onChange={(e) => setEditIsChild(e.target.checked)}
                    className="w-4 h-4 text-gray-900 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Criança</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsHalfPrice}
                    onChange={(e) => setEditIsHalfPrice(e.target.checked)}
                    className="w-4 h-4 text-gray-900 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Meia entrada</span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveData}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Mover de Barco */}
          {activeTab === 'mover' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Selecionar Novo Barco
                </label>
                {availableBoats.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    Não há barcos com vagas disponíveis.
                  </p>
                ) : (
                  <select
                    value={selectedBoatId}
                    onChange={(e) => setSelectedBoatId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                  >
                    <option value="">Selecione um barco...</option>
                    {availableBoats.map(boat => {
                      const vagasDisponiveis = boat.seatsTotal - boat.seatsTaken;
                      return (
                        <option key={boat.id} value={boat.id}>
                          {boat.name} - {formatDate(boat.date)} ({vagasDisponiveis} vagas)
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              
              {selectedBoat && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500">Novo destino:</p>
                  <p className="font-medium text-gray-900">{selectedBoat.name}</p>
                  <p className="text-gray-500">{formatDate(selectedBoat.date)}</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMove}
                  disabled={loading || !selectedBoatId}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {loading ? 'Movendo...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados de edição
  const [editName, setEditName] = useState(reservation.customerName || '');
  const [editPhone, setEditPhone] = useState(reservation.phone || '');
  const [editWhatsapp, setEditWhatsapp] = useState(reservation.whatsapp || '');
  const [editDocument, setEditDocument] = useState(reservation.document || '');
  const [editBirthDate, setEditBirthDate] = useState(reservation.birthDate || '');
  const [editEmail, setEditEmail] = useState(reservation.email || '');
  const [editAddress, setEditAddress] = useState(reservation.address || '');
  const [editTotalAmount, setEditTotalAmount] = useState(reservation.totalAmount.toString());
  const [editAmountPaid, setEditAmountPaid] = useState(reservation.amountPaid.toString());
  const [editPaymentMethod, setEditPaymentMethod] = useState(reservation.paymentMethod || 'pix');
  const [editEscunaType, setEditEscunaType] = useState(reservation.escunaType || 'sem-desembarque');
  const [editIsChild, setEditIsChild] = useState(reservation.isChild || false);
  const [editIsHalfPrice, setEditIsHalfPrice] = useState(reservation.isHalfPrice || false);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const totalAmount = parseFloat(editTotalAmount) || 0;
      const amountPaidValue = parseFloat(editAmountPaid) || 0;
      const amountDue = totalAmount - amountPaidValue;

      await updateDoc(doc(db, 'reservations', reservation.id), {
        customerName: editName,
        phone: editPhone,
        whatsapp: editWhatsapp || editPhone,
        document: editDocument,
        birthDate: editBirthDate,
        email: editEmail,
        address: editAddress,
        totalAmount,
        amountPaid: amountPaidValue,
        amountDue: Math.max(0, amountDue),
        paymentMethod: editPaymentMethod,
        escunaType: boat.boatType === 'escuna' ? editEscunaType : undefined,
        isChild: editIsChild,
        isHalfPrice: editIsHalfPrice,
        updatedAt: Timestamp.now(),
      });
      
      setIsEditing(false);
      alert('✅ Reserva atualizada com sucesso!');
      onClose(); // Fechar para atualizar os dados
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Restaurar valores originais
    setEditName(reservation.customerName || '');
    setEditPhone(reservation.phone || '');
    setEditWhatsapp(reservation.whatsapp || '');
    setEditDocument(reservation.document || '');
    setEditBirthDate(reservation.birthDate || '');
    setEditEmail(reservation.email || '');
    setEditAddress(reservation.address || '');
    setEditTotalAmount(reservation.totalAmount.toString());
    setEditAmountPaid(reservation.amountPaid.toString());
    setEditPaymentMethod(reservation.paymentMethod || 'pix');
    setEditEscunaType(reservation.escunaType || 'sem-desembarque');
    setEditIsChild(reservation.isChild || false);
    setEditIsHalfPrice(reservation.isHalfPrice || false);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-viva-blue-dark">
            {isEditing ? '✏️ Editar Reserva' : 'Detalhes da Reserva'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition"
                title="Editar reserva"
              >
                <Edit2 size={20} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <XCircle size={24} className="text-gray-400" />
            </button>
          </div>
        </div>

        {isEditing ? (
          /* MODO EDIÇÃO */
          <div className="space-y-4">
            {/* Dados Pessoais */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <User size={18} /> Dados do Cliente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Documento (CPF/RG)</label>
                  <input
                    type="text"
                    value={editDocument}
                    onChange={(e) => setEditDocument(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="(48) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="(48) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data de Nascimento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={editBirthDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                      if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
                      value = value.slice(0, 10);
                      setEditBirthDate(value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="Rua, número, bairro, cidade..."
                  />
                </div>
              </div>
            </div>

            {/* Valores e Pagamento */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <DollarSign size={18} /> Valores e Pagamento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={editTotalAmount}
                    onChange={(e) => setEditTotalAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm font-bold"
                    placeholder="200.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Pago (R$)</label>
                  <input
                    type="number"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de Pagamento</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as 'pix' | 'cartao' | 'dinheiro')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  >
                    <option value="pix">💠 PIX</option>
                    <option value="cartao">💳 Cartão</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 p-2 bg-white rounded-lg text-center">
                <span className="text-sm text-gray-600">Valor Restante: </span>
                <span className={`font-bold ${(parseFloat(editTotalAmount) - parseFloat(editAmountPaid)) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  R$ {Math.max(0, (parseFloat(editTotalAmount) || 0) - (parseFloat(editAmountPaid) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tipo de Passeio (para escunas) */}
            {boat.boatType === 'escuna' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                  <Users size={18} /> Tipo de Passeio
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditEscunaType('sem-desembarque')}
                    className={`px-4 py-3 rounded-xl font-bold transition text-sm ${
                      editEscunaType === 'sem-desembarque'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    🚤 Panorâmico
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditEscunaType('com-desembarque')}
                    className={`px-4 py-3 rounded-xl font-bold transition text-sm ${
                      editEscunaType === 'com-desembarque'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    🏝️ Com Desembarque
                  </button>
                </div>
              </div>
            )}

            {/* Opções Especiais */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-3">⭐ Opções Especiais</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsChild}
                    onChange={(e) => setEditIsChild(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <span className="font-semibold text-gray-700">👶 É criança (menor de 7 anos)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsHalfPrice}
                    onChange={(e) => setEditIsHalfPrice(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="font-semibold text-gray-700">🎫 Meia entrada</span>
                </label>
              </div>
            </div>

            {/* Botões de Ação (Edição) */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* MODO VISUALIZAÇÃO */
          <>
            {/* Card do Cliente */}
            <div className="bg-gradient-to-r from-viva-blue to-viva-blue-dark rounded-lg p-4 mb-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs mb-1">Cliente</p>
                  <p className="font-bold text-lg sm:text-xl truncate">{reservation.customerName || 'Não informado'}</p>
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
              {reservation.document && (
                <p className="text-white/70 text-sm mt-2">📄 Doc: {reservation.document}</p>
              )}
              {reservation.email && (
                <p className="text-white/70 text-sm">📧 {reservation.email}</p>
              )}
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
              {reservation.birthDate && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-500 mb-1">🎂 Nascimento</p>
                  <p className="font-bold text-sm sm:text-base text-gray-800">{formatDate(reservation.birthDate)}</p>
                </div>
              )}
              {reservation.escunaType && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Users size={14} className="text-gray-400" />
                    Tipo de Passeio
                  </p>
                  <p className="font-bold text-sm sm:text-base text-gray-800">
                    {reservation.escunaType === 'com-desembarque' ? '🏝️ Com Desembarque' : '🚤 Panorâmico'}
                  </p>
                </div>
              )}
              {reservation.address && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 col-span-2">
                  <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <MapPin size={14} className="text-gray-400" />
                    Endereço
                  </p>
                  <p className="font-bold text-sm sm:text-base text-gray-800">{reservation.address}</p>
                </div>
              )}
            </div>

            {/* Tags especiais */}
            {(reservation.isChild || reservation.isHalfPrice) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {reservation.isChild && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                    👶 Criança
                  </span>
                )}
                {reservation.isHalfPrice && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                    🎫 Meia Entrada
                  </span>
                )}
              </div>
            )}

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

            {/* Botões de Ação */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-3 pt-2">
              {reservation.status === 'pending' ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full sm:flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} />
                    Editar Dados
                  </button>
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
                    className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2 text-base sm:text-lg"
                  >
                    <CheckCircle size={20} />
                    Aprovar
                  </button>
                  <button
                    onClick={() => onReject(reservation.id)}
                    className="w-full sm:flex-1 px-4 sm:px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Recusar
                  </button>
                </>
              ) : reservation.status === 'approved' ? (
                <>
                  {/* Botão Editar */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full sm:flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} />
                    Editar Dados
                  </button>
                  {/* Links para enviar ao cliente */}
                  <div className="w-full grid grid-cols-2 gap-2 mb-2 sm:mb-0">
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/confirmacao/${reservation.id}`;
                        navigator.clipboard.writeText(link);
                        alert('✅ Link de CONFIRMAÇÃO copiado!\n\nEnvie para o cliente com as instruções do passeio.');
                      }}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition flex items-center justify-center gap-1 text-sm"
                      title="Copiar link com instruções do passeio"
                    >
                      📋 Confirmação
                    </button>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/aceite/${reservation.id}`;
                        navigator.clipboard.writeText(link);
                        alert('✅ Link de ACEITE + VOUCHER copiado!\n\nEnvie para o cliente aceitar os termos e receber o voucher.');
                      }}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 transition flex items-center justify-center gap-1 text-sm"
                      title="Copiar link de aceite de termos e voucher"
                    >
                      📜 Aceite/Voucher
                    </button>
                  </div>
                  <button
                    onClick={() => setShowReallocationModal(true)}
                    className="w-full sm:flex-1 px-4 sm:px-6 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition flex items-center justify-center gap-2"
                  >
                    🔄 Realocar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full sm:flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} />
                    Editar Dados
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full sm:flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </>
        )}
        
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
  originalAmount: number; // valor original antes de desconto
  paymentMethod: PaymentMethod;
  amountPaid: number;
  bankId?: string;
  bankName?: string;
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
  const [banks, setBanks] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [people, setPeople] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [escunaType, setEscunaType] = useState<'sem-desembarque' | 'com-desembarque'>('sem-desembarque');
  const [baseTicketPrice, setBaseTicketPrice] = useState(200); // Preço base do ingresso

  // Calcular total de passos: 1 (data/vendedor) + 1 (qtd pessoas) + numberOfPeople (dados) + 1 (pagamento)
  const totalSteps = 3 + numberOfPeople;
  
  // Carregar vendedores e bancos
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
    
    const loadBanks = async () => {
      try {
        const configSnapshot = await getDocs(collection(db, 'siteConfig'));
        if (configSnapshot.docs.length > 0) {
          const configData = configSnapshot.docs[0].data();
          const activeBanks = (configData.banks || []).filter((b: { isActive: boolean }) => b.isActive);
          setBanks(activeBanks);
        }
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
      }
    };
    
    loadVendors();
    loadBanks();
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

  // Atualizar preço base quando barco é selecionado
  useEffect(() => {
    if (selectedBoat?.ticketPrice) {
      setBaseTicketPrice(selectedBoat.ticketPrice);
    }
  }, [selectedBoat]);

  // Inicializar array de pessoas quando mudar a quantidade
  useEffect(() => {
    const price = selectedBoat?.ticketPrice || baseTicketPrice;
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
        amount: price,
        originalAmount: price,
        paymentMethod: 'pix',
        amountPaid: 0,
        bankId: '',
        bankName: '',
      });
    }
    setPeople(newPeople);
  }, [numberOfPeople, baseTicketPrice]);

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
      // Primeiro do grupo (responsável): Nome, Telefone, Documento, Data de Nascimento obrigatórios
      if (personIndex === 0) {
        return person && person.name && person.phone && person.document && person.birthDate;
      }
      // Demais pessoas: Nome, Documento, Data de Nascimento obrigatórios (telefone opcional)
      return person && person.name && person.document && person.birthDate;
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

    // Verificar se há vagas suficientes (geral)
    const vagasDisponiveis = selectedBoat.seatsTotal - selectedBoat.seatsTaken;
    if (numberOfPeople > vagasDisponiveis) {
      setError(`Não há vagas suficientes. Disponíveis: ${vagasDisponiveis}`);
      return;
    }

    // Verificar vagas por tipo de serviço (para escunas)
    if (selectedBoat.boatType === 'escuna' && selectedBoat.seatsWithLanding !== undefined) {
      if (escunaType === 'com-desembarque') {
        const vagasDesembarque = (selectedBoat.seatsWithLanding || 0) - (selectedBoat.seatsWithLandingTaken || 0);
        if (numberOfPeople > vagasDesembarque) {
          setError(`Não há vagas COM DESEMBARQUE suficientes. Disponíveis: ${vagasDesembarque}`);
          return;
        }
      } else {
        const vagasPanoramico = (selectedBoat.seatsWithoutLanding || 0) - (selectedBoat.seatsWithoutLandingTaken || 0);
        if (numberOfPeople > vagasPanoramico) {
          setError(`Não há vagas PANORÂMICAS suficientes. Disponíveis: ${vagasPanoramico}`);
          return;
        }
      }
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

        // Adicionar banco se selecionado
        if (person.bankId) {
          reservationData.bankId = person.bankId;
          reservationData.bankName = person.bankName;
        }

        if (groupId) {
          reservationData.groupId = groupId;
          // Primeiro do grupo é o responsável/líder
          reservationData.isGroupLeader = index === 0;
        }
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
                    {(() => {
                      const vagasPanoramico = selectedBoat.seatsWithLanding !== undefined
                        ? (selectedBoat.seatsWithoutLanding || 0) - (selectedBoat.seatsWithoutLandingTaken || 0)
                        : selectedBoat.seatsTotal - selectedBoat.seatsTaken;
                      const vagasDesembarque = selectedBoat.seatsWithLanding !== undefined
                        ? (selectedBoat.seatsWithLanding || 0) - (selectedBoat.seatsWithLandingTaken || 0)
                        : selectedBoat.seatsTotal - selectedBoat.seatsTaken;
                      
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setEscunaType('sem-desembarque')}
                            disabled={vagasPanoramico <= 0}
                            className={`px-4 py-3 rounded-lg font-bold transition ${
                              escunaType === 'sem-desembarque'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : vagasPanoramico <= 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <div>🚤 Panorâmico</div>
                            <div className={`text-xs mt-1 ${
                              escunaType === 'sem-desembarque' ? 'text-blue-100' : 
                              vagasPanoramico <= 0 ? 'text-red-400' : 'text-gray-500'
                            }`}>
                              {vagasPanoramico > 0 ? `${vagasPanoramico} vagas` : 'Esgotado'}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEscunaType('com-desembarque')}
                            disabled={vagasDesembarque <= 0}
                            className={`px-4 py-3 rounded-lg font-bold transition ${
                              escunaType === 'com-desembarque'
                                ? 'bg-green-600 text-white shadow-lg'
                                : vagasDesembarque <= 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <div>🏝️ Com Desembarque</div>
                            <div className={`text-xs mt-1 ${
                              escunaType === 'com-desembarque' ? 'text-green-100' : 
                              vagasDesembarque <= 0 ? 'text-red-400' : 'text-gray-500'
                            }`}>
                              {vagasDesembarque > 0 ? `${vagasDesembarque} vagas` : 'Esgotado'}
                            </div>
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

                    {/* Telefone - Único campo obrigatório para Admin */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-blue-800 mb-2">
                        <Phone className="inline w-4 h-4 mr-1" /> Telefone {personIndex === 0 ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(opcional)</span>}
                        {personIndex === 0 && numberOfPeople > 1 && (
                          <span className="text-xs text-blue-600 ml-2 font-normal">(Responsável do grupo)</span>
                        )}
                      </label>
                      <input
                        type="tel"
                        value={person.phone}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, phone: e.target.value };
                          setPeople(newPeople);
                        }}
                        required={personIndex === 0}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${personIndex === 0 ? 'border-2 border-blue-300 text-lg font-bold bg-white' : 'border border-gray-300'}`}
                        placeholder="(48) 99999-9999"
                      />
                      {personIndex === 0 && (
                        <p className="text-xs text-blue-600 mt-2">Obrigatorio para o responsavel do grupo</p>
                      )}
                    </div>

                    {/* Nome */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <User className="inline w-4 h-4 mr-1" /> Nome Completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={person.name}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, name: e.target.value };
                          setPeople(newPeople);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Nome completo do passageiro"
                      />
                    </div>

                    {/* Documento */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📄 Documento (CPF/RG) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={person.document}
                        onChange={(e) => {
                          const newPeople = [...people];
                          newPeople[personIndex] = { ...person, document: e.target.value };
                          setPeople(newPeople);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🎂 Data de Nascimento <span className="text-red-500">*</span>
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Mail className="inline w-4 h-4 mr-1" /> Email <span className="text-gray-400 font-normal">(opcional)</span>
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
                            const isChild = e.target.checked;
                            const price = selectedBoat?.ticketPrice || baseTicketPrice;
                            // Criança (menor de 7) paga metade
                            const newAmount = isChild ? price / 2 : (person.isHalfPrice ? price / 2 : price);
                            newPeople[personIndex] = { 
                              ...person, 
                              isChild,
                              amount: newAmount,
                              originalAmount: price
                            };
                            setPeople(newPeople);
                          }}
                          className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <label htmlFor={`child-${personIndex}`} className="font-semibold text-yellow-800 cursor-pointer">
                          👶 É criança (menor de 7 anos)? {person.isChild && <span className="text-green-600 ml-2">(Paga metade: R$ {(person.amount).toFixed(2)})</span>}
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`half-${personIndex}`}
                          checked={person.isHalfPrice}
                          onChange={(e) => {
                            const newPeople = [...people];
                            const isHalfPrice = e.target.checked;
                            const price = selectedBoat?.ticketPrice || baseTicketPrice;
                            // Meia entrada = metade do valor (exceto se já é criança que já paga metade)
                            const newAmount = (isHalfPrice || person.isChild) ? price / 2 : price;
                            newPeople[personIndex] = { 
                              ...person, 
                              isHalfPrice,
                              amount: newAmount,
                              originalAmount: price
                            };
                            setPeople(newPeople);
                          }}
                          className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor={`half-${personIndex}`} className="font-semibold text-orange-700 cursor-pointer">
                          🎫 Paga meia entrada? {person.isHalfPrice && !person.isChild && <span className="text-green-600 ml-2">(Paga metade: R$ {(person.amount).toFixed(2)})</span>}
                        </label>
                      </div>
                      {(person.isChild || person.isHalfPrice) && (
                        <div className="mt-3 pt-3 border-t border-yellow-300 text-sm">
                          <p className="text-yellow-800">
                            💰 Valor original: <span className="line-through">R$ {(selectedBoat?.ticketPrice || baseTicketPrice).toFixed(2)}</span>
                            <span className="text-green-700 font-bold ml-2">→ R$ {person.amount.toFixed(2)}</span>
                          </p>
                        </div>
                      )}
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
                      <div className="text-right">
                      <span className="font-bold text-green-700">R$ {person.amount.toFixed(2)}</span>
                        {(person.isChild || person.isHalfPrice) && (
                          <p className="text-xs text-orange-600">{person.isChild ? '👶 Criança' : '🎫 Meia'}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
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
                    
                    {/* Banco de Recebimento */}
                    {banks.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">🏦 Banco de Recebimento</label>
                        <select
                          value={person.bankId || ''}
                          onChange={(e) => {
                            const newPeople = [...people];
                            const bank = banks.find(b => b.id === e.target.value);
                            newPeople[index] = { 
                              ...person, 
                              bankId: e.target.value,
                              bankName: bank?.name || ''
                            };
                            setPeople(newPeople);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        >
                          <option value="">Selecione o banco...</option>
                          {banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>{bank.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
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

