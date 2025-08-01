import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Settings,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  MapPin,
  Hash,
  User,
  ShoppingCart,
  Clock
} from 'lucide-react';
import { RestaurantTable, TableSale, TableCartItem } from '../../types/table-sales';

interface TableSalesPanelProps {
  storeId: number;
  operatorName?: string;
}

const TableSalesPanel: React.FC<TableSalesPanelProps> = ({ storeId, operatorName }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);

  // Check Supabase configuration
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const isConfigured = supabaseUrl && supabaseKey && 
                        supabaseUrl !== 'your_supabase_url_here' && 
                        supabaseKey !== 'your_supabase_anon_key_here' &&
                        !supabaseUrl.includes('placeholder');
    
    setSupabaseConfigured(isConfigured);
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseConfigured) {
        console.warn('⚠️ Supabase não configurado - usando dados de demonstração');
        
        // Dados de demonstração
        const demoTables: RestaurantTable[] = [
          {
            id: 'demo-1',
            number: 1,
            name: 'Mesa 1',
            capacity: 4,
            status: 'livre',
            location: 'Área Principal',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'demo-2',
            number: 2,
            name: 'Mesa 2',
            capacity: 2,
            status: 'livre',
            location: 'Área Principal',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        setTables(demoTables);
        setLoading(false);
        return;
      }

      console.log(`🔄 Carregando mesas da Loja ${storeId}...`);
      
      const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('number');

      if (error) throw error;

      setTables(data || []);
      console.log(`✅ ${data?.length || 0} mesas carregadas da Loja ${storeId}`);
    } catch (err) {
      console.error(`❌ Erro ao carregar mesas da Loja ${storeId}:`, err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas');
    } finally {
      setLoading(false);
    }
  };

  const createTable = async (tableData: Omit<RestaurantTable, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!supabaseConfigured) {
        // Fallback para localStorage se Supabase não configurado
        const newTable: RestaurantTable = {
          ...tableData,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setTables(prev => [...prev, newTable]);
        return newTable;
      }

      console.log(`🚀 Criando mesa na Loja ${storeId}:`, tableData);
      
      const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([tableData])
        .select()
        .single();

      if (error) throw error;
      
      setTables(prev => [...prev, data]);
      console.log(`✅ Mesa criada na Loja ${storeId}:`, data);
      return data;
    } catch (err) {
      console.error(`❌ Erro ao criar mesa na Loja ${storeId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar mesa');
    }
  };

  const updateTable = async (id: string, updates: Partial<RestaurantTable>) => {
    try {
      if (!supabaseConfigured) {
        // Fallback para localStorage se Supabase não configurado
        setTables(prev => prev.map(table => 
          table.id === id ? { ...table, ...updates, updated_at: new Date().toISOString() } : table
        ));
        return;
      }

      console.log(`✏️ Atualizando mesa ${id} na Loja ${storeId}:`, updates);
      
      const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
      
      const { data, error } = await supabase
        .from(tableName)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTables(prev => prev.map(table => table.id === id ? data : table));
      console.log(`✅ Mesa atualizada na Loja ${storeId}:`, data);
      return data;
    } catch (err) {
      console.error(`❌ Erro ao atualizar mesa na Loja ${storeId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar mesa');
    }
  };

  const deleteTable = async (id: string) => {
    try {
      if (!supabaseConfigured) {
        // Fallback para localStorage se Supabase não configurado
        setTables(prev => prev.filter(table => table.id !== id));
        return;
      }

      console.log(`🔒 Desativando mesa ${id} da Loja ${storeId}`);
      
      const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
      
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      setTables(prev => prev.map(table => 
        table.id === id ? { ...table, is_active: false } : table
      ));
      console.log(`✅ Mesa desativada da Loja ${storeId}`);
    } catch (err) {
      console.error(`❌ Erro ao desativar mesa da Loja ${storeId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao desativar mesa');
    }
  };

  const handleCreate = () => {
    const nextNumber = Math.max(...tables.map(t => t.number), 0) + 1;
    setEditingTable({
      id: '',
      number: nextNumber,
      name: `Mesa ${nextNumber}`,
      capacity: 4,
      status: 'livre',
      location: 'Área Principal',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingTable) return;

    if (!editingTable.name.trim()) {
      alert('Nome da mesa é obrigatório');
      return;
    }

    // Verificar se número já existe
    const existingTable = tables.find(t => 
      t.number === editingTable.number && t.id !== editingTable.id
    );
    if (existingTable) {
      alert('Número da mesa já existe. Use um número diferente.');
      return;
    }

    setSaving(true);
    
    try {
      if (isCreating) {
        const { id, created_at, updated_at, ...tableData } = editingTable;
        await createTable(tableData);
      } else {
        await updateTable(editingTable.id, editingTable);
      }
      
      setEditingTable(null);
      setIsCreating(false);
      
      // Mostrar feedback de sucesso
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Mesa ${isCreating ? 'criada' : 'atualizada'} com sucesso!
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar mesa:', error);
      alert(`Erro ao salvar mesa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja desativar a mesa "${name}"?\n\nA mesa será removida da lista ativa, mas os dados de vendas serão preservados.`)) {
      try {
        await deleteTable(id);
      } catch (error) {
        console.error('Erro ao desativar mesa:', error);
        alert('Erro ao desativar mesa');
      }
    }
  };

  const handleToggleActive = async (table: RestaurantTable) => {
    try {
      await updateTable(table.id, { is_active: !table.is_active });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
    }
  };

  const handleOpenTable = (table: RestaurantTable) => {
    console.log(`🍽️ Abrindo mesa ${table.number} da Loja ${storeId}`);
    setSelectedTable(table);
    setShowSaleModal(true);
  };

  const handleTableAction = (table: RestaurantTable) => {
    switch (table.status) {
      case 'livre':
        handleOpenTable(table);
        break;
      case 'ocupada':
        // Ver pedido ativo
        console.log(`👀 Visualizando pedido da mesa ${table.number}`);
        alert(`Funcionalidade "Ver Pedido" será implementada em breve.\n\nMesa ${table.number} está ocupada.`);
        break;
      case 'aguardando_conta':
        // Fechar conta
        console.log(`💰 Fechando conta da mesa ${table.number}`);
        alert(`Funcionalidade "Fechar Conta" será implementada em breve.\n\nMesa ${table.number} aguardando fechamento.`);
        break;
      case 'limpeza':
        // Marcar como limpa
        console.log(`🧹 Marcando mesa ${table.number} como limpa`);
        updateTable(table.id, { status: 'livre' });
        break;
      default:
        console.log(`❓ Status desconhecido para mesa ${table.number}: ${table.status}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre': return 'bg-green-100 text-green-800';
      case 'ocupada': return 'bg-red-100 text-red-800';
      case 'aguardando_conta': return 'bg-yellow-100 text-yellow-800';
      case 'limpeza': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'livre': return 'Livre';
      case 'ocupada': return 'Ocupada';
      case 'aguardando_conta': return 'Aguardando Conta';
      case 'limpeza': return 'Limpeza';
      default: return status;
    }
  };

  useEffect(() => {
    fetchTables();
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando mesas da Loja {storeId}...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Supabase Configuration Warning */}
      {!supabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-full p-2">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Modo Demonstração</h3>
              <p className="text-yellow-700 text-sm">
                Supabase não configurado. Funcionalidades limitadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            Vendas por Mesa - Loja {storeId}
          </h2>
          <p className="text-gray-600">Gerencie vendas presenciais por mesa</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManageModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings size={20} />
            Gerenciar Mesas
          </button>
          <button
            onClick={fetchTables}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.filter(table => table.is_active).map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all hover:shadow-md ${
              table.status === 'livre' ? 'border-green-200' :
              table.status === 'ocupada' ? 'border-red-200' :
              table.status === 'aguardando_conta' ? 'border-yellow-200' :
              'border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  table.status === 'livre' ? 'bg-green-500' :
                  table.status === 'ocupada' ? 'bg-red-500' :
                  table.status === 'aguardando_conta' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}></div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Mesa {table.number}
                </h3>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                {getStatusLabel(table.status)}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>Capacidade: {table.capacity} pessoas</span>
              </div>
              {table.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{table.location}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleTableAction(table)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  table.status === 'livre'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : table.status === 'ocupada'
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : table.status === 'aguardando_conta'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {table.status === 'livre' ? 'Abrir Mesa' :
                 table.status === 'ocupada' ? 'Ver Pedido' :
                 table.status === 'aguardando_conta' ? 'Fechar Conta' :
                 'Marcar como Limpa'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {tables.filter(table => table.is_active).length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Nenhuma mesa ativa
          </h3>
          <p className="text-gray-500 mb-4">
            Configure as mesas da Loja {storeId} para começar a usar o sistema.
          </p>
          <button
            onClick={() => setShowManageModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Gerenciar Mesas
          </button>
        </div>
      )}

      {/* Table Sale Modal */}
      {showSaleModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <ShoppingCart size={24} className="text-green-600" />
                    Mesa {selectedTable.number} - Nova Venda
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Loja {storeId} • Capacidade: {selectedTable.capacity} pessoas
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedTable(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <User size={18} />
                    Informações do Cliente (Opcional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Cliente
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome (opcional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Pessoas
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedTable.capacity}
                        defaultValue="1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-3">Ações Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        // Abrir mesa sem pedido específico
                        updateTable(selectedTable.id, { 
                          status: 'ocupada',
                          current_sale_id: undefined 
                        });
                        setShowSaleModal(false);
                        setSelectedTable(null);
                        
                        // Feedback de sucesso
                        const successMessage = document.createElement('div');
                        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
                        successMessage.innerHTML = `
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          Mesa ${selectedTable.number} aberta com sucesso!
                        `;
                        document.body.appendChild(successMessage);
                        
                        setTimeout(() => {
                          if (document.body.contains(successMessage)) {
                            document.body.removeChild(successMessage);
                          }
                        }, 3000);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock size={18} />
                      Apenas Abrir Mesa
                    </button>
                    
                    <button
                      onClick={() => {
                        alert('Funcionalidade "Iniciar Pedido" será implementada em breve.\n\nPor enquanto, use "Apenas Abrir Mesa" para marcar a mesa como ocupada.');
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      Iniciar Pedido
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-gray-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">ℹ️ Sobre o Sistema de Mesas</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• <strong>Abrir Mesa:</strong> Marca a mesa como ocupada</li>
                        <li>• <strong>Iniciar Pedido:</strong> Cria uma venda específica para a mesa</li>
                        <li>• <strong>Status automático:</strong> Atualizado conforme as ações</li>
                        <li>• <strong>Histórico preservado:</strong> Vendas antigas são mantidas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowSaleModal(false);
                  setSelectedTable(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Tables Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Settings size={24} className="text-indigo-600" />
                    Gerenciar Mesas - Loja {storeId}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">Configure as mesas disponíveis para atendimento</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreate}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Nova Mesa
                  </button>
                  <button
                    onClick={() => {
                      setShowManageModal(false);
                      setEditingTable(null);
                      setIsCreating(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Tables List */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Mesas Cadastradas</h3>
                
                {tables.length === 0 ? (
                  <div className="text-center py-8">
                    <Users size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Nenhuma mesa cadastrada</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Número</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Nome</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Capacidade</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Localização</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Ativo</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {tables.map((table) => (
                          <tr key={table.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Hash size={16} className="text-gray-400" />
                                <span className="font-medium text-gray-800">{table.number}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-700">{table.name}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <User size={14} className="text-gray-400" />
                                <span className="text-gray-700">{table.capacity}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-600">{table.location || '-'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                                {getStatusLabel(table.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleActive(table)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                  table.is_active
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                              >
                                {table.is_active ? (
                                  <>
                                    <Eye size={12} />
                                    Ativo
                                  </>
                                ) : (
                                  <>
                                    <EyeOff size={12} />
                                    Inativo
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingTable(table);
                                    setIsCreating(false);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Editar mesa"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(table.id, table.name)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Desativar mesa"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Edit/Create Form */}
              {editingTable && (
                <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {isCreating ? 'Nova Mesa' : 'Editar Mesa'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número da Mesa *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingTable.number}
                        onChange={(e) => setEditingTable({
                          ...editingTable,
                          number: parseInt(e.target.value) || 1
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: 1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome da Mesa *
                      </label>
                      <input
                        type="text"
                        value={editingTable.name}
                        onChange={(e) => setEditingTable({
                          ...editingTable,
                          name: e.target.value
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: Mesa VIP, Mesa da Janela"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacidade (pessoas)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={editingTable.capacity}
                        onChange={(e) => setEditingTable({
                          ...editingTable,
                          capacity: parseInt(e.target.value) || 4
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Localização
                      </label>
                      <input
                        type="text"
                        value={editingTable.location || ''}
                        onChange={(e) => setEditingTable({
                          ...editingTable,
                          location: e.target.value
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: Área Principal, Varanda, Terraço"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status Inicial
                      </label>
                      <select
                        value={editingTable.status}
                        onChange={(e) => setEditingTable({
                          ...editingTable,
                          status: e.target.value as any
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="livre">Livre</option>
                        <option value="ocupada">Ocupada</option>
                        <option value="aguardando_conta">Aguardando Conta</option>
                        <option value="limpeza">Limpeza</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingTable.is_active}
                          onChange={(e) => setEditingTable({
                            ...editingTable,
                            is_active: e.target.checked
                          })}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Mesa ativa
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setEditingTable(null);
                        setIsCreating(false);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !editingTable.name.trim()}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {isCreating ? 'Criar Mesa' : 'Salvar Alterações'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre o Sistema */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 mb-2">ℹ️ Sistema de Vendas por Mesa</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• As mesas são específicas da Loja {storeId}</li>
              <li>• Cada mesa pode ter um pedido ativo por vez</li>
              <li>• Status são atualizados automaticamente conforme as vendas</li>
              <li>• Mesas inativas não aparecem no painel principal</li>
              <li>• Configure a capacidade para melhor organização</li>
              <li>• A localização ajuda na identificação das mesas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSalesPanel;