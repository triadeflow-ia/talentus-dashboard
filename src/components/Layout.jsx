import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, RefreshCw, Filter } from 'lucide-react';
import Sidebar from './Sidebar';
import { useBrand } from '../lib/BrandContext';

const brandOptions = [
  { value: 'all', label: 'Todas as Marcas' },
  { value: 'mateus', label: 'Mateus Cortez', color: '#6366f1' },
  { value: 'cyb', label: 'CybNutri', color: '#10b981' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { brand, setBrand } = useBrand();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleBrandChange = (newBrand) => {
    setBrand(newBrand);
    queryClient.invalidateQueries();
  };

  const currentBrand = brandOptions.find(b => b.value === brand) || brandOptions[0];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text-muted hover:text-text p-2"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-text">Talentus Digital</h1>
              <p className="text-xs text-text-muted">RevOps Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Brand Filter */}
            <div className="flex items-center gap-1.5 bg-bg-hover border border-border rounded-lg px-1">
              {brandOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleBrandChange(opt.value)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                    ${brand === opt.value
                      ? 'bg-bg-card text-text shadow-sm border border-border'
                      : 'text-text-muted hover:text-text'
                    }
                  `}
                >
                  {opt.color && (
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  {opt.value === 'all' ? 'Todas' : opt.label}
                </button>
              ))}
            </div>

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
