import { useQuery } from '@tanstack/react-query';
import { DollarSign, Trophy, Medal, Crown, Award } from 'lucide-react';
import { api } from '../lib/api';
import { useBrand } from '../lib/BrandContext';
import { formatBRL, formatNumber, formatPercent } from '../lib/utils';
import ChartCard from '../components/ChartCard';
import { SkeletonPage } from '../components/LoadingSkeleton';

const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const badgeConfig = {
  gold: { icon: Crown, bg: 'bg-warning/20', text: 'text-warning', label: '1o Lugar', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  silver: { icon: Medal, bg: 'bg-text-muted/20', text: 'text-text-muted', label: '2o Lugar', glow: '' },
  bronze: { icon: Award, bg: 'bg-[#cd7f32]/20', text: 'text-[#cd7f32]', label: '3o Lugar', glow: '' },
};

export default function VendedoresPage() {
  const { brand } = useBrand();

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', brand],
    queryFn: () => api.sellers(brand),
  });

  if (isLoading) {
    return <SkeletonPage cards={3} charts={1} />;
  }

  const sellers = data?.sellers || [];
  const maxOpps = Math.max(...sellers.map(s => s.totalOpps || 0), 1);
  const hasData = sellers.some(s => s.totalOpps > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-text">Vendedores</h2>
        <p className="text-sm text-text-muted mt-1">
          Performance e ranking da equipe comercial
        </p>
      </div>

      {/* Podium - Top 3 */}
      {hasData && sellers.length >= 2 && (
        <div className="bg-bg-card rounded-xl border border-border p-6 card-scanline animate-fade-in-delay-1">
          <div className="flex items-center gap-2 mb-6">
            <Trophy size={20} className="text-warning" />
            <h3 className="text-sm font-semibold text-text">Ranking de Vendas</h3>
          </div>

          <div className="flex items-end justify-center gap-4 sm:gap-8">
            {/* 2nd place */}
            {sellers[1] && (
              <PodiumItem seller={sellers[1]} position={2} height="h-24" color={avatarColors[1]} />
            )}
            {/* 1st place */}
            {sellers[0] && (
              <PodiumItem seller={sellers[0]} position={1} height="h-32" color={avatarColors[0]} />
            )}
            {/* 3rd place */}
            {sellers[2] && (
              <PodiumItem seller={sellers[2]} position={3} height="h-16" color={avatarColors[2]} />
            )}
          </div>
        </div>
      )}

      {/* Seller cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sellers.map((seller, i) => {
          const color = avatarColors[i % avatarColors.length];
          const initials = seller.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          const badge = seller.badge ? badgeConfig[seller.badge] : null;
          const BadgeIcon = badge?.icon;

          return (
            <div
              key={seller.name}
              className={`bg-bg-card rounded-xl border border-border p-5 hover-card card-scanline animate-fade-in-delay-${Math.min(i, 3)}
                ${badge ? badge.glow : ''}`}
            >
              {/* Badge + Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  {seller.photo ? (
                    <img src={seller.photo} alt={seller.name}
                      className="w-12 h-12 rounded-full object-cover border-2"
                      style={{ borderColor: color }} />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2"
                      style={{ backgroundColor: color, borderColor: color }}
                    >
                      {initials}
                    </div>
                  )}
                  {badge && (
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${badge.bg}`}>
                      <BadgeIcon size={12} className={badge.text} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text truncate">{seller.name}</h3>
                    {badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                        #{seller.rank}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{seller.role || 'Vendedor(a)'}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Opps" value={formatNumber(seller.totalOpps || 0)} />
                <StatBox label="Ganhas" value={formatNumber(seller.won || 0)} color="text-accent" />
                <StatBox label="Perdidas" value={formatNumber(seller.lost || 0)} color="text-danger" />
                <StatBox label="Conversao" value={formatPercent(seller.conversionRate || 0)} color="text-primary-light" />
              </div>

              {/* Revenue + Ticket */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-[10px] text-text-dim">Receita</p>
                  <p className="text-sm font-bold text-accent">{formatBRL(seller.revenue || 0)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-[10px] text-text-dim">Ticket Medio</p>
                  <p className="text-sm font-bold text-primary-light">{formatBRL(seller.avgTicket || 0)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison bars */}
      <ChartCard title="Comparativo de Oportunidades" subtitle="Total por vendedor" className="animate-fade-in-delay-2">
        {hasData ? (
          <div className="space-y-3">
            {sellers.map((seller, i) => {
              const barWidth = Math.max(((seller.totalOpps || 0) / maxOpps) * 100, 5);
              const color = avatarColors[i % avatarColors.length];
              return (
                <div key={seller.name} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-32 text-right truncate">{seller.name}</span>
                  <div className="flex-1 h-7 bg-bg-hover rounded overflow-hidden">
                    <div
                      className="h-full rounded flex items-center px-2 transition-all duration-500"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    >
                      <span className="text-[11px] font-semibold text-white">
                        {formatNumber(seller.totalOpps || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-text-dim text-sm">
            Dados serao exibidos quando houver vendas registradas.
          </div>
        )}
      </ChartCard>

      {/* Leaderboard table */}
      <ChartCard title="Tabela Completa" subtitle="Todos os indicadores por vendedor" className="animate-fade-in-delay-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">#</th>
                <th className="text-left py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Vendedor</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Opps</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Won</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Lost</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Conv.</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Ticket</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Receita</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller, i) => {
                const badge = seller.badge ? badgeConfig[seller.badge] : null;
                return (
                  <tr key={seller.name} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                    <td className="py-3 px-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${i === 0 ? 'bg-warning/20 text-warning' : i === 1 ? 'bg-text-dim/20 text-text-muted' : 'bg-bg-hover text-text-dim'}`}>
                        {seller.rank || i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium text-text">{seller.name}</td>
                    <td className="py-3 px-2 text-right text-text-muted">{formatNumber(seller.totalOpps || 0)}</td>
                    <td className="py-3 px-2 text-right text-accent">{formatNumber(seller.won || 0)}</td>
                    <td className="py-3 px-2 text-right text-danger">{formatNumber(seller.lost || 0)}</td>
                    <td className="py-3 px-2 text-right text-primary-light">{formatPercent(seller.conversionRate || 0)}</td>
                    <td className="py-3 px-2 text-right text-text-muted">{formatBRL(seller.avgTicket || 0)}</td>
                    <td className="py-3 px-2 text-right font-semibold text-accent">{formatBRL(seller.revenue || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!hasData && (
          <div className="text-center py-4 text-text-dim text-xs">
            A tabela sera preenchida com dados reais conforme as vendas forem registradas.
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function PodiumItem({ seller, position, height, color }) {
  const initials = seller.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const posColors = {
    1: { bg: 'bg-warning', text: 'text-warning', border: 'border-warning' },
    2: { bg: 'bg-text-muted', text: 'text-text-muted', border: 'border-text-muted' },
    3: { bg: 'bg-[#cd7f32]', text: 'text-[#cd7f32]', border: 'border-[#cd7f32]' },
  };
  const pc = posColors[position];

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div className="relative mb-2">
        {seller.photo ? (
          <img src={seller.photo} alt={seller.name}
            className={`w-14 h-14 rounded-full object-cover border-2 ${pc.border}`} />
        ) : (
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold border-2 ${pc.border}`}
            style={{ backgroundColor: color }}>
            {initials}
          </div>
        )}
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${pc.bg} flex items-center justify-center`}>
          <span className="text-[10px] font-bold text-white">{position}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-text text-center max-w-[80px] truncate">{seller.name}</p>
      <p className="text-[10px] text-accent font-medium">{formatBRL(seller.revenue || 0)}</p>

      {/* Podium block */}
      <div className={`${height} w-20 sm:w-24 mt-2 rounded-t-lg ${pc.bg}/20 border border-b-0 ${pc.border}/30 flex items-center justify-center`}>
        <span className={`text-2xl font-bold ${pc.text}/60`}>{position}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, color = 'text-text' }) {
  return (
    <div className="p-2.5 rounded-lg bg-bg-hover">
      <p className="text-[10px] text-text-dim uppercase">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
