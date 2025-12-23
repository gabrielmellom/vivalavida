'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat } from '@/types';
import { Loader2, CheckCircle, AlertCircle, Ship, Camera, FileText, Calendar, User, Phone } from 'lucide-react';

export default function AceitePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [boat, setBoat] = useState<Boat | null>(null);
  
  // Estados dos checkboxes
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedImageRights, setAcceptedImageRights] = useState(false);
  
  // Expandir termos
  const [showTerms, setShowTerms] = useState(false);
  const [showImageTerms, setShowImageTerms] = useState(false);

  useEffect(() => {
    const loadReservation = async () => {
      const reservationId = params.id as string;
      
      if (!reservationId) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        // Buscar reserva
        const reservationDoc = await getDoc(doc(db, 'reservations', reservationId));
        
        if (!reservationDoc.exists()) {
          setError('Reserva não encontrada');
          setLoading(false);
          return;
        }

        const reservationData = {
          id: reservationDoc.id,
          ...reservationDoc.data(),
          createdAt: reservationDoc.data().createdAt?.toDate(),
          updatedAt: reservationDoc.data().updatedAt?.toDate(),
        } as Reservation;

        // Verificar se já aceitou
        if (reservationData.acceptedTerms && reservationData.acceptedImageRights) {
          setSuccess(true);
          setReservation(reservationData);
          setLoading(false);
          return;
        }

        setReservation(reservationData);
        setAcceptedTerms(reservationData.acceptedTerms || false);
        setAcceptedImageRights(reservationData.acceptedImageRights || false);

        // Buscar barco
        if (reservationData.boatId) {
          const boatDoc = await getDoc(doc(db, 'boats', reservationData.boatId));
          if (boatDoc.exists()) {
            setBoat({
              id: boatDoc.id,
              ...boatDoc.data(),
            } as Boat);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar reserva:', err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadReservation();
  }, [params.id]);

  const handleSubmit = async () => {
    if (!reservation) return;
    
    if (!acceptedTerms) {
      alert('Você precisa aceitar os termos de uso do barco para continuar.');
      return;
    }

    setSubmitting(true);

    try {
      // Obter informações do dispositivo
      const userAgent = navigator.userAgent;
      
      // Tentar obter IP (via API externa)
      let clientIP = 'Não disponível';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIP = ipData.ip;
      } catch {
        console.log('Não foi possível obter IP');
      }

      const now = Timestamp.now();
      
      // Atualizar reserva com os aceites
      const updateData: Record<string, unknown> = {
        acceptedTerms: true,
        acceptedTermsAt: now,
        acceptedFromIP: clientIP,
        acceptedUserAgent: userAgent,
        updatedAt: now,
      };

      // Se aceitou uso de imagem, adicionar também
      if (acceptedImageRights) {
        updateData.acceptedImageRights = true;
        updateData.acceptedImageRightsAt = now;
      }

      await updateDoc(doc(db, 'reservations', reservation.id), updateData);
      
      setSuccess(true);
    } catch (err) {
      console.error('Erro ao salvar aceite:', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h1 className="text-xl font-bold text-red-800 mb-2">Erro</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-green-200 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Termos Aceitos!</h1>
          <p className="text-green-600 mb-6">
            Obrigado, {reservation?.customerName?.split(' ')[0]}! Seus termos foram registrados com sucesso.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
            <p className="text-sm text-green-800">
              <span className="font-semibold">✓ Termos de uso do barco:</span> Aceito
            </p>
            {reservation?.acceptedImageRights && (
              <p className="text-sm text-green-800 mt-1">
                <span className="font-semibold">✓ Uso de imagem:</span> Autorizado
              </p>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-6">
            Agora você receberá seu voucher de embarque. Apresente-o no dia do passeio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ship className="text-blue-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">VIVA LA VIDA</h1>
          <p className="text-gray-600">Ilha do Campeche • Florianópolis</p>
        </div>

        {/* Card de informações do passeio */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <h2 className="font-bold text-lg">Confirmação de Termos</h2>
            <p className="text-blue-100 text-sm">Para prosseguir com seu passeio</p>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Passageiro</p>
                <p className="font-semibold text-gray-800">{reservation?.customerName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Telefone</p>
                <p className="font-semibold text-gray-800">{reservation?.phone}</p>
              </div>
            </div>
            
            {boat && (
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Data do Passeio</p>
                  <p className="font-semibold text-gray-800 capitalize">{formatDate(boat.date)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Ship size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Assento</p>
                <p className="font-semibold text-gray-800">#{reservation?.seatNumber}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Termos */}
        <div className="space-y-4 mb-8">
          {/* Termos de Uso do Barco */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTerms(!showTerms)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800">Termos de Uso do Barco</p>
                  <p className="text-sm text-gray-500">Leia as regras do passeio</p>
                </div>
              </div>
              <span className="text-blue-600 text-sm font-semibold">
                {showTerms ? 'Ocultar' : 'Ver termos'}
              </span>
            </button>
            
            {showTerms && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 max-h-64 overflow-y-auto border border-gray-200">
                  <p className="font-bold text-gray-800">TERMOS E CONDIÇÕES DE EMBARQUE</p>
                  
                  <p><strong>1. HORÁRIOS:</strong> O passageiro deve comparecer ao local de embarque com 30 minutos de antecedência. Atrasos podem resultar na perda do passeio sem direito a reembolso.</p>
                  
                  <p><strong>2. CONDIÇÕES CLIMÁTICAS:</strong> O passeio está sujeito às condições climáticas e do mar. Em caso de cancelamento por parte da empresa devido ao clima, será oferecida remarcação ou reembolso.</p>
                  
                  <p><strong>3. RESPONSABILIDADE:</strong> O passageiro é responsável por seus pertences pessoais. A empresa não se responsabiliza por perdas, danos ou furtos.</p>
                  
                  <p><strong>4. COMPORTAMENTO:</strong> É proibido o uso de drogas ilícitas, comportamento que coloque em risco a segurança dos demais passageiros ou tripulação. O descumprimento pode resultar em desembarque imediato.</p>
                  
                  <p><strong>5. SEGURANÇA:</strong> O passageiro deve seguir todas as orientações da tripulação. O uso de coletes salva-vidas é obrigatório quando solicitado.</p>
                  
                  <p><strong>6. CANCELAMENTO:</strong> Cancelamentos com menos de 24 horas de antecedência não terão direito a reembolso.</p>
                  
                  <p><strong>7. ALIMENTAÇÃO:</strong> É permitido levar alimentos e bebidas (não alcoólicas). Bebidas alcoólicas são permitidas com moderação.</p>
                  
                  <p><strong>8. CRIANÇAS:</strong> Menores de idade devem estar acompanhados por um responsável legal.</p>
                  
                  <p><strong>9. SAÚDE:</strong> Passageiros com problemas de saúde que possam ser agravados pelo passeio devem informar previamente à tripulação.</p>
                  
                  <p><strong>10. PRESERVAÇÃO:</strong> É proibido jogar lixo no mar. Contribua para a preservação ambiental.</p>
                </div>
              </div>
            )}
            
            <div className="px-4 pb-4">
              <label className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <strong className="text-blue-800">Li e aceito os termos de uso do barco</strong>
                  <br />
                  <span className="text-gray-500">Concordo com todas as regras e condições do passeio.</span>
                </span>
              </label>
            </div>
          </div>

          {/* Uso de Imagem */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowImageTerms(!showImageTerms)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Camera className="text-purple-600" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800">Autorização de Uso de Imagem</p>
                  <p className="text-sm text-gray-500">Opcional - para redes sociais</p>
                </div>
              </div>
              <span className="text-purple-600 text-sm font-semibold">
                {showImageTerms ? 'Ocultar' : 'Ver termos'}
              </span>
            </button>
            
            {showImageTerms && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 max-h-48 overflow-y-auto border border-gray-200">
                  <p className="font-bold text-gray-800">TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM</p>
                  
                  <p>Autorizo a empresa VIVA LA VIDA PASSEIOS a utilizar minha imagem, seja em foto ou vídeo, captada durante o passeio, para fins de divulgação institucional e comercial.</p>
                  
                  <p><strong>Uso permitido:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Redes sociais (Instagram, Facebook, TikTok)</li>
                    <li>Website da empresa</li>
                    <li>Material publicitário impresso e digital</li>
                    <li>Vídeos promocionais</li>
                  </ul>
                  
                  <p>Esta autorização é concedida a título gratuito, sem qualquer ônus para a empresa.</p>
                  
                  <p><em>Obs: Caso não deseje autorizar, basta não marcar a opção abaixo. Isso não afetará sua participação no passeio.</em></p>
                </div>
              </div>
            )}
            
            <div className="px-4 pb-4">
              <label className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-100 transition">
                <input
                  type="checkbox"
                  checked={acceptedImageRights}
                  onChange={(e) => setAcceptedImageRights(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  <strong className="text-purple-800">Autorizo o uso da minha imagem</strong>
                  <br />
                  <span className="text-gray-500">Opcional - Para divulgação em redes sociais.</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Botão de Confirmar */}
        <button
          onClick={handleSubmit}
          disabled={!acceptedTerms || submitting}
          className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 ${
            acceptedTerms
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg active:scale-[0.98]'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Confirmar e Aceitar Termos
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          Ao confirmar, seus dados de aceite serão registrados para fins de comprovação legal.
        </p>
      </div>
    </div>
  );
}

