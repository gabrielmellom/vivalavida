'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserRole } from '@/types';
import { Plus, Trash2, UserPlus, ArrowLeft, Headphones, Users } from 'lucide-react';
import Link from 'next/link';

type UserType = 'vendor' | 'post_sale';

export default function GerenciarVendedores() {
  const [usuarios, setUsuarios] = useState<UserRole[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<UserType>('vendor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      // Carregar vendedores
      const vendorQuery = query(collection(db, 'roles'), where('role', '==', 'vendor'));
      const vendorSnapshot = await getDocs(vendorQuery);
      const vendors = vendorSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as UserRole[];

      // Carregar atendentes pós-venda
      const postSaleQuery = query(collection(db, 'roles'), where('role', '==', 'post_sale'));
      const postSaleSnapshot = await getDocs(postSaleQuery);
      const postSales = postSaleSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as UserRole[];

      setUsuarios([...vendors, ...postSales]);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Criar usuário usando API route (Admin SDK - não faz login automático)
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name || email,
          role: selectedType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      setShowModal(false);
      setEmail('');
      setPassword('');
      setName('');
      setSelectedType('vendor');
      loadUsuarios();
    } catch (err: any) {
      console.error('Erro completo ao criar usuário:', err);
      let errorMessage = err.message || 'Erro ao criar usuário';
      
      if (errorMessage.includes('email já está em uso') || errorMessage.includes('email-already')) {
        errorMessage = 'Este email já está em uso. Verifique a lista abaixo.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUsuario = async (uid: string, role: string) => {
    const tipoNome = role === 'post_sale' ? 'atendente pós-venda' : 'vendedor';
    if (!confirm(`Tem certeza que deseja remover este ${tipoNome}?`)) return;

    try {
      await deleteDoc(doc(db, 'roles', uid));
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      alert('Erro ao remover usuário');
    }
  };

  const openTypeSelector = () => {
    setShowTypeSelector(true);
  };

  const selectTypeAndOpenModal = (type: UserType) => {
    setSelectedType(type);
    setShowTypeSelector(false);
    setShowModal(true);
  };

  // Separar por tipo
  const vendedores = usuarios.filter(u => u.role === 'vendor');
  const atendentesPosvenda = usuarios.filter(u => u.role === 'post_sale');

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
              <h1 className="text-2xl font-black text-viva-blue-dark">Gerenciar Equipe</h1>
              <p className="text-gray-600 text-sm">Cadastrar vendedores e atendentes pós-venda</p>
            </div>
          </div>
          <button
            onClick={openTypeSelector}
            className="flex items-center gap-2 bg-gradient-to-r from-viva-blue to-viva-blue-dark text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition"
          >
            <UserPlus size={20} />
            Adicionar Usuário
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Seção Vendedores */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-viva-blue" size={24} />
            <h2 className="text-xl font-bold text-viva-blue-dark">Vendedores</h2>
            <span className="bg-viva-blue/10 text-viva-blue px-3 py-1 rounded-full text-sm font-bold">
              {vendedores.length}
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data Cadastro</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendedores.map((vendedor) => (
                  <tr key={vendedor.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{vendedor.name || vendedor.email}</td>
                    <td className="px-6 py-4 text-gray-600">{vendedor.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {vendedor.createdAt ? new Date(vendedor.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteUsuario(vendedor.uid, 'vendor')}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vendedores.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum vendedor cadastrado ainda
              </div>
            )}
          </div>
        </div>

        {/* Seção Atendentes Pós-Venda */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Headphones className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-purple-800">Atendentes Pós-Venda</h2>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
              {atendentesPosvenda.length}
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-purple-100">
            <table className="w-full">
              <thead className="bg-purple-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Data Cadastro</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {atendentesPosvenda.map((atendente) => (
                  <tr key={atendente.uid} className="hover:bg-purple-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{atendente.name || atendente.email}</td>
                    <td className="px-6 py-4 text-gray-600">{atendente.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {atendente.createdAt ? new Date(atendente.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteUsuario(atendente.uid, 'post_sale')}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {atendentesPosvenda.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum atendente pós-venda cadastrado ainda
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Seleção de Tipo */}
      {showTypeSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-black text-viva-blue-dark mb-2 text-center">Adicionar Novo Usuário</h2>
            <p className="text-gray-600 text-center mb-6">Selecione o tipo de usuário que deseja criar</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opção Vendedor */}
              <button
                onClick={() => selectTypeAndOpenModal('vendor')}
                className="group p-6 bg-gradient-to-br from-viva-blue/5 to-viva-blue/10 border-2 border-viva-blue/20 rounded-2xl hover:border-viva-blue hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-viva-blue to-viva-blue-dark rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="text-white" size={28} />
                </div>
                <h3 className="text-lg font-bold text-viva-blue-dark mb-2">Vendedor</h3>
                <p className="text-sm text-gray-600">
                  Pode criar e gerenciar reservas, vender ingressos e acompanhar seus clientes
                </p>
              </button>

              {/* Opção Pós-Venda */}
              <button
                onClick={() => selectTypeAndOpenModal('post_sale')}
                className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl hover:border-purple-500 hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Headphones className="text-white" size={28} />
                </div>
                <h3 className="text-lg font-bold text-purple-800 mb-2">Atendente Pós-Venda</h3>
                <p className="text-sm text-gray-600">
                  Acessa dados dos passageiros de barcos que já saíram para atendimento pós-viagem
                </p>
              </button>
            </div>

            <button
              onClick={() => setShowTypeSelector(false)}
              className="w-full mt-6 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal Criar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            {/* Header com ícone baseado no tipo */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedType === 'post_sale' 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                  : 'bg-gradient-to-br from-viva-blue to-viva-blue-dark'
              }`}>
                {selectedType === 'post_sale' ? (
                  <Headphones className="text-white" size={24} />
                ) : (
                  <Users className="text-white" size={24} />
                )}
              </div>
              <div>
                <h2 className={`text-2xl font-black ${
                  selectedType === 'post_sale' ? 'text-purple-800' : 'text-viva-blue-dark'
                }`}>
                  {selectedType === 'post_sale' ? 'Novo Atendente Pós-Venda' : 'Novo Vendedor'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {selectedType === 'post_sale' 
                    ? 'Acesso aos dados de passageiros' 
                    : 'Acesso para criar reservas'
                  }
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUsuario} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome (opcional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none ${
                    selectedType === 'post_sale' ? 'focus:ring-purple-500' : 'focus:ring-viva-blue'
                  }`}
                  placeholder={selectedType === 'post_sale' ? 'Nome do atendente' : 'Nome do vendedor'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none ${
                    selectedType === 'post_sale' ? 'focus:ring-purple-500' : 'focus:ring-viva-blue'
                  }`}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none ${
                    selectedType === 'post_sale' ? 'focus:ring-purple-500' : 'focus:ring-viva-blue'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setName('');
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-6 py-3 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 ${
                    selectedType === 'post_sale'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-700'
                      : 'bg-gradient-to-r from-viva-blue to-viva-blue-dark'
                  }`}
                >
                  {loading ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

