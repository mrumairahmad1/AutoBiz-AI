import { motion } from 'motion/react';
import {
  LayoutDashboard, MessageSquare, Package, Receipt,
  ShoppingCart, Settings as SettingsIcon,
  TrendingUp, FileText, AlertTriangle, Plus, Bot, RefreshCw,
} from 'lucide-react';
import { Screen, SaleRecord, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { useEffect, useState, useMemo } from 'react';

interface DashboardProps { onNavigate: (screen: Screen) => void; }

type Range = '24h' | '7d' | '30d' | '6m' | '1y';
const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: '24h', label: '24H' },
  { key: '7d',  label: '7D'  },
  { key: '30d', label: '30D' },
  { key: '6m',  label: '6M'  },
  { key: '1y',  label: '1Y'  },
];

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0070f3" />
    <path d="M16 4L8 28l1 1 7-3 7 3 1-1L16 4Z" fill="white" opacity="0.95" />
    <rect x="10" y="14" width="12" height="1.5" rx="0.75" fill="white" opacity="0.5" />
  </svg>
);

function filterByRange(sales: SaleRecord[], range: Range): SaleRecord[] {
  const now = new Date();
  const cutoff = new Date();
  if (range === '24h') cutoff.setHours(now.getHours() - 24);
  else if (range === '7d') cutoff.setDate(now.getDate() - 7);
  else if (range === '30d') cutoff.setDate(now.getDate() - 30);
  else if (range === '6m') cutoff.setMonth(now.getMonth() - 6);
  else if (range === '1y') cutoff.setFullYear(now.getFullYear() - 1);
  return sales.filter(s => new Date(s.sale_date) >= cutoff);
}

function buildChartBars(sales: SaleRecord[], range: Range): number[] {
  if (sales.length === 0) return [20, 20, 20, 20, 20, 20];
  const buckets = range === '24h' ? 6 : range === '7d' ? 7 : range === '30d' ? 6 : range === '6m' ? 6 : 12;
  const totals = Array(buckets).fill(0);
  const now = new Date();
  sales.forEach(s => {
    const d = new Date(s.sale_date);
    let idx = 0;
    if (range === '24h') {
      const hoursAgo = (now.getTime() - d.getTime()) / 3600000;
      idx = Math.min(buckets - 1, Math.floor(hoursAgo / (24 / buckets)));
    } else if (range === '7d') {
      const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
      idx = Math.min(buckets - 1, daysAgo);
    } else if (range === '30d') {
      const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
      idx = Math.min(buckets - 1, Math.floor(daysAgo / 5));
    } else if (range === '6m') {
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      idx = Math.min(buckets - 1, monthsAgo);
    } else {
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      idx = Math.min(buckets - 1, monthsAgo);
    }
    totals[buckets - 1 - idx] += s.amount || 0;
  });
  const max = Math.max(...totals, 1);
  return totals.map(v => Math.max(8, Math.round((v / max) * 95)));
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<Range>('6m');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [sRes, iRes] = await Promise.all([API.get('/sales/'), API.get('/inventory/')]);
      setSales(sRes.data);
      setInventory(iRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredSales = useMemo(() => filterByRange(sales, range), [sales, range]);
  const chartBars = useMemo(() => buildChartBars(sales, range), [sales, range]);
  const totalRevenue = filteredSales.reduce((s, r) => s + (r.amount || 0), 0);
  const totalUnits = filteredSales.reduce((s, r) => s + (r.quantity || 0), 0);
  const lowStock = inventory.filter(i => i.quantity <= i.reorder_point);
  const recentSales = [...sales].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).slice(0, 3);

  const roleConfig: Record<string, { label: string; color: string }> = {
    admin:   { label: 'Admin',   color: 'text-error'   },
    manager: { label: 'Manager', color: 'text-tertiary' },
    viewer:  { label: 'Viewer',  color: 'text-primary'  },
  };
  const role = roleConfig[user?.role || 'viewer'];
  const username = user?.email?.split('@')[0] || 'User';

  return (
    <motion.div
      className="bg-background text-on-surface font-sans min-h-screen pb-32"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header — no bell */}
      <header className="bg-surface flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="flex flex-col">
            <span className="text-on-surface font-semibold text-sm">Welcome, {username}</span>
            <span className={`text-[10px] font-mono uppercase tracking-widest bg-primary-container/20 px-2 py-0.5 rounded-full inline-block w-max ${role.color}`}>
              {role.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-on-surface-variant hover:bg-surface-bright p-2 rounded-full transition-colors"
            onClick={() => fetchData(true)}
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            className="text-on-surface-variant hover:bg-surface-bright p-2 rounded-full transition-colors"
            onClick={() => onNavigate(Screen.Settings)}
          >
            <SettingsIcon size={17} />
          </button>
        </div>
      </header>

      <main className="px-6 space-y-8 mt-4">

        {/* Stat cards */}
        <section>
          <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4 snap-x">
            <div className="min-w-[260px] snap-center p-6 rounded-[16px] bg-surface-container-high border-l-4 border-primary-container shadow-xl">
              <div className="flex justify-between items-start mb-3">
                <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Revenue</span>
                <span className="text-secondary text-xs font-mono font-bold">{RANGE_OPTIONS.find(r => r.key === range)?.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-headline text-white">${totalRevenue.toLocaleString()}</span>
                <span className="text-on-surface-variant text-sm font-mono">USD</span>
              </div>
            </div>
            <div className="min-w-[180px] snap-center p-6 rounded-[16px] bg-surface-container-low shadow-lg">
              <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block mb-4">Units Sold</span>
              <div className="flex items-center gap-3">
                <TrendingUp className="text-primary" size={22} />
                <span className="text-3xl font-headline text-white">{totalUnits}</span>
              </div>
            </div>
            <div className="min-w-[180px] snap-center p-6 rounded-[16px] bg-surface-container-low shadow-lg">
              <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block mb-4">Transactions</span>
              <div className="flex items-center gap-3">
                <FileText className="text-tertiary" size={22} />
                <span className="text-3xl font-headline text-white">{filteredSales.length}</span>
              </div>
            </div>
            <div className="min-w-[180px] snap-center p-6 rounded-[16px] bg-error/10 shadow-lg">
              <span className="text-error text-xs font-semibold uppercase tracking-wider block mb-4">Low Stock</span>
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-error" size={22} />
                <span className="text-3xl font-headline text-error">{String(lowStock.length).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Revenue chart */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-headline text-white tracking-tight">Revenue Trends</h2>
          </div>

          {/* Range selector */}
          <div className="flex gap-2">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`flex-1 py-2 rounded-[10px] text-xs font-bold font-mono transition-all ${
                  range === opt.key
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(0,112,243,0.35)]'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-bright'
                }`}
                onClick={() => setRange(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-44 w-full bg-surface-container-lowest rounded-[16px] relative overflow-hidden flex items-end px-3 gap-1.5 pt-4">
            {chartBars.map((h, i) => (
              <motion.div
                key={`${range}-${i}`}
                className={`flex-1 rounded-t-lg ${
                  i === chartBars.length - 1
                    ? 'bg-primary-container shadow-[0_0_16px_rgba(0,112,243,0.35)]'
                    : i >= chartBars.length - 3
                    ? 'bg-primary/40 border-t-2 border-primary'
                    : 'bg-surface-container-high'
                }`}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </div>

          {loading && (
            <p className="text-center text-xs text-outline font-mono">Loading data...</p>
          )}
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-3 gap-3">
          <button
            className="flex flex-col items-center justify-center p-4 rounded-[16px] bg-primary-container shadow-[0_0_20px_rgba(0,112,243,0.3)] text-on-primary-container gap-2 active:scale-95 transition-transform"
            onClick={() => onNavigate(Screen.SalesRecords)}
          >
            <Receipt size={20} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Sales</span>
          </button>
          <button
            className="flex flex-col items-center justify-center p-4 rounded-[16px] bg-surface-container-high text-on-surface gap-2 active:scale-95 transition-transform"
            onClick={() => onNavigate(Screen.PurchaseOrders)}
          >
            <Package size={20} className="text-tertiary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Orders</span>
          </button>
          <button
            className="flex flex-col items-center justify-center p-4 rounded-[16px] bg-surface-container-high text-on-surface gap-2 active:scale-95 transition-transform"
            onClick={() => onNavigate(Screen.AIChat)}
          >
            <Bot size={20} className="text-secondary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Ask Manager</span>
          </button>
        </section>

        {/* Recent sales */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Recent Sales</h3>
            </div>
            <button className="text-primary text-xs font-semibold" onClick={() => onNavigate(Screen.SalesRecords)}>
              View All
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-container-low rounded-xl animate-pulse" />)}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="p-6 bg-surface-container-low rounded-xl text-center">
              <p className="text-on-surface-variant text-sm">No sales records yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale, i) => (
                <motion.div
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
                      <span className="font-headline font-bold text-primary text-xs uppercase">{sale.product.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{sale.product}</p>
                      <p className="text-[10px] font-mono text-on-surface-variant uppercase">SKU: {sale.sku}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-white">${sale.amount?.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <section className="space-y-4 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Stock Alerts</h3>
            </div>
            <div className="space-y-3">
              {lowStock.slice(0, 3).map(item => (
                <div key={item.id} className="p-4 bg-surface-container-low rounded-xl border-l-2 border-error flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase">{item.name}</p>
                    <p className="text-lg font-headline text-white">{String(item.quantity).padStart(2, '0')} Units Left</p>
                  </div>
                  <button
                    className="bg-surface-container-high px-3 py-1 rounded-full text-[10px] font-bold text-primary uppercase"
                    onClick={() => onNavigate(Screen.PurchaseOrders)}
                  >
                    Order
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-24 right-6">
        <button
          className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container shadow-[0_0_30px_rgba(0,112,243,0.5)] flex items-center justify-center active:scale-90 transition-transform"
          onClick={() => onNavigate(Screen.AIChat)}
        >
          <Bot size={26} />
        </button>
      </div>

      <BottomNav activeScreen={Screen.Dashboard} onNavigate={onNavigate} />
    </motion.div>
  );
}

export function BottomNav({ activeScreen, onNavigate }: { activeScreen: Screen; onNavigate: (s: Screen) => void }) {
  const items = [
    { id: Screen.Dashboard,      label: 'Dashboard', Icon: LayoutDashboard },
    { id: Screen.AIChat,         label: 'Chat',      Icon: MessageSquare   },
    { id: Screen.Inventory,      label: 'Inventory', Icon: Package         },
    { id: Screen.SalesRecords,   label: 'Sales',     Icon: Receipt         },
    { id: Screen.PurchaseOrders, label: 'Orders',    Icon: ShoppingCart    },
  ];
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-surface/80 backdrop-blur-xl rounded-t-[16px] shadow-[0_-24px_48px_rgba(0,0,0,0.8)]">
      {items.map(({ id, label, Icon }) => {
        const isActive = activeScreen === id;
        return (
          <button
            key={id}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 ${
              isActive
                ? 'text-primary bg-primary-container/10 shadow-[0_0_20px_rgba(0,112,243,0.3)]'
                : 'text-outline hover:text-on-surface'
            }`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
            <span className="text-[10px] font-semibold tracking-wide mt-1">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}