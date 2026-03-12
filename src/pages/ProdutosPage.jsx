import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { api } from '../lib/api';
import { useBrand } from '../lib/BrandContext';
import { useFilter } from '../lib/FilterContext';
import { formatBRL, formatNumber } from '../lib/utils';
import ChartCard from '../components/ChartCard';
import { SkeletonPage } from '../components/LoadingSkeleton';

export default function ProdutosPage() {
  const { brand } = useBrand();
  const { seller } = useFilter();

  const { data, isLoading } = useQuery({
    queryKey: ['products', brand, seller],
    queryFn: () => api.products(brand, seller),
  });

  if (isLoading) {
    return <SkeletonPage cards={4} charts={1} />;
  }

  const brands = data?.brands || [];

  const brandTotals = brands.map(b => ({
    name: b.name,
    color: b.color,
    totalOpps: b.products.reduce((a, p) => a + (p.opps || 0), 0),
    totalWon: b.products.reduce((a, p) => a + (p.won || 0), 0),
    totalRevenue: b.products.reduce((a, p) => a + (p.revenue || 0), 0),
  }));

  const hasData = brandTotals.some(b => b.totalOpps > 0);
  const maxProductRevenue = Math.max(...brands.flatMap(b => b.products.map(p => p.revenue || 0)), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-text">Produtos</h2>
        <p className="text-sm text-text-muted mt-1">Performance por produto e marca</p>
      </div>

      {/* Brand cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brands.map((b, bi) => (
          <ChartCard
            key={b.name}
            title={b.name}
            subtitle={`${b.products.length} produtos`}
            className={`animate-fade-in-delay-${bi + 1}`}
          >
            {/* Brand summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-bg-hover text-center">
                <p className="text-[10px] text-text-dim uppercase">Opps</p>
                <p className="text-xl font-bold text-text">{formatNumber(brandTotals[bi]?.totalOpps || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-bg-hover text-center">
                <p className="text-[10px] text-text-dim uppercase">Won</p>
                <p className="text-xl font-bold text-accent">{formatNumber(brandTotals[bi]?.totalWon || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-bg-hover text-center">
                <p className="text-[10px] text-text-dim uppercase">Receita</p>
                <p className="text-lg font-bold" style={{ color: b.color }}>{formatBRL(brandTotals[bi]?.totalRevenue || 0)}</p>
              </div>
            </div>

            {/* Products list */}
            <div className="space-y-2">
              {b.products.map(product => (
                <div key={product.name}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-hover/50 hover:bg-bg-hover transition-colors group">
                  <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text truncate group-hover:text-primary-light transition-colors">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-text-dim">{formatNumber(product.opps || 0)} opps</span>
                      <span className="text-[10px] text-accent">{formatNumber(product.won || 0)} won</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold" style={{ color: b.color }}>{formatBRL(product.revenue || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        ))}
      </div>

      {/* Brand comparison */}
      {brands.length >= 2 && (
        <ChartCard title="Comparativo de Marcas" subtitle="Receita total por marca" className="animate-fade-in-delay-3">
          {hasData ? (
            <div className="flex items-end gap-8 justify-center py-6">
              {brandTotals.map(b => {
                const maxRev = Math.max(...brandTotals.map(x => x.totalRevenue), 1);
                const height = Math.max(((b.totalRevenue || 0) / maxRev) * 200, 20);
                return (
                  <div key={b.name} className="flex flex-col items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: b.color }}>{formatBRL(b.totalRevenue || 0)}</p>
                    <div className="w-20 rounded-t-lg transition-all duration-700"
                      style={{ height: `${height}px`, background: `linear-gradient(to top, ${b.color}, ${b.color}99)` }} />
                    <p className="text-xs text-text-muted text-center">{b.name}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 size={40} className="mx-auto text-text-dim mb-3" />
              <p className="text-sm text-text-dim">O comparativo sera exibido quando houver dados de vendas por produto.</p>
            </div>
          )}
        </ChartCard>
      )}
    </div>
  );
}
