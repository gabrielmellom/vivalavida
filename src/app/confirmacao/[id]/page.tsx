'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat } from '@/types';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Ship, 
  Calendar, 
  MapPin, 
  Clock, 
  Users,
  Utensils,
  Trash2,
  Ban,
  Sun,
  Phone,
  Globe,
  Anchor
} from 'lucide-react';

// Tipos de idiomas suportados
type SupportedLanguage = 'pt-BR' | 'es';

// Idiomas disponíveis
const LANGUAGES: { code: SupportedLanguage; name: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function ConfirmacaoPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [boat, setBoat] = useState<Boat | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [vendorName, setVendorName] = useState<string>('');

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

        setReservation(reservationData);

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

        // Buscar nome do vendedor
        if (reservationData.vendorId) {
          try {
            const userRolesDoc = await getDoc(doc(db, 'roles', reservationData.vendorId));
            if (userRolesDoc.exists()) {
              setVendorName(userRolesDoc.data().name || 'Vendedor');
            }
          } catch (e) {
            console.log('Não foi possível carregar nome do vendedor');
          }
        }

        // Marcar que a confirmação foi visualizada
        if (!reservationData.confirmationSent) {
          await updateDoc(doc(db, 'reservations', reservationId), {
            confirmationSent: true,
            confirmationSentAt: Timestamp.now(),
          });
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    if (language === 'es') {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${dias[date.getDay()]}, ${day} de ${meses[month - 1]} de ${year}`;
    }
    
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDayOfWeek = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    if (language === 'es') {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return dias[date.getDay()];
    }
    
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dias[date.getDay()];
  };

  const formatDateShort = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  // Componente de seletor de idioma
  const LanguageSelector = () => (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition"
      >
        <Globe size={18} className="text-gray-600" />
        <span className="text-sm font-medium">{LANGUAGES.find(l => l.code === language)?.flag}</span>
      </button>
      {showLanguageMenu && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[160px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setShowLanguageMenu(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition ${
                language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Verificar se é passeio com desembarque
  const isWithLanding = reservation?.escunaType === 'com-desembarque';

  // Conteúdo em português
  const contentPTBR = () => (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Ship className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-black text-lg">PASSEIO ILHA DO CAMPECHE 🏝️</h1>
            <p className="text-blue-100 text-sm">BARCO VIVA LA VIDA</p>
          </div>
        </div>
      </div>

      {/* Informações da Reserva */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <p className="text-blue-800 font-semibold">
          Reserva com {vendorName ? `a vendedora ${vendorName}` : 'o vendedor'} para a Ilha do Campeche {isWithLanding ? 'com DESEMBARQUE' : 'PANORÂMICO'}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            <span className="font-bold">{formatDateShort(boat?.date || '')} – {getDayOfWeek(boat?.date || '')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <span className="font-bold">{reservation?.customerName}</span>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="p-4 space-y-3 text-sm">
        {/* Check-in */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
          <MapPin className="text-yellow-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-yellow-800">Check-in: a partir das 08:00 (chegar até 08:30)</p>
            <p className="text-yellow-700">📌 Rua Amaro Coelho, 22 – Barra da Lagoa</p>
            <p className="text-yellow-600 text-xs mt-1">⚠️ Não comparecendo até esse horário, a reserva poderá ser liberada.</p>
          </div>
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Clock size={16} className="text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Embarque</p>
              <p className="font-bold text-gray-800">09:00</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Anchor size={16} className="text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Saída</p>
              <p className="font-bold text-gray-800">09:15</p>
            </div>
          </div>
        </div>

        {/* Trajeto */}
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-blue-800">⏳ <strong>Trajeto:</strong> aprox. 1h10 ida e retorno</p>
          <p className="text-blue-800">🏝️ <strong>Permanência na ilha:</strong> até 3h30</p>
          <p className="text-blue-800">🏁 <strong>Retorno previsto:</strong> por volta das 16:00</p>
        </div>

        {/* Documento */}
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <span className="text-lg">🛃</span>
          <p className="text-red-700 font-semibold">Documento obrigatório para todos (inclusive menores).</p>
        </div>

        {/* Alimentação */}
        <div className="p-3 bg-green-50 rounded-xl border border-green-100 space-y-1">
          <p className="text-green-800">🍽️ Restaurante e quiosque na ilha.</p>
          <p className="text-green-800">🎒 Pode levar lanches e bebidas.</p>
          <p className="text-green-800">❌ Alimentação não inclusa.</p>
          <p className="text-green-800">🍹 Bar a bordo com venda de bebidas e caipirinhas.</p>
          <p className="text-green-800">🚻 Banheiro disponível no barco.</p>
        </div>

        {/* Desembarque */}
        {isWithLanding && (
          <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
            <p className="text-teal-800 font-semibold">🏝️ DESEMBARQUE: direto na areia, barco com rampa (é necessário molhar as pernas).</p>
          </div>
        )}

        {/* Proibições */}
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-1">
          <p className="text-red-700">🚫 Proibido fumar na embarcação.</p>
          <p className="text-red-700">🚫 Proibido levar animais.</p>
          <p className="text-red-700">🔥 Proibido fazer churrasco.</p>
        </div>

        {/* Lixo */}
        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
          <Trash2 size={18} className="text-orange-600 shrink-0 mt-0.5" />
          <p className="text-orange-700">O lixo retorna com o passageiro para o barco, não fica na ilha.</p>
        </div>

        {/* Confirmação */}
        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
          <p className="text-purple-800">📲 <strong>Confirmação do passeio no dia do embarque, até às 07:00.</strong></p>
          <p className="text-purple-700 text-xs mt-1">👉 Aguarde a confirmação para se deslocar até o local do embarque.</p>
        </div>

        {/* Dica */}
        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
          <Sun className="text-yellow-500" size={20} />
          <p className="text-yellow-700 font-semibold">💡 Não esqueça o protetor solar!</p>
        </div>

        {/* Mensagem final */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
          <p className="text-blue-800 font-bold text-lg">😃 Será um prazer tê-los conosco!</p>
        </div>
      </div>
    </>
  );

  // Conteúdo em espanhol
  const contentES = () => (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Ship className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-black text-lg">PASEO ISLA DO CAMPECHE 🏝️</h1>
            <p className="text-blue-100 text-sm">BARCO VIVA LA VIDA</p>
          </div>
        </div>
      </div>

      {/* Informações da Reserva */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <p className="text-blue-800 font-semibold">
          Reserva con {vendorName ? `la vendedora ${vendorName}` : 'el vendedor'} para la Isla do Campeche {isWithLanding ? 'con DESEMBARQUE' : 'PANORÁMICO'}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            <span className="font-bold">{formatDateShort(boat?.date || '')} – {getDayOfWeek(boat?.date || '')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <span className="font-bold">{reservation?.customerName}</span>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="p-4 space-y-3 text-sm">
        {/* Check-in */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
          <MapPin className="text-yellow-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-yellow-800">Check-in: desde las 08:00 (llegar hasta las 08:30)</p>
            <p className="text-yellow-700">📌 Rua Amaro Coelho, 22 – Barra da Lagoa</p>
            <p className="text-yellow-600 text-xs mt-1">⚠️ Si no se presenta hasta ese horario, la reserva podrá liberarse.</p>
          </div>
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Clock size={16} className="text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Embarque</p>
              <p className="font-bold text-gray-800">09:00</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Anchor size={16} className="text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Salida</p>
              <p className="font-bold text-gray-800">09:15</p>
            </div>
          </div>
        </div>

        {/* Trajeto */}
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-blue-800">⏳ <strong>Trayecto:</strong> aprox. 1h10 de ida y 1h10 de regreso</p>
          <p className="text-blue-800">🏝️ <strong>Tiempo en la isla:</strong> hasta 3h30</p>
          <p className="text-blue-800">🏁 <strong>Regreso previsto:</strong> alrededor de las 16:00</p>
        </div>

        {/* Documento */}
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <span className="text-lg">🛃</span>
          <p className="text-red-700 font-semibold">Documento de identidad obligatorio para todos (incluidos menores).</p>
        </div>

        {/* Alimentación */}
        <div className="p-3 bg-green-50 rounded-xl border border-green-100 space-y-1">
          <p className="text-green-800">🍽️ La isla cuenta con restaurante y quiosco.</p>
          <p className="text-green-800">🎒 Se permite llevar snacks y bebidas.</p>
          <p className="text-green-800">❌ La alimentación no está incluida.</p>
          <p className="text-green-800">🍹 Bar a bordo con venta de bebidas y caipirinhas.</p>
          <p className="text-green-800">🚻 Baño disponible en el barco.</p>
        </div>

        {/* Desembarque */}
        {isWithLanding && (
          <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
            <p className="text-teal-800 font-semibold">🏝️ DESEMBARQUE: desembarque directo en la arena, barco con rampa (es necesario mojar las piernas).</p>
          </div>
        )}

        {/* Prohibiciones */}
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-1">
          <p className="text-red-700">🚫 Prohibido fumar en la embarcación.</p>
          <p className="text-red-700">🚫 Prohibido llevar animales.</p>
          <p className="text-red-700">🔥 Prohibido hacer asado / churrasco.</p>
        </div>

        {/* Basura */}
        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
          <Trash2 size={18} className="text-orange-600 shrink-0 mt-0.5" />
          <p className="text-orange-700">La basura regresa con el pasajero al barco, no se deja en la isla.</p>
        </div>

        {/* Confirmación */}
        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
          <p className="text-purple-800">📲 <strong>Confirmación del paseo el día del embarque, hasta las 07:00.</strong></p>
          <p className="text-purple-700 text-xs mt-1">👉 Espere la confirmación antes de dirigirse al punto de embarque.</p>
        </div>

        {/* Consejo */}
        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
          <Sun className="text-yellow-500" size={20} />
          <p className="text-yellow-700 font-semibold">💡 ¡No olvide el protector solar!</p>
        </div>

        {/* Mensaje final */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
          <p className="text-blue-800 font-bold text-lg">😃 Será un placer recibirlos.</p>
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <LanguageSelector />
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-gray-600">{language === 'es' ? 'Cargando...' : 'Carregando...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <LanguageSelector />
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h1 className="text-xl font-bold text-red-800 mb-2">{language === 'es' ? 'Error' : 'Erro'}</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <LanguageSelector />
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {language === 'es' ? contentES() : contentPTBR()}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-xs">
            VIVA LA VIDA • Ilha do Campeche • Florianópolis
          </p>
        </div>
      </div>
    </div>
  );
}

