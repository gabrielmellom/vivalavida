'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VoucherPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processVoucher = async () => {
      if (!user) {
        setError('Você precisa estar logado para acessar este voucher');
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

        // Redirecionar para check-in com parâmetro da reserva
        router.push(`/admin/checkin?reservationId=${reservationId}`);
      } catch (err) {
        console.error('Erro ao processar voucher:', err);
        setError('Erro ao processar voucher. Tente novamente.');
        setLoading(false);
      }
    };

    processVoucher();
  }, [params.id, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-viva-blue mb-4" size={48} />
          <p className="text-gray-600">Processando voucher...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/admin/checkin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-viva-blue text-white rounded-lg hover:bg-viva-blue-dark transition"
          >
            <ArrowLeft size={18} />
            Voltar para Check-in
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

