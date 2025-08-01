import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Save, User, ShoppingCart, DollarSign, Package, Search } from 'lucide-react';
import { RestaurantTable, TableSale, TableSaleItem, TableCartItem } from '../../types/table-sales';
import { usePDVProducts } from '../../hooks/usePDV';
import { supabase } from '../../lib/supabase';

interface TableSaleModalProps {
  table: RestaurantTable;
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated: (sale: TableSale) => void;
  storeId: number;
  operatorName?: string;
}

const TableSaleModal: React.FC<TableSaleModalProps> = ({
  table,
  isOpen,
  onClose,
  onSaleCreated,
  storeId,
  operatorName
}) => {
  const { products } = usePDVProducts();
  const [customerName, setCustomerName] = useState('');
  const [customerCount, setCustomerCount] = useState(1);
  const [cartItems, setCartItems] = useState<TableCartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'voucher' | 'misto'>('dinheiro');
  const [changeAmount, setChangeAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = () => {
    if (!selectedProduct) return;

    const existingIndex = cartItems.findIndex(item => item.product_code === selectedProduct.code);
    
    if (existingIndex >= 0) {
      // Update existing item
      setCartItems(prev => prev.map((item, index) => {
        if (index === existingIndex) {
          const newQuantity = item.quantity + quantity;
          return {
            ...item,
            quantity: newQuantity,
            subtotal: calculateItemSubtotal(selectedProduct, newQuantity, item.weight)
          };
        }
        return item;
      }));
    } else {
      // Add new item
      const newItem: TableCartItem = {
        product_code: selectedProduct.code,
        product_name: selectedProduct.name,
        quantity,
        unit_price: selectedProduct.unit_price,
        price_per_gram: selectedProduct.price_per_gram,
        subtotal: calculateItemSubtotal(selectedProduct, quantity),
        notes
      };
      setCartItems(prev => [...prev, newItem]);
    }

    setSelectedProduct(null);
    setQuantity(1);
    setNotes('');
    setSearchTerm('');
  };

  const removeFromCart = (productCode: string) => {
    setCartItems(prev => prev.filter(item => item.product_code !== productCode));
  };

  const updateCartItemQuantity = (productCode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productCode);
      return;
    }

    setCartItems(prev => prev.map(item => {
      if (item.product_code === productCode) {
        const product = products.find(p => p.code === productCode);
        return {
          ...item,
          quantity: newQuantity,
          subtotal: calculateItemSubtotal(product, newQuantity, item.weight)
        };
      }
      return item;
    }));
  };

  const calculateItemSubtotal = (product: any, quantity: number, weight?: number): number => {
    if (!product) return 0;
    
    if (product.is_weighable && weight && product.price_per_gram) {
      return weight * 1000 * product.price_per_gram;
    } else if (!product.is_weighable && product.unit_price) {
      return quantity * product.unit_price;
    }
    
    return 0;
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const getTotal = () => {
    return Math.max(0, getSubtotal() - discountAmount);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleSave = async () => {
    if (cartItems.length === 0) {
      alert('Adicione pelo menos um item ao pedido');
      return;
    }

    setSaving(true);
    try {
      const tableName = storeId === 1 ? 'store1_table_sales' : 'store2_table_sales';
      const itemsTableName = storeId === 1 ? 'store1_table_sale_items' : 'store2_table_sale_items';
      
      // Create sale
      const saleData = {
        table_id: table.id,
        operator_name: operatorName || 'Sistema',
        customer_name: customerName || null,
        customer_count: customerCount,
        subtotal: getSubtotal(),
        discount_amount: discountAmount,
        total_amount: getTotal(),
        payment_type: paymentType,
        change_amount: changeAmount,
        status: 'aberta',
        notes: notes || null,
        opened_at: new Date().toISOString()
      };

      const { data: sale, error: saleError } = await supabase
        .from(tableName)
        .insert([saleData])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cartItems.map(item => ({
        sale_id: sale.id,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity,
        weight_kg: item.weight,
        unit_price: item.unit_price,
        price_per_gram: item.price_per_gram,
        discount_amount: 0,
        subtotal: item.subtotal,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from(itemsTableName)
        .insert(saleItems);

      if (itemsError) {
        // Cleanup sale if items failed
        await supabase.from(tableName).delete().eq('id', sale.id);
        throw itemsError;
      }

      // Update table status
      const tablesTableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
      await supabase
        .from(tablesTableName)
        .update({
          status: 'ocupada',
          current_sale_id: sale.id
        })
        .eq('id', table.id);

      onSaleCreated(sale);
      onClose();

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Pedido criado para Mesa ${table.number}!
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);

    } catch (error) {
      console.error('Erro ao criar pedido da mesa:', error);
      alert('Erro ao criar pedido. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={24} className="text-green-600" />
                Mesa {table.number} - Novo Pedido
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Loja {storeId} • Capacidade: {table.capacity} pessoas
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Products */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Produtos</h3>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Products List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProduct?.id === product.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-800">{product.name}</h4>
                      <p className="text-sm text-gray-600">{product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {product.is_weighable 
                          ? `${formatPrice((product.price_per_gram || 0) * 1000)}/kg`
                          : formatPrice(product.unit_price || 0)
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Product Form */}
            {selectedProduct && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-3">{selectedProduct.name}</h4>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-medium">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Sem açúcar"
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={addToCart}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Adicionar ao Pedido
                </button>
              </div>
            )}
          </div>

          {/* Right Side - Cart and Customer Info */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações do Cliente</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cliente (opcional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Pessoas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={table.capacity}
                    value={customerCount}
                    onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Itens do Pedido</h3>
              
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p>Nenhum item adicionado</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {cartItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">
                            {item.quantity}x {formatPrice(item.unit_price || 0)}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 italic">Obs: {item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-600">
                            {formatPrice(item.subtotal)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.product_code)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.product_code, item.quantity - 1)}
                          className="p-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(item.product_code, item.quantity + 1)}
                          className="p-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Pagamento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="voucher">Voucher</option>
                    <option value="misto">Misto</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {paymentType === 'dinheiro' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Troco (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={changeAmount}
                    onChange={(e) => setChangeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-800 mb-3">Resumo</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(getSubtotal())}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto:</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span className="text-green-600">{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || cartItems.length === 0}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Criar Pedido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableSaleModal;