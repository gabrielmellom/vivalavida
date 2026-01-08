'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function VoucherPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const processVoucher = async () => {
      // Aguardar o Firebase terminar de verificar autenticação
      if (authLoading) {
        return; // Vai rodar de novo quando authLoading mudar
      }

      if (!user) {
        // Salvar o ID do voucher no localStorage para redirecionar após login
        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingVoucherId', params.id as string);
        }
        setError('LOGIN_REQUIRED');
        setLoading(false);
        return;
      }

      const reservationId = params.id as string;
      
      if (!reservationId) {
        setError('ID do voucher inválido');
        setLoading(false);
        return;
      }

      try {
        // Buscar reserva
        const reservationDoc = await getDoc(doc(db, 'reservations', reservationId));
        
        if (!reservationDoc.exists()) {
          setError('Voucher não encontrado');
          setLoading(false);
          return;
        }

        const reservation = {
          id: reservationDoc.id,
          ...reservationDoc.data(),
        } as Reservation;

        // Buscar barco da reserva para validar data
        if (!reservation.boatId) {
          setError('Barco não encontrado para esta reserva');
          setLoading(false);
          return;
        }

        const boatDoc = await getDoc(doc(db, 'boats', reservation.boatId));
        
        if (!boatDoc.exists()) {
          setError('Barco não encontrado');
          setLoading(false);
          return;
        }

        const boat = {
          id: boatDoc.id,
          ...boatDoc.data(),
        } as Boat;

        // Validar data do passeio
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zerar horas para comparar apenas a data

        // Corrigir problema de timezone - extrair apenas a parte da data
        const parseDateString = (dateString: string): Date => {
          const datePart = dateString.split('T')[0]; // Pegar só "YYYY-MM-DD"
          const [year, month, day] = datePart.split('-').map(Number);
          // Criar data ao meio-dia para evitar problemas de timezone
          return new Date(year, month - 1, day, 12, 0, 0);
        };

        const boatDate = parseDateString(boat.date);
        boatDate.setHours(0, 0, 0, 0);

        // Formatar data para exibição
        const formatDate = (date: Date) => {
          return date.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          });
        };

        // Se a data já passou
        if (boatDate < today) {
          setError(`QR Code inválido para hoje. Este voucher é do passeio de ${formatDate(boatDate)}, que já passou. O cliente não pode embarcar.`);
          setLoading(false);
          return;
        }

        // Se a data é futura
        if (boatDate > today) {
          setError(`Este cliente não está elegível para o embarque de hoje. O barco dele é para ${formatDate(boatDate)}.`);
          setLoading(false);
          return;
        }

        // Data válida (hoje) - redirecionar para check-in
        setRedirecting(true);
        router.push(`/admin/checkin?reservationId=${reservationId}`);
        
        // Timeout de segurança - se o redirecionamento falhar, mostrar mensagem
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            setRedirecting(false);
            setLoading(false);
            setError('Não foi possível redirecionar. Clique no botão abaixo para ir ao check-in.');
          }
        }, 5000);
      } catch (err) {
        console.error('Erro ao processar voucher:', err);
        setError('Erro ao processar voucher. Tente novamente.');
        setLoading(false);
      }
    };

    processVoucher();
  }, [params.id, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-viva-blue mb-4" size={48} />
          <p className="text-gray-600 mb-2">
            {redirecting ? 'Redirecionando para check-in...' : 'Processando voucher...'}
          </p>
          {redirecting && (
            <Link
              href={`/admin/checkin?reservationId=${params.id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 mt-4 bg-viva-blue text-white rounded-lg hover:bg-viva-blue-dark transition text-sm"
            >
              Clique aqui se não redirecionar
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    // Verificar se precisa fazer login
    const isLoginRequired = error === 'LOGIN_REQUIRED';
    // Verificar se é erro de data (passada ou futura)
    const isDateError = error.includes('QR Code inválido') || error.includes('não está elegível');
    
    if (isLoginRequired) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-blue-100">
                <AlertCircle className="text-blue-600" size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-blue-800">
                Login Necessário
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Você precisa estar logado para processar este voucher.
              </p>
              <p className="text-xs text-gray-500">
                Após fazer login, você será redirecionado automaticamente.
              </p>
            </div>
            
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-viva-blue text-white rounded-lg hover:bg-viva-blue-dark transition font-semibold"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200 max-w-md w-full">
          <div className="text-center mb-6">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isDateError ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              <AlertCircle 
                className={isDateError ? 'text-orange-600' : 'text-red-600'} 
                size={32} 
              />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${
              isDateError ? 'text-orange-800' : 'text-red-800'
            }`}>
              {isDateError ? 'Data Inválida' : 'Erro ao Processar'}
            </h2>
            <p className={`text-sm ${
              isDateError ? 'text-orange-700' : 'text-red-600'
            }`}>
              {error}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/checkin"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-viva-blue text-white rounded-lg hover:bg-viva-blue-dark transition"
            >
              <ArrowLeft size={18} />
              Voltar para Check-in
            </Link>
            {isDateError && (
              <Link
                href="/admin/vouchers"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                <Calendar size={18} />
                Ver Vouchers
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

