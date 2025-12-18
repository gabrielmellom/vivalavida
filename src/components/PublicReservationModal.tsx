'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Boat, Reservation, PaymentMethod } from '@/types';
import { Calendar, Users, X } from 'lucide-react';

// Formatar data sem problemas de timezone
const formatDateForDisplay = (dateString: string, options?: Intl.DateTimeFormatOptions) => {
  if (!dateString) return '';
  // Pega apenas a parte YYYY-MM-DD (antes do T se houver)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  // Cria a data ao meio-dia para evitar problemas de timezone
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('pt-BR', options);
};

interface PublicReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PublicReservationModal({ isOpen, onClose }: PublicReservationModalProps) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [totalAmount, setTotalAmount] = useState('200');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Buscar barcos ativos do dia ou próximos dias
    const today = new Date().toISOString().split('T')[0];
    const boatsQuery = query(
      collection(db, 'boats'),
      where('status', '==', 'active'),
      where('date', '>=', today),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(
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
          onSnapshot(simpleQuery, (snapshot) => {
            const boatsData = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
              })) as Boat[];
            // Filtrar por data e ordenar manualmente
            const filtered = boatsData
              .filter(b => b.date >= today)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setBoats(filtered);
          });
        }
      }
    );

    return unsubscribe;
  }, [isOpen]);

  useEffect(() => {
    if (!selectedBoat) {
      setAvailableSeats([]);
      return;
    }

    // Buscar reservas aprovadas para o barco selecionado
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('boatId', '==', selectedBoat.id),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(
      reservationsQuery,
      (snapshot) => {
        const reservations = snapshot.docs.map(doc => doc.data()) as Reservation[];
        const takenSeats = reservations.map(r => r.seatNumber);
        
        const available: number[] = [];
        for (let i = 1; i <= selectedBoat.seatsTotal; i++) {
          if (!takenSeats.includes(i)) {
            available.push(i);
          }
        }
        setAvailableSeats(available);
      },
      (error) => {
        console.error('Erro ao carregar assentos disponíveis:', error);
        // Em caso de erro, mostra todos os assentos como disponíveis
        const available: number[] = [];
        for (let i = 1; i <= selectedBoat.seatsTotal; i++) {
          available.push(i);
        }
        setAvailableSeats(available);
      }
    );

    return unsubscribe;
  }, [selectedBoat]);

  const handleSelectBoat = (boat: Boat) => {
    setSelectedBoat(boat);
    setSelectedSeat(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoat || !selectedSeat) {
      setError('Selecione um barco e um assento');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Criar reserva como pendente (será aprovada pelo admin)
      await addDoc(collection(db, 'reservations'), {
        boatId: selectedBoat.id,
        seatNumber: selectedSeat,
        status: 'pending',
        customerName,
        phone,
        whatsapp: whatsapp || phone,
        address,
        paymentMethod,
        totalAmount: parseFloat(totalAmount) || 0,
        amountPaid: 0,
        amountDue: parseFloat(totalAmount) || 0,
        vendorId: 'public', // Identifica como reserva pública
        rideDate: selectedBoat.date,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // Reset form
        setSelectedBoat(null);
        setSelectedSeat(null);
        setCustomerName('');
        setPhone('');
        setWhatsapp('');
        setAddress('');
        setPaymentMethod('pix');
        setTotalAmount('200');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar reserva. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-viva-blue-dark">Reservar Passeio</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">Reserva Criada!</h3>
            <p className="text-gray-600">Sua solicitação foi enviada e será analisada pelo administrador.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seleção de Barco */}
            {!selectedBoat ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Selecione a Data do Passeio
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {boats.map((boat) => {
                    const availableCount = boat.seatsTotal - boat.seatsTaken;
                    return (
                      <button
                        key={boat.id}
                        type="button"
                        onClick={() => handleSelectBoat(boat)}
                        disabled={availableCount === 0}
                        className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-viva-blue hover:bg-viva-blue/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-viva-blue" />
                            <span className="font-bold text-viva-blue-dark">
                              {formatDateForDisplay(boat.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users size={16} />
                          <span>{availableCount} vagas disponíveis</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {boats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Não há passeios disponíveis no momento
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Barco Selecionado */}
                <div className="bg-viva-blue/10 border-2 border-viva-blue rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-viva-blue-dark">{selectedBoat.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatDateForDisplay(selectedBoat.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBoat(null);
                        setSelectedSeat(null);
                      }}
                      className="text-sm text-viva-blue hover:text-viva-blue-dark font-semibold"
                    >
                      Trocar Data
                    </button>
                  </div>
                </div>

                {/* Seleção de Assento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Selecione o Assento ({availableSeats.length} disponíveis)
                  </label>
                  <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-xl">
                    {availableSeats.map((seat) => (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => setSelectedSeat(seat)}
                        className={`px-4 py-3 rounded-lg font-bold transition ${
                          selectedSeat === seat
                            ? 'bg-viva-blue text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {seat}
                      </button>
                    ))}
                  </div>
                  {selectedSeat && (
                    <p className="mt-2 text-sm text-viva-blue font-semibold">
                      Assento {selectedSeat} selecionado
                    </p>
                  )}
                </div>

                {/* Dados do Cliente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo *</label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    disabled={loading || !selectedSeat}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

