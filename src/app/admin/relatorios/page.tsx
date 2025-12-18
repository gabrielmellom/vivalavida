'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, UserRole, Boat } from '@/types';
import { ArrowLeft, Download, Calendar, TrendingUp, TrendingDown, DollarSign, Users, XCircle, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';

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

interface VendorSales {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  totalReservations: number;
  approvedReservations: number;
  pendingReservations: number;
  cancelledReservations: number;
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  cancelRate: number;
}

interface SalesReport {
  period: string;
  totalReservations: number;
  approvedReservations: number;
  pendingReservations: number;
  cancelledReservations: number;
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  cancelRate: number;
  vendorSales: VendorSales[];
  cancelledDetails: Array<{
    id: string;
    customerName: string;
    vendorName: string;
    amount: number;
    date: Date;
    createdAt: Date;
  }>;
}

export default function RelatoriosPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [vendedores, setVendedores] = useState<UserRole[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [filterType, setFilterType] = useState<'month' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [report, setReport] = useState<SalesReport | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar reservas
      const reservationsQuery = query(collection(db, 'reservations'));
      const reservationsSnapshot = await getDocs(reservationsQuery);
      const reservationsData = reservationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        rideDate: doc.data().rideDate,
      })) as Reservation[];
      setReservations(reservationsData);

      // Carregar vendedores
      const vendedoresQuery = query(collection(db, 'roles'), where('role', '==', 'vendor'));
      const vendedoresSnapshot = await getDocs(vendedoresQuery);
      const vendedoresData = vendedoresSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as UserRole[];
      setVendedores(vendedoresData);

      // Carregar barcos
      const boatsQuery = query(collection(db, 'boats'));
      const boatsSnapshot = await getDocs(boatsQuery);
      const boatsData = boatsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Boat[];
      setBoats(boatsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (filterType === 'custom' && (!startDate || !endDate)) {
      alert('Selecione o período customizado');
      return;
    }

    setLoading(true);
    
    try {
      let filteredReservations: Reservation[];
      
      if (filterType === 'month') {
        const [year, month] = selectedMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        
        filteredReservations = reservations.filter(r => {
          const createdAt = r.createdAt || new Date(0);
          return createdAt >= start && createdAt <= end;
        });
      } else {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        
        filteredReservations = reservations.filter(r => {
          const createdAt = r.createdAt || new Date(0);
          return createdAt >= start && createdAt <= end;
        });
      }

      // Calcular estatísticas gerais
      const totalReservations = filteredReservations.length;
      const approvedReservations = filteredReservations.filter(r => r.status === 'approved').length;
      const pendingReservations = filteredReservations.filter(r => r.status === 'pending').length;
      const cancelledReservations = filteredReservations.filter(r => r.status === 'cancelled').length;
      
      const totalSales = filteredReservations.reduce((sum, r) => sum + r.totalAmount, 0);
      const totalPaid = filteredReservations.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const totalDue = filteredReservations.reduce((sum, r) => sum + (r.amountDue || 0), 0);
      
      const cancelRate = totalReservations > 0 
        ? (cancelledReservations / totalReservations) * 100 
        : 0;

      // Agrupar por vendedor
      const vendorMap = new Map<string, VendorSales>();
      
      filteredReservations.forEach(reservation => {
        const vendor = vendedores.find(v => v.uid === reservation.vendorId);
        const vendorId = reservation.vendorId || 'unknown';
        const vendorName = vendor?.name || vendor?.email || 'Vendedor Desconhecido';
        const vendorEmail = vendor?.email || 'N/A';

        if (!vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            vendorId,
            vendorName,
            vendorEmail,
            totalReservations: 0,
            approvedReservations: 0,
            pendingReservations: 0,
            cancelledReservations: 0,
            totalSales: 0,
            totalPaid: 0,
            totalDue: 0,
            cancelRate: 0,
          });
        }

        const vendorSales = vendorMap.get(vendorId)!;
        vendorSales.totalReservations++;
        
        if (reservation.status === 'approved') vendorSales.approvedReservations++;
        if (reservation.status === 'pending') vendorSales.pendingReservations++;
        if (reservation.status === 'cancelled') vendorSales.cancelledReservations++;
        
        vendorSales.totalSales += reservation.totalAmount;
        vendorSales.totalPaid += reservation.amountPaid || 0;
        vendorSales.totalDue += reservation.amountDue || 0;
      });

      // Calcular taxa de cancelamento por vendedor
      vendorMap.forEach(vendorSales => {
        vendorSales.cancelRate = vendorSales.totalReservations > 0
          ? (vendorSales.cancelledReservations / vendorSales.totalReservations) * 100
          : 0;
      });

      const vendorSalesArray = Array.from(vendorMap.values()).sort((a, b) => b.totalSales - a.totalSales);

      // Detalhes de cancelamentos
      const cancelledDetails = filteredReservations
        .filter(r => r.status === 'cancelled')
        .map(r => {
          const vendor = vendedores.find(v => v.uid === r.vendorId);
          return {
            id: r.id,
            customerName: r.customerName,
            vendorName: vendor?.name || vendor?.email || 'Desconhecido',
            amount: r.totalAmount,
            date: r.rideDate ? new Date(r.rideDate) : new Date(),
            createdAt: r.createdAt || new Date(),
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const periodLabel = filterType === 'month'
        ? formatDateForDisplay(selectedMonth + '-01', { month: 'long', year: 'numeric' })
        : `${formatDateForDisplay(startDate)} a ${formatDateForDisplay(endDate)}`;

      setReport({
        period: periodLabel,
        totalReservations,
        approvedReservations,
        pendingReservations,
        cancelledReservations,
        totalSales,
        totalPaid,
        totalDue,
        cancelRate,
        vendorSales: vendorSalesArray,
        cancelledDetails,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    let csv = 'RELATÓRIO DE VENDAS\n\n';
    csv += `Período: ${report.period}\n`;
    csv += `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n\n`;
    
    csv += 'RESUMO GERAL\n';
    csv += `Total de Reservas,${report.totalReservations}\n`;
    csv += `Aprovadas,${report.approvedReservations}\n`;
    csv += `Pendentes,${report.pendingReservations}\n`;
    csv += `Canceladas,${report.cancelledReservations}\n`;
    csv += `Taxa de Cancelamento,${report.cancelRate.toFixed(2)}%\n`;
    csv += `Total de Vendas,R$ ${report.totalSales.toFixed(2)}\n`;
    csv += `Total Recebido,R$ ${report.totalPaid.toFixed(2)}\n`;
    csv += `Total a Receber,R$ ${report.totalDue.toFixed(2)}\n\n`;
    
    csv += 'VENDAS POR VENDEDOR\n';
    csv += 'Vendedor,Email,Total Reservas,Aprovadas,Pendentes,Canceladas,Taxa Cancelamento,Total Vendas,Total Recebido,Total a Receber\n';
    report.vendorSales.forEach(v => {
      csv += `"${v.vendorName}","${v.vendorEmail}",${v.totalReservations},${v.approvedReservations},${v.pendingReservations},${v.cancelledReservations},${v.cancelRate.toFixed(2)}%,R$ ${v.totalSales.toFixed(2)},R$ ${v.totalPaid.toFixed(2)},R$ ${v.totalDue.toFixed(2)}\n`;
    });
    
    if (report.cancelledDetails.length > 0) {
      csv += '\nCANCELAMENTOS\n';
      csv += 'Cliente,Vendedor,Valor,Data do Passeio,Data do Cancelamento\n';
      report.cancelledDetails.forEach(c => {
        csv += `"${c.customerName}","${c.vendorName}",R$ ${c.amount.toFixed(2)},${c.date.toLocaleDateString('pt-BR')},${c.createdAt.toLocaleDateString('pt-BR')}\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_vendas_${report.period.replace(/\s/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-viva-blue-dark">Relatórios de Vendas</h1>
              <p className="text-gray-600 text-sm">Análise completa de vendas e cancelamentos</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-viva-blue-dark mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Período</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'month' | 'custom')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
              >
                <option value="month">Por Mês</option>
                <option value="custom">Período Customizado</option>
              </select>
            </div>

            {filterType === 'month' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mês</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-viva-blue focus:border-transparent outline-none"
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Gerando...' : 'Gerar Relatório'}
              </button>
            </div>
          </div>
        </div>

        {/* Relatório */}
        {report && (
          <div className="space-y-6">
            {/* Cabeçalho do Relatório */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-viva-blue-dark">Relatório de Vendas</h2>
                  <p className="text-gray-600 mt-1">Período: {report.period}</p>
                </div>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition"
                >
                  <Download size={20} />
                  Exportar CSV
                </button>
              </div>

              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 font-semibold mb-1">Total de Reservas</p>
                      <p className="text-3xl font-black text-blue-900">{report.totalReservations}</p>
                    </div>
                    <FileText className="text-blue-600" size={32} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-semibold mb-1">Total de Vendas</p>
                      <p className="text-2xl font-black text-green-900">R$ {report.totalSales.toFixed(2)}</p>
                    </div>
                    <DollarSign className="text-green-600" size={32} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700 font-semibold mb-1">Taxa de Cancelamento</p>
                      <p className="text-3xl font-black text-orange-900">{report.cancelRate.toFixed(1)}%</p>
                    </div>
                    <TrendingDown className="text-orange-600" size={32} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700 font-semibold mb-1">Total Recebido</p>
                      <p className="text-2xl font-black text-purple-900">R$ {report.totalPaid.toFixed(2)}</p>
                    </div>
                    <CheckCircle className="text-purple-600" size={32} />
                  </div>
                </div>
              </div>

              {/* Detalhes das Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600" size={24} />
                    <div>
                      <p className="text-sm text-gray-600">Aprovadas</p>
                      <p className="text-xl font-bold text-gray-900">{report.approvedReservations}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-orange-600" size={24} />
                    <div>
                      <p className="text-sm text-gray-600">Pendentes</p>
                      <p className="text-xl font-bold text-gray-900">{report.pendingReservations}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="text-red-600" size={24} />
                    <div>
                      <p className="text-sm text-gray-600">Canceladas</p>
                      <p className="text-xl font-bold text-gray-900">{report.cancelledReservations}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendas por Vendedor */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-viva-blue-dark">Vendas por Vendedor</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Vendedor</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total Reservas</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Aprovadas</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Pendentes</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Canceladas</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Taxa Cancel.</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Vendas</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Recebido</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">A Receber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.vendorSales.map((vendor) => (
                      <tr key={vendor.vendorId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{vendor.vendorName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{vendor.vendorEmail}</td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900">{vendor.totalReservations}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
                            {vendor.approvedReservations}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-semibold">
                            {vendor.pendingReservations}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-semibold">
                            {vendor.cancelledReservations}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-sm font-semibold ${
                            vendor.cancelRate > 20 
                              ? 'bg-red-100 text-red-700' 
                              : vendor.cancelRate > 10 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {vendor.cancelRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">R$ {vendor.totalSales.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">R$ {vendor.totalPaid.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-orange-600">R$ {vendor.totalDue.toFixed(2)}</td>
                      </tr>
                    ))}
                    {report.vendorSales.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                          Nenhuma venda encontrada no período selecionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-right">TOTAL:</td>
                      <td className="px-6 py-4 text-center">{report.totalReservations}</td>
                      <td className="px-6 py-4 text-center">{report.approvedReservations}</td>
                      <td className="px-6 py-4 text-center">{report.pendingReservations}</td>
                      <td className="px-6 py-4 text-center">{report.cancelledReservations}</td>
                      <td className="px-6 py-4 text-center">{report.cancelRate.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-right">R$ {report.totalSales.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">R$ {report.totalPaid.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">R$ {report.totalDue.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Cancelamentos */}
            {report.cancelledDetails.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-viva-blue-dark">Detalhes dos Cancelamentos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Vendedor</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Data do Passeio</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Data Cancelamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {report.cancelledDetails.map((cancel) => (
                        <tr key={cancel.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold text-gray-900">{cancel.customerName}</td>
                          <td className="px-6 py-4 text-gray-600">{cancel.vendorName}</td>
                          <td className="px-6 py-4 text-right font-bold text-red-600">R$ {cancel.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-gray-600">{cancel.date.toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4 text-gray-600">{cancel.createdAt.toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-red-50 font-bold">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-right">Total Cancelado:</td>
                        <td className="px-6 py-4 text-right text-red-600">
                          R$ {report.cancelledDetails.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!report && !loading && (
          <div className="bg-white rounded-xl p-12 text-center">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 font-semibold mb-2">Nenhum relatório gerado</p>
            <p className="text-sm text-gray-500">Selecione um período e clique em "Gerar Relatório"</p>
          </div>
        )}
      </div>
    </div>
  );
}

