'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, Boat } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Users, QrCode, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { generateVoucherPDF } from '@/lib/voucherGenerator';

export default function VouchersPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Buscar barcos
    const boatsQuery = query(collection(db, 'boats'));
    const unsubscribeBoats = onSnapshot(boatsQuery, (snapshot) => {
      const boatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Boat[];
      
      const sortedBoats = boatsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setBoats(sortedBoats);
      
      // Selecionar barco do dia se existir
      const todayBoat = sortedBoats.find(boat => {
        const boatDate = new Date(boat.date).toISOString().split('T')[0];
        return boatDate === selectedDate;
      });
      setSelectedBoat(todayBoat || null);
    });

    return () => unsubscribeBoats();
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedBoat) {
      setReservations([]);
      return;
    }

    // Buscar reservas aprovadas do barco
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('boatId', '==', selectedBoat.id),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        rideDate: doc.data().rideDate,
      })) as Reservation[];

      // Ordenar por nome
      reservationsData.sort((a, b) => a.customerName.localeCompare(b.customerName));
      setReservations(reservationsData);
    });

    return () => unsubscribe();
  }, [selectedBoat]);

  const handleGenerateVoucher = async (reservation: Reservation) => {
    try {
      await generateVoucherPDF(reservation, selectedBoat!);
    } catch (error) {
      console.error('Erro ao gerar voucher:', error);
      alert('Erro ao gerar voucher. Tente novamente.');
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reservation.customerName.toLowerCase().includes(search) ||
      reservation.phone.toLowerCase().includes(search) ||
      reservation.seatNumber?.toString().includes(search)
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-viva-blue-dark">Gerenciar Vouchers</h1>
              <p className="text-gray-600 text-xs sm:text-sm">Gerar vouchers com QR code para passageiros</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Filtro de Data */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 border border-gray-200">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Calendar size={18} className="text-gray-500" />
            Data do Passeio
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base bg-white"
          />
        </div>

        {selectedBoat ? (
          <>
            {/* Info do Barco */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-viva-blue-dark mb-2">
                    <Users size={20} className="text-viva-blue" />
                    {selectedBoat.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatDate(selectedBoat.date)} • {selectedBoat.seatsTaken} / {selectedBoat.seatsTotal} vagas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total de Reservas</p>
                  <p className="text-2xl font-bold text-viva-blue">{reservations.length}</p>
                </div>
              </div>

              {/* Busca */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar passageiro..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viva-blue focus:border-viva-blue outline-none text-base bg-white"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Lista de Reservas */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-3 sm:p-6 border-b">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Passageiros ({filteredReservations.length})
                </h3>
              </div>

              {/* Mobile - Cards */}
              <div className="lg:hidden p-3 space-y-3">
                {filteredReservations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm 
                      ? `Nenhum passageiro encontrado para "${searchTerm}"`
                      : 'Nenhuma reserva aprovada para este passeio'
                    }
                  </div>
                ) : (
                  filteredReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="rounded-lg p-4 border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-900">{reservation.customerName}</p>
                          <p className="text-xs text-gray-500">Assento #{reservation.seatNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-800">R$ {reservation.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs mb-3">
                        {reservation.amountPaid > 0 && (
                          <span className="text-green-600">
                            Pago: R$ {reservation.amountPaid.toFixed(2)}
                          </span>
                        )}
                        {reservation.amountDue > 0 && (
                          <span className="text-orange-600 font-semibold">
                            Falta: R$ {reservation.amountDue.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleGenerateVoucher(reservation)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white rounded-lg font-semibold hover:shadow-lg transition"
                      >
                        <QrCode size={18} />
                        Gerar Voucher
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop - Tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Passageiro</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assento</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pago</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pendente</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-500">
                          {searchTerm 
                            ? `Nenhum passageiro encontrado para "${searchTerm}"`
                            : 'Nenhuma reserva aprovada para este passeio'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredReservations.map((reservation) => (
                        <tr key={reservation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                            <p className="text-sm text-gray-500">{reservation.phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-700">#{reservation.seatNumber}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-gray-800">R$ {reservation.totalAmount.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-green-600">R$ {reservation.amountPaid.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-semibold ${reservation.amountDue > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                              R$ {reservation.amountDue.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleGenerateVoucher(reservation)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white rounded-lg font-semibold hover:shadow-lg transition text-sm"
                            >
                              <QrCode size={16} />
                              Gerar Voucher
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-12 shadow-sm text-center border border-gray-200">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">Nenhum passeio encontrado para esta data</p>
          </div>
        )}
      </div>
    </div>
  );
}

