import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu, RefreshCw, Download, Calendar, User } from 'lucide-react';
import Sidebar from './Sidebar';
import { useBrand } from '../lib/BrandContext';
import { useFilter } from '../lib/FilterContext';
import { api } from '../lib/api';

const brandOptions = [
  { value: 'all', label: 'Todas as Marcas' },
  { value: 'mateus', label: 'Mateus Cortez', color: '#26428B' },
  { value: 'cyb', label: 'CybNutri', color: '#C0B289' },
];

const periodOptions = [
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { brand, setBrand } = useBrand();
  const { seller, setSeller, period, setPeriod } = useFilter();
  const queryClient = useQueryClient();

  const { data: sellersData } = useQuery({
    queryKey: ['sellers-list'],
    queryFn: api.sellersList,
    staleTime: 300_000,
  });

  const sellersList = sellersData?.sellers || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleBrandChange = (newBrand) => {
    setBrand(newBrand);
    queryClient.invalidateQueries();
  };

  const handleSellerChange = (e) => {
    setSeller(e.target.value);
    queryClient.invalidateQueries();
  };

  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
    queryClient.invalidateQueries();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-bg-card border-b border-border shrink-0">
          {/* Top row */}
          <div className="h-16 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-text-muted hover:text-text p-2"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-text">Talentus Digital</h1>
                <p className="text-xs text-text-muted">Painel RevOps</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-bg-hover text-text-muted hover:text-text hover:border-primary
                  border border-border transition-all duration-200
                  disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-primary text-white hover:bg-primary-dark transition-all duration-200"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className="h-12 flex items-center gap-3 px-4 lg:px-6 border-t border-border/50 overflow-x-auto">
            {/* Brand Filter */}
            <div className="flex items-center gap-1 bg-bg-hover border border-border rounded-lg px-1 shrink-0">
              {brandOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleBrandChange(opt.value)}
                  className={`
                    px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200
                    ${brand === opt.value
                      ? 'bg-bg-card text-text shadow-sm border border-border'
                      : 'text-text-muted hover:text-text'
                    }
                  `}
                >
                  {opt.color && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  {opt.value === 'all' ? 'Todas' : opt.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border shrink-0" />

            {/* Seller Filter */}
            <div className="flex items-center gap-1.5 bg-bg-hover border border-border rounded-lg px-2.5 py-1 shrink-0">
              <User size={13} className="text-primary-light" />
              <select
                value={seller}
                onChange={handleSellerChange}
                className="bg-transparent text-[11px] font-medium text-text border-none outline-none cursor-pointer appearance-none pr-4"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center' }}
              >
                <option value="all">Todos vendedores</option>
                {sellersList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div className="flex items-center gap-1.5 bg-bg-hover border border-border rounded-lg px-2.5 py-1 shrink-0">
              <Calendar size={13} className="text-primary-light" />
              <select
                value={period}
                onChange={handlePeriodChange}
                className="bg-transparent text-[11px] font-medium text-text border-none outline-none cursor-pointer appearance-none pr-4"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center' }}
              >
                {periodOptions.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
