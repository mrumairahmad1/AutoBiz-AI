import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ShieldCheck, Plus, Loader2 } from 'lucide-react';
import { Screen, PurchaseOrder } from '../types';
import { BottomNav } from './Dashboard';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { useState, useEffect } from 'react';

interface PurchaseOrdersProps {
  onNavigate: (screen: Screen) => void;
}

type FilterType = 'All' | 'Pending' | 'Approved' | 'Rejected';

const EMPTY_FORM = {
  product: '', sku: '', quantity: '', unit_cost: '', supplier: '', notes: '',
};

export default function PurchaseOrders({ onNavigate }: PurchaseOrdersProps) {
  const { user } = useAuth();
  const canApprove = user?.role === 'admin' || user?.role === 'manager';

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await API.get('/purchase-orders/');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter((o) =>
    filter === 'All' ? true : o.status.toLowerCase() === filter.toLowerCase()
  );

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this purchase order? Inventory will be updated automatically.')) return;
    setActionLoading(id);
    try {
      await API.post(`/purchase-orders/${id}/approve`, { notes: 'Approved via mobile app' });
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Reject this purchase order?')) return;
    setActionLoading(id);
    try {
      await API.post(`/purchase-orders/${id}/reject`, { notes: 'Rejected via mobile app' });
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    setFormError('');
    const qty = parseInt(form.quantity, 10);
    const cost = parseFloat(form.unit_cost);
    if (!form.product || !form.sku) { setFormError('Product and SKU are required.'); return; }
    if (isNaN(qty) || qty <= 0) { setFormError('Quantity must be a positive number.'); return; }
    if (isNaN(cost) || cost <= 0) { setFormError('Unit cost must be a positive number.'); return; }
    setSaving(true);
    try {
      await API.post('/purchase-orders/', {
        product: form.product.trim(),
        sku: form.sku.trim(),
        quantity: qty,
        unit_cost: cost,
        supplier: form.supplier.trim() || null,
        notes: form.notes.trim() || null,
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchOrders();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error creating purchase order.');
    } finally {
      setSaving(false);
    }
  };

  const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
    pending:  { color: 'text-tertiary',  bg: 'bg-tertiary/10',  border: 'border-tertiary'  },
    approved: { color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary' },
    rejected: { color: 'text-error',     bg: 'bg-error/10',     border: 'border-error'     },
  };

  return (
    <motion.div
      className="bg-background text-on-surface min-h-screen pb-32"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <nav className="bg-surface flex items-center px-6 py-4 w-full fixed top-0 z-50">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#0070f3" />
            <path d="M16 4L8 28l1 1 7-3 7 3 1-1L16 4Z" fill="white" opacity="0.95" />
            <rect x="10" y="14" width="12" height="1.5" rx="0.75" fill="white" opacity="0.5" />
          </svg>
          <h1 className="text-xl font-extrabold tracking-tighter text-white font-headline">
            AutoBiz AI
          </h1>
        </div>
      </nav>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        <header className="mb-6">
          <h2 className="text-4xl font-bold tracking-tight text-white font-headline mb-2">
            Purchase Orders
          </h2>
          <p className="text-on-surface-variant text-sm">
            Manage procurement and vendor approvals.
          </p>
        </header>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
          {(['All', 'Pending', 'Approved', 'Rejected'] as FilterType[]).map((f) => (
            <button
              key={f}
              className={`px-5 py-2 rounded-full font-semibold text-sm transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-primary-container text-on-primary-container shadow-[0_0_20px_rgba(0,112,243,0.3)]'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-bright'
              }`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 bg-surface-container-low rounded-[16px] text-center">
            <p className="text-on-surface-variant text-sm">No {filter.toLowerCase()} orders.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((po, i) => {
              const sc = statusConfig[po.status] || statusConfig.pending;
              return (
                <motion.div
                  key={po.id}
                  className={`bg-surface-container-low rounded-[16px] p-5 border-l-4 ${sc.border}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-[10px] font-mono tracking-widest uppercase mb-1 block ${sc.color}`}>
                        PO-{String(po.id).padStart(4, '0')}
                      </span>
                      <h3 className="text-xl font-bold text-white font-headline">
                        {po.product}
                      </h3>
                      {po.supplier && (
                        <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                          {po.supplier}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sc.bg} ${sc.color}`}>
                      {po.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-on-surface-variant text-xs mb-1">Total Cost</p>
                      <p className="text-2xl font-mono font-semibold text-white tracking-tighter">
                        ${po.total_cost?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-outline font-mono mt-1">
                        Qty: {po.quantity} · SKU: {po.sku}
                      </p>
                    </div>

                    {po.status === 'pending' && canApprove ? (
                      <div className="flex gap-2">
                        <button
                          className="w-10 h-10 rounded-xl bg-error-container/20 text-error flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
                          disabled={actionLoading === po.id}
                          onClick={() => handleReject(po.id)}
                        >
                          {actionLoading === po.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <X size={18} />
                          )}
                        </button>
                        <button
                          className="px-4 h-10 rounded-xl bg-primary-container text-on-primary-container font-semibold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(0,112,243,0.2)] active:scale-95 transition-all disabled:opacity-50"
                          disabled={actionLoading === po.id}
                          onClick={() => handleApprove(po.id)}
                        >
                          {actionLoading === po.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} strokeWidth={3} />
                          )}
                          Approve
                        </button>
                      </div>
                    ) : (
                      <div className="text-on-surface-variant text-xs flex items-center gap-1 italic">
                        {po.status === 'approved' && (
                          <>
                            <ShieldCheck size={13} />
                            <span>By {po.approved_by || 'manager'}</span>
                          </>
                        )}
                        {po.status === 'rejected' && (
                          <span>{po.notes || 'Rejected'}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create PO bottom sheet */}
      <AnimatePresence>
        {showAdd && (
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
                <h2 className="text-xl font-bold font-headline text-white">New Purchase Order</h2>
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
                  { key: 'product',    label: 'Product Name', type: 'text',   placeholder: 'e.g. Wireless Mouse' },
                  { key: 'sku',        label: 'SKU',          type: 'text',   placeholder: 'e.g. MOU-001' },
                  { key: 'quantity',   label: 'Quantity',     type: 'number', placeholder: 'e.g. 50' },
                  { key: 'unit_cost',  label: 'Unit Cost ($)', type: 'number', placeholder: 'e.g. 45.00' },
                  { key: 'supplier',   label: 'Supplier',     type: 'text',   placeholder: 'e.g. AccessoriesWorld' },
                  { key: 'notes',      label: 'Notes',        type: 'text',   placeholder: 'Optional notes' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key} className="relative">
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-[10px] py-4 px-4 text-on-surface focus:border-primary/40 focus:outline-none transition-all peer placeholder-transparent text-sm"
                      min={type === 'number' ? '0' : undefined}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder=" "
                      step={key === 'unit_cost' ? '0.01' : '1'}
                      type={type}
                      value={(form as any)[key]}
                    />
                    <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]">
                      {label}
                    </label>
                  </div>
                ))}

                {form.quantity && form.unit_cost && (
                  <div className="px-4 py-3 bg-surface-container-lowest rounded-[10px] flex justify-between items-center">
                    <span className="text-xs text-outline font-mono">Total Cost</span>
                    <span className="text-white font-mono font-bold">
                      ${(parseInt(form.quantity || '0', 10) * parseFloat(form.unit_cost || '0')).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <button
                className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl shadow-[0_0_20px_rgba(0,112,243,0.3)] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                disabled={saving}
                onClick={handleCreate}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                {saving ? 'Creating...' : 'Create Purchase Order'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary-container text-on-primary-container shadow-[0_0_30px_rgba(0,112,243,0.5)] flex items-center justify-center z-40 active:scale-95 transition-transform"
        onClick={() => setShowAdd(true)}
      >
        <Plus size={28} />
      </button>

      <BottomNav activeScreen={Screen.PurchaseOrders} onNavigate={onNavigate} />
    </motion.div>
  );
}