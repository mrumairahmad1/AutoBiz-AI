import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  X,
  ChevronRight,
  AlertTriangle,
  Package,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Screen, InventoryItem } from '../types';
import { BottomNav } from './Dashboard';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { useState, useEffect } from 'react';

interface InventoryProps {
  onNavigate: (screen: Screen) => void;
}

const EMPTY_FORM = {
  name: '', sku: '', quantity: '', reorder_point: '',
  reorder_quantity: '', unit_cost: '', holding_cost: '',
  ordering_cost: '', supplier: '', supplier_lead_days: '',
};

export default function Inventory({ onNavigate }: InventoryProps) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await API.get('/inventory/');
      setItems(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.supplier?.toLowerCase().includes(q)
      )
    );
  }, [search, items]);

  const handleAdd = async () => {
    setFormError('');
    const qty = parseInt(form.quantity, 10);
    if (!form.name || !form.sku) { setFormError('Name and SKU are required.'); return; }
    if (isNaN(qty) || qty < 0) { setFormError('Quantity must be a valid number.'); return; }
    setSaving(true);
    try {
      await API.post('/inventory/add', {
        name: form.name.trim(),
        sku: form.sku.trim(),
        quantity: qty,
        reorder_point: parseInt(form.reorder_point, 10) || 0,
        reorder_quantity: parseInt(form.reorder_quantity, 10) || 0,
        unit_cost: parseFloat(form.unit_cost) || 0,
        holding_cost: parseFloat(form.holding_cost) || 0,
        ordering_cost: parseFloat(form.ordering_cost) || 0,
        supplier: form.supplier.trim() || null,
        supplier_lead_days: parseInt(form.supplier_lead_days, 10) || 0,
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchItems();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error saving item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await API.delete(`/inventory/${id}`);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const lowStockCount = items.filter((i) => i.quantity <= i.reorder_point).length;

  return (
    <motion.div
      className="bg-background text-on-background min-h-screen pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <header className="bg-surface flex items-center px-6 py-4 w-full sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#0070f3" />
            <path d="M16 4L8 28l1 1 7-3 7 3 1-1L16 4Z" fill="white" opacity="0.95" />
            <rect x="10" y="14" width="12" height="1.5" rx="0.75" fill="white" opacity="0.5" />
          </svg>
          <span className="text-xl font-extrabold tracking-tighter text-white font-headline">
            AutoBiz AI
          </span>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6 pb-8">
        <section>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-white mb-4">
            Inventory
          </h1>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-outline" />
            </div>
            <input
              className="w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 outline-none text-sm"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items, SKUs, suppliers..."
              type="text"
              value={search}
            />
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-4 rounded-[16px] space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-outline">
              Total SKUs
            </span>
            <div className="text-2xl font-mono text-white">{items.length}</div>
          </div>
          <div className="bg-surface-container-low p-4 rounded-[16px] space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-tertiary">
              Low Stock
            </span>
            <div className="text-2xl font-mono text-tertiary">{lowStockCount}</div>
          </div>
        </section>

        {/* Viewer notice */}
        {!canEdit && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-primary/5 border border-primary/20 text-primary text-xs font-medium">
            View Only — You have viewer access
          </div>
        )}

        {/* List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-outline">
              All Items
            </h3>
            <Filter size={15} className="text-outline" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 bg-surface-container-low rounded-[16px] text-center">
              <p className="text-on-surface-variant text-sm">No items found.</p>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-[16px] overflow-hidden">
              {filtered.map((item, i) => {
                const isLow = item.quantity <= item.reorder_point;
                return (
                  <motion.div
                    key={item.id}
                    className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-bright transition-all ${i > 0 ? 'border-t border-outline-variant/10' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="font-headline font-bold text-primary text-sm uppercase">
                        {item.name.slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-on-surface font-semibold truncate text-sm">
                          {item.name}
                        </h4>
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                            isLow
                              ? 'text-tertiary bg-tertiary/10'
                              : 'text-secondary bg-secondary/10'
                          }`}
                        >
                          Qty: {item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] font-mono text-outline uppercase">
                          SKU: {item.sku}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {isLow ? (
                            <AlertTriangle size={10} className="text-tertiary" />
                          ) : (
                            <CheckCircle size={10} className="text-secondary" />
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              isLow ? 'text-tertiary' : 'text-secondary'
                            }`}
                          >
                            {isLow ? 'Low Stock' : 'Healthy'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-outline flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Detail bottom sheet */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              className="bg-surface-container-high rounded-t-[24px] p-6 space-y-5"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto" />

              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold font-headline text-white">
                    {selectedItem.name}
                  </h2>
                  <p className="text-xs font-mono text-outline mt-1 uppercase">
                    SKU: {selectedItem.sku}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${
                    selectedItem.quantity <= selectedItem.reorder_point
                      ? 'bg-tertiary-container/20 text-tertiary'
                      : 'bg-secondary/10 text-secondary'
                  }`}
                >
                  {selectedItem.quantity <= selectedItem.reorder_point
                    ? 'Low Stock'
                    : 'In Stock'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Current Qty', val: `${selectedItem.quantity} units` },
                  { label: 'Reorder Point', val: `${selectedItem.reorder_point} units` },
                  { label: 'Unit Cost', val: `$${selectedItem.unit_cost}` },
                  { label: 'Lead Days', val: `${selectedItem.supplier_lead_days} days` },
                  { label: 'EOQ', val: `${Math.round(Math.sqrt((2 * selectedItem.quantity * 12 * selectedItem.ordering_cost) / (selectedItem.holding_cost || 1)))} units` },
                  { label: 'Supplier', val: selectedItem.supplier || 'N/A' },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-surface-container-lowest p-3 rounded-xl">
                    <span className="text-[10px] font-semibold text-outline uppercase tracking-wider block mb-1">
                      {label}
                    </span>
                    <div className="text-sm font-mono text-white">{val}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                {canEdit && (
                  <>
                    <button
                      className="flex-1 py-4 bg-error-container/10 border border-error/20 text-error font-bold rounded-xl active:scale-95 transition-all text-sm"
                      onClick={() => handleDelete(selectedItem.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="flex-1 py-4 bg-primary-container text-on-primary-container font-bold rounded-xl shadow-[0_0_20px_rgba(0,112,243,0.3)] active:scale-95 transition-all text-sm"
                      onClick={() => {
                        setSelectedItem(null);
                        onNavigate(Screen.PurchaseOrders);
                      }}
                    >
                      Create PO
                    </button>
                  </>
                )}
                {!canEdit && (
                  <button
                    className="w-full py-4 bg-surface-container-low text-on-surface font-bold rounded-xl active:scale-95 transition-all text-sm"
                    onClick={() => setSelectedItem(null)}
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add item modal */}
      <AnimatePresence>
        {showAdd && canEdit && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              className="bg-surface-container-high rounded-t-[24px] p-6 space-y-4 max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto" />
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold font-headline text-white">Add Item</h2>
                <button onClick={() => setShowAdd(false)}>
                  <X size={20} className="text-outline" />
                </button>
              </div>

              {formError && (
                <div className="px-4 py-3 rounded-[10px] bg-error-container/10 border border-error/30 text-error text-xs">
                  {formError}
                </div>
              )}

              <div className="space-y-3">
                {[
                  { key: 'name', label: 'Product Name', type: 'text' },
                  { key: 'sku', label: 'SKU', type: 'text' },
                  { key: 'quantity', label: 'Quantity', type: 'number' },
                  { key: 'reorder_point', label: 'Reorder Point', type: 'number' },
                  { key: 'reorder_quantity', label: 'Reorder Quantity', type: 'number' },
                  { key: 'unit_cost', label: 'Unit Cost ($)', type: 'number' },
                  { key: 'holding_cost', label: 'Holding Cost ($)', type: 'number' },
                  { key: 'ordering_cost', label: 'Ordering Cost ($)', type: 'number' },
                  { key: 'supplier', label: 'Supplier', type: 'text' },
                  { key: 'supplier_lead_days', label: 'Lead Days', type: 'number' },
                ].map(({ key, label, type }) => (
                  <div key={key} className="relative">
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-[10px] py-4 px-4 text-on-surface focus:border-primary/40 focus:outline-none transition-all peer placeholder-transparent text-sm"
                      min={type === 'number' ? '0' : undefined}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder=" "
                      step={['unit_cost', 'holding_cost', 'ordering_cost'].includes(key) ? '0.01' : '1'}
                      type={type}
                      value={(form as any)[key]}
                    />
                    <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]">
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              <button
                className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl shadow-[0_0_20px_rgba(0,112,243,0.3)] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                disabled={saving}
                onClick={handleAdd}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {canEdit && (
        <button
          className="fixed right-6 bottom-24 w-14 h-14 bg-primary-container text-on-primary-container rounded-full shadow-[0_0_30px_rgba(0,112,243,0.5)] flex items-center justify-center z-40 active:scale-90 transition-transform"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={24} />
        </button>
      )}

      <BottomNav activeScreen={Screen.Inventory} onNavigate={onNavigate} />
    </motion.div>
  );
}