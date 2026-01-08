'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation } from '@/types';
import { Bell, BellOff, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function GlobalNotification() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const previousPendingCountRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

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
      console.log('🔊 Áudio global desbloqueado!');
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
      
      console.log('🔔 Som de notificação tocado!');
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

  // Escutar por novas reservas pendentes
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const reservationsQuery = query(collection(db, 'reservations'));
    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Reservation[];
      
      // Contar reservas pendentes
      const pendingCount = reservationsData.filter(r => r.status === 'pending').length;
      
      // Verificar se há novas reservas pendentes
      if (previousPendingCountRef.current !== null && pendingCount > previousPendingCountRef.current) {
        const newCount = pendingCount - previousPendingCountRef.current;
        setNewOrderCount(newCount);
        setNewOrderAlert(true);
        playNotificationSound();
        
        // Tentar mostrar notificação do navegador também
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🛒 Nova Reserva!', {
            body: `Você tem ${newCount} nova(s) reserva(s) pendente(s)`,
            icon: '/favicon.ico',
            tag: 'new-reservation',
          });
        }
        
        // Manter o alerta por 15 segundos
        setTimeout(() => {
          setNewOrderAlert(false);
          setNewOrderCount(0);
        }, 15000);
      }
      
      previousPendingCountRef.current = pendingCount;
    });

    // Pedir permissão para notificações do navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => unsubscribe();
  }, [playNotificationSound]);

  return (
    <>
      {/* Alerta de nova reserva - aparece quando chega pedido novo */}
      {newOrderAlert && (
        <div className="fixed top-4 right-4 z-[100] animate-bounce-in">
          <Link 
            href="/admin"
            className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl"
          >
            <div className="relative">
              <ShoppingCart size={28} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
                {newOrderCount}
              </span>
            </div>
            <div>
              <p className="font-bold text-lg">Nova Reserva!</p>
              <p className="text-sm text-white/80">Clique para ver</p>
            </div>
          </Link>
        </div>
      )}

      {/* Botão flutuante de som - sempre visível no canto inferior */}
      <button
        onClick={toggleSound}
        className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all ${
          soundEnabled && audioUnlocked
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
        }`}
        title={soundEnabled ? 'Desativar notificações sonoras' : 'Ativar notificações sonoras'}
      >
        {soundEnabled && audioUnlocked ? <Bell size={20} /> : <BellOff size={20} />}
      </button>
    </>
  );
}

