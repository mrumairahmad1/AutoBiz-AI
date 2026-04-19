import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Plus, Loader2, X, Trash2 } from 'lucide-react';
import { Screen, SaleRecord } from '../types';
import { BottomNav } from './Dashboard';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { useState, useEffect } from 'react';

interface SalesRecordsProps {
  onNavigate: (screen: Screen) => void;
}

const EMPTY_FORM = {
  product: '', sku: '', quantity: '', amount: '', category: '',
};

export default function SalesRecords({ onNavigate }: SalesRecordsProps) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSales = async () => {
    try {
      const res = await API.get('/sales/');
      setSales(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.product.trim()) errors.product = 'Required';
    if (!form.sku.trim()) errors.sku = 'Required';
    const qty = Number(form.quantity);
    if (!form.quantity || !Number.isInteger(qty) || qty <= 0)
      errors.quantity = 'Must be a positive integer';
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0)
      errors.amount = 'Must be a positive number';
    if (!form.category.trim()) errors.category = 'Required';
    return errors;
  };

  const handleAdd = async () => {
    setSubmitError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      await API.post('/sales/add', {
        product: form.product.trim(),
        sku: form.sku.trim(),
        quantity: parseInt(form.quantity, 10),
        amount: parseFloat(form.amount),
        category: form.category.trim(),
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchSales();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const detail = err.response.data?.detail;
        if (Array.isArray(detail)) {
          const mapped: Record<string, string> = {};
          detail.forEach((d: any) => {
            const field = d.loc?.[d.loc.length - 1];
            if (field) mapped[field] = d.msg;
          });
          setFieldErrors(mapped);
          setSubmitError('Please fix the highlighted fields.');
        } else {
          setSubmitError(typeof detail === 'string' ? detail : 'Validation error.');
        }
      } else {
        setSubmitError(err.response?.data?.detail || 'Error saving sale.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sale record?')) return;
    try {
      await API.delete(`/sales/${id}`);
      fetchSales();
    } catch (err) {
      console.error(err);
    }
  };

  const totalRevenue = sales.reduce((s, r) => s + (r.amount || 0), 0);
  const totalUnits = sales.reduce((s, r) => s + (r.quantity || 0), 0);
  const sorted = [...sales].sort(
    (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
  );

  return (
    <motion.div
      className="bg-background text-on-surface font-sans min-h-screen pb-32"
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
          <h1 className="text-xl font-extrabold tracking-tighter text-white font-headline">
            AutoBiz AI
          </h1>
        </div>
      </header>

      <main className="pb-32 pt-4 px-6 max-w-2xl mx-auto">
        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container-high rounded-[16px] p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/10 rounded-full blur-2xl" />
            <p className="text-[10px] font-semibold tracking-wider text-outline uppercase mb-1">
              Total Revenue
            </p>
            <h2 className="text-2xl font-bold font-mono tracking-tight text-white">
              ${totalRevenue.toLocaleString()}
            </h2>
            <div className="flex items-center gap-1 mt-2 text-secondary text-xs">
              <TrendingUp size={13} />
              <span>{sales.length} transactions</span>
            </div>
          </div>
          <div className="bg-surface-container-high rounded-[16px] p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/10 rounded-full blur-2xl" />
            <p className="text-[10px] font-semibold tracking-wider text-outline uppercase mb-1">
              Units Sold
            </p>
            <h2 className="text-2xl font-bold font-mono tracking-tight text-white">
              {totalUnits}
            </h2>
            <div className="flex items-center gap-1 mt-2 text-primary text-xs font-mono">
              <span>All time</span>
            </div>
          </div>
        </section>

        {/* Viewer notice */}
        {!canEdit && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-primary/5 border border-primary/20 text-primary text-xs font-medium mb-6">
            View Only — You have viewer access
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold font-headline tracking-tight">Recent Sales</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 bg-surface-container-low rounded-[16px] text-center">
            <p className="text-on-surface-variant text-sm">No sales records yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((record, i) => (
              <motion.div
                key={record.id}
                className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center">
                    <span className="font-headline font-bold text-primary-container text-sm uppercase">
                      {record.product.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{record.product}</h4>
                    <p className="text-xs text-outline font-mono">
                      SKU: {record.sku} · {record.category}
                    </p>
                    <p className="text-[10px] text-outline font-mono mt-0.5">
                      {new Date(record.sale_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono text-white">
                      ${record.amount?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-secondary font-semibold">
                      Qty: {record.quantity}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      className="w-8 h-8 rounded-lg bg-error-container/10 text-error flex items-center justify-center active:scale-95 transition-all"
                      onClick={() => handleDelete(record.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Add form bottom sheet */}
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
                <h2 className="text-xl font-bold font-headline text-white">Add Sale</h2>
                <button onClick={() => setShowAdd(false)}>
                  <X size={20} className="text-outline" />
                </button>
              </div>

              {submitError && (
                <div className="px-4 py-3 rounded-[10px] bg-error-container/10 border border-error/30 text-error text-xs">
                  {submitError}
                </div>
              )}

              <div className="space-y-3">
                {[
                  { key: 'product',  label: 'Product Name',  type: 'text',   placeholder: 'e.g. Wireless Mouse' },
                  { key: 'sku',      label: 'SKU',            type: 'text',   placeholder: 'e.g. MOU-001' },
                  { key: 'quantity', label: 'Quantity',       type: 'number', placeholder: 'e.g. 10' },
                  { key: 'amount',   label: 'Amount ($)',     type: 'number', placeholder: 'e.g. 250.00' },
                  { key: 'category', label: 'Category',       type: 'text',   placeholder: 'e.g. Electronics' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <div className="relative">
                      <input
                        className={`w-full bg-surface-container-lowest border rounded-[10px] py-4 px-4 text-on-surface focus:outline-none transition-all peer placeholder-transparent text-sm ${
                          fieldErrors[key]
                            ? 'border-error/50 focus:border-error/70'
                            : 'border-outline-variant/20 focus:border-primary/40'
                        }`}
                        min={type === 'number' ? '0' : undefined}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, [key]: e.target.value }));
                          if (fieldErrors[key])
                            setFieldErrors((fe) => ({ ...fe, [key]: '' }));
                        }}
                        placeholder=" "
                        step={key === 'amount' ? '0.01' : key === 'quantity' ? '1' : undefined}
                        type={type}
                        value={(form as any)[key]}
                      />
                      <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]">
                        {label} <span className="text-error">*</span>
                      </label>
                    </div>
                    {fieldErrors[key] && (
                      <p className="text-error text-[11px] mt-1 ml-1">{fieldErrors[key]}</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl shadow-[0_0_20px_rgba(0,112,243,0.3)] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                disabled={saving}
                onClick={handleAdd}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save Sale'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {canEdit && (
        <button
          className="fixed right-6 bottom-24 w-14 h-14 bg-primary-container text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,112,243,0.3)] active:scale-95 transition-all z-40"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={28} />
        </button>
      )}

      <BottomNav activeScreen={Screen.SalesRecords} onNavigate={onNavigate} />
    </motion.div>
  );
}