import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import {
  Crown, Medal, Award, Trophy, TrendingUp, DollarSign, Target,
  Clock, Zap, Star, Flame, ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { useBrand } from '../lib/BrandContext';
import { useFilter } from '../lib/FilterContext';
import { formatBRL, formatNumber, formatPercent } from '../lib/utils';
import { SkeletonPage } from '../components/LoadingSkeleton';

const PODIUM_COLORS = {
  1: { main: '#f59e0b', glow: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'Ouro' },
  2: { main: '#94a3b8', glow: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', label: 'Prata' },
  3: { main: '#cd7f32', glow: 'rgba(205,127,50,0.4)', bg: 'rgba(205,127,50,0.1)', border: 'rgba(205,127,50,0.3)', label: 'Bronze' },
};

const POSITION_ICONS = { 1: Crown, 2: Medal, 3: Award };
const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PodiumPage() {
  const { brand } = useBrand();
  const { seller } = useFilter();

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', brand, seller],
    queryFn: () => api.sellers(brand, seller),
  });

  if (isLoading) return <SkeletonPage cards={3} charts={1} />;

  const sellers = data?.sellers || [];
  const team = data?.teamKPIs || {};
  const top3 = sellers.filter(s => s.revenue > 0).slice(0, 3);
  const hasData = top3.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <Trophy size={64} className="text-text-dim mb-4" />
        <h2 className="text-xl font-bold text-text mb-2">Podium dos Campeoes</h2>
        <p className="text-text-muted max-w-md">
          O ranking sera exibido quando houver vendas registradas no CRM.
        </p>
      </div>
    );
  }

  // Radar chart data — normalize each metric 0-100 for comparison
  const maxRevenue = Math.max(...top3.map(s => s.revenue)) || 1;
  const maxOpps = Math.max(...top3.map(s => s.totalOpps)) || 1;
  const maxWon = Math.max(...top3.map(s => s.won)) || 1;
  const maxTicket = Math.max(...top3.map(s => s.avgTicket)) || 1;
  const maxConv = Math.max(...top3.map(s => s.conversionRate)) || 1;
  const maxRecent = Math.max(...top3.map(s => s.recentWon30d)) || 1;

  const radarData = [
    { metric: 'Receita', ...Object.fromEntries(top3.map((s, i) => [`v${i}`, Math.round((s.revenue / maxRevenue) * 100)])) },
    { metric: 'Opps', ...Object.fromEntries(top3.map((s, i) => [`v${i}`, Math.round((s.totalOpps / maxOpps) * 100)])) },
    { metric: 'Won', ...Object.fromEntries(top3.map((s, i) => [`v${i}`, Math.round((s.won / maxWon) * 100)])) },
    { metric: 'Ticket', ...Object.fromEntries(top3.map((s, i) => [`v${i}`, Math.round((s.avgTicket / maxTicket) * 100)])) },
    { metric: 'Conversao', ...Object.fromEntries(top3.map((s, i) => [`v${i}`, Math.round((s.conversionRate / maxConv) * 100)])) },
    { metric: 'Ultimos 30d', ...Object.fromEntries(top3.map((s, i) => [`v${i}`, Math.round((s.recentWon30d / maxRecent) * 100)])) },
  ];

  const radarColors = ['#f59e0b', '#94a3b8', '#cd7f32'];

  // Revenue bar chart
  const revenueData = top3.map((s, i) => ({
    name: s.name.split(' ')[0],
    fullName: s.name,
    revenue: s.revenue,
    color: PODIUM_COLORS[i + 1].main,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/20 mb-4">
          <Trophy size={16} className="text-warning" />
          <span className="text-xs font-bold text-warning uppercase tracking-widest">Hall dos Campeoes</span>
        </div>
        <h2 className="text-2xl font-bold text-text">Ranking de Vendedores</h2>
        <p className="text-sm text-text-muted mt-1">Top performers por receita gerada</p>
      </div>

      {/* ===== PODIUM VISUAL ===== */}
      <div className="bg-bg-card rounded-2xl border border-border p-8 card-scanline animate-fade-in-delay-1">
        <div className="flex items-end justify-center gap-4 sm:gap-8 md:gap-12 pt-8 pb-4">
          {/* 2nd place — left */}
          {top3[1] && (
            <PodiumSpot seller={top3[1]} position={2} index={1} />
          )}
          {/* 1st place — center, tallest */}
          {top3[0] && (
            <PodiumSpot seller={top3[0]} position={1} index={0} />
          )}
          {/* 3rd place — right */}
          {top3[2] && (
            <PodiumSpot seller={top3[2]} position={3} index={2} />
          )}
        </div>
      </div>

      {/* ===== STAT CARDS — Top 3 details ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-delay-2">
        {top3.map((s, i) => (
          <TopSellerCard key={s.name} seller={s} position={i + 1} index={i} team={team} />
        ))}
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-delay-3">
        {/* Radar comparison */}
        <div className="bg-bg-card rounded-xl border border-border p-6 card-scanline">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-primary-light" />
            <h3 className="text-sm font-semibold text-text">Comparativo de Performance</h3>
          </div>
          <div className="flex justify-center gap-4 mb-4">
            {top3.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: radarColors[i] }} />
                <span className="text-xs text-text-muted">{s.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              {top3.map((_, i) => (
                <Radar key={i} name={top3[i]?.name} dataKey={`v${i}`}
                  stroke={radarColors[i]} fill={radarColors[i]} fillOpacity={0.15}
                  strokeWidth={2} />
              ))}
              <Tooltip content={<RadarTooltip top3={top3} colors={radarColors} />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue bars */}
        <div className="bg-bg-card rounded-xl border border-border p-6 card-scanline">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-text">Receita — Top 3</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<RevenueTooltip />} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} name="Receita">
                {revenueData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== HIGHLIGHTS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-delay-3">
        <HighlightCard icon={Flame} label="Mais Vendas" value={getBest(sellers, 'won')?.name?.split(' ')[0] || '-'}
          sub={`${getBest(sellers, 'won')?.won || 0} vendas`} color="text-danger" />
        <HighlightCard icon={DollarSign} label="Maior Ticket" value={getBest(sellers, 'avgTicket')?.name?.split(' ')[0] || '-'}
          sub={formatBRL(getBest(sellers, 'avgTicket')?.avgTicket || 0)} color="text-accent" />
        <HighlightCard icon={Zap} label="Mais Rapido" value={getFastest(sellers)?.name?.split(' ')[0] || '-'}
          sub={getFastest(sellers)?.avgClosingDays != null ? `${getFastest(sellers).avgClosingDays} dias` : '-'} color="text-warning" />
        <HighlightCard icon={Star} label="Melhor Conversao" value={getBest(sellers, 'conversionRate')?.name?.split(' ')[0] || '-'}
          sub={formatPercent(getBest(sellers, 'conversionRate')?.conversionRate || 0)} color="text-primary-light" />
      </div>
    </div>
  );
}

// ===== COMPONENTS =====

function PodiumSpot({ seller, position, index }) {
  const pc = PODIUM_COLORS[position];
  const Icon = POSITION_ICONS[position];
  const initials = seller.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  const heights = { 1: 'h-36 sm:h-44', 2: 'h-24 sm:h-32', 3: 'h-16 sm:h-24' };
  const avatarSizes = { 1: 'w-20 h-20 sm:w-24 sm:h-24', 2: 'w-14 h-14 sm:w-16 sm:h-16', 3: 'w-12 h-12 sm:w-14 sm:h-14' };
  const iconSizes = { 1: 28, 2: 20, 3: 16 };
  const textSizes = { 1: 'text-base sm:text-lg', 2: 'text-xs sm:text-sm', 3: 'text-xs' };

  return (
    <div className="flex flex-col items-center" style={{ order: position === 1 ? 0 : position === 2 ? -1 : 1 }}>
      {/* Crown/Medal icon */}
      <div className="mb-2 animate-pulse-glow rounded-full p-2"
        style={{ boxShadow: `0 0 20px ${pc.glow}`, background: pc.bg }}>
        <Icon size={iconSizes[position]} style={{ color: pc.main }} />
      </div>

      {/* Avatar */}
      <div className="relative mb-3">
        {seller.photo ? (
          <img src={seller.photo} alt={seller.name}
            className={`${avatarSizes[position]} rounded-full object-cover border-3`}
            style={{ borderColor: pc.main, boxShadow: `0 0 25px ${pc.glow}` }} />
        ) : (
          <div className={`${avatarSizes[position]} rounded-full flex items-center justify-center text-white font-bold border-3`}
            style={{
              backgroundColor: avatarColor,
              borderColor: pc.main,
              boxShadow: `0 0 25px ${pc.glow}`,
              fontSize: position === 1 ? '1.25rem' : '0.875rem',
            }}>
            {initials}
          </div>
        )}
        {/* Position badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
          style={{ backgroundColor: pc.main, boxShadow: `0 0 10px ${pc.glow}` }}>
          {position}
        </div>
      </div>

      {/* Name & stats */}
      <p className={`${textSizes[position]} font-bold text-text text-center max-w-[120px] truncate`}>
        {seller.name}
      </p>
      <p className="text-accent font-bold text-sm mt-1">{formatBRL(seller.revenue)}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-text-muted">{seller.won} vendas</span>
        <span className="text-[10px] text-text-dim">|</span>
        <span className="text-[10px] text-text-muted">{formatPercent(seller.conversionRate)}</span>
      </div>

      {/* Pedestal */}
      <div className={`${heights[position]} w-24 sm:w-32 mt-4 rounded-t-xl flex flex-col items-center justify-center`}
        style={{
          background: `linear-gradient(180deg, ${pc.bg}, transparent)`,
          border: `1px solid ${pc.border}`,
          borderBottom: 'none',
          boxShadow: `0 0 30px ${pc.glow}, inset 0 1px 0 ${pc.border}`,
        }}>
        <span className="text-4xl sm:text-5xl font-black" style={{ color: pc.main, opacity: 0.3 }}>
          {position}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: pc.main, opacity: 0.5 }}>
          {pc.label}
        </span>
      </div>
    </div>
  );
}

function TopSellerCard({ seller: s, position, index, team }) {
  const pc = PODIUM_COLORS[position];
  const Icon = POSITION_ICONS[position];
  const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const shareOfRevenue = team.revenue > 0 ? ((s.revenue / team.revenue) * 100) : 0;

  return (
    <div className="bg-bg-card rounded-xl border p-5 card-scanline hover-card"
      style={{ borderColor: pc.border, boxShadow: `0 0 15px ${pc.glow}` }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {s.photo ? (
            <img src={s.photo} alt={s.name}
              className="w-12 h-12 rounded-full object-cover border-2"
              style={{ borderColor: pc.main }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2"
              style={{ backgroundColor: avatarColor, borderColor: pc.main }}>
              {initials}
            </div>
          )}
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: pc.bg, border: `1px solid ${pc.border}` }}>
            <Icon size={14} style={{ color: pc.main }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text truncate">{s.name}</h3>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
              style={{ backgroundColor: pc.bg, color: pc.main, border: `1px solid ${pc.border}` }}>
              #{position}
            </span>
          </div>
          <p className="text-xs text-text-muted">{s.role || 'Vendedor(a)'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <StatRow icon={DollarSign} label="Receita" value={formatBRL(s.revenue)} color="text-accent" />
        <StatRow icon={Trophy} label="Vendas" value={`${s.won} de ${s.totalOpps}`} color="text-warning" />
        <StatRow icon={TrendingUp} label="Conversao" value={formatPercent(s.conversionRate)} color="text-primary-light" />
        <StatRow icon={DollarSign} label="Ticket Medio" value={formatBRL(s.avgTicket)} color="text-text" />
        <StatRow icon={Clock} label="Ciclo Medio" value={s.avgClosingDays != null ? `${s.avgClosingDays} dias` : '-'} color="text-warning" />
        <StatRow icon={Zap} label="Ultimos 30d" value={`${s.recentWon30d} vendas`} color="text-primary-light" />

        {/* Revenue share bar */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">% da Receita Total</span>
            <span className="text-xs font-bold" style={{ color: pc.main }}>{formatPercent(shareOfRevenue)}</span>
          </div>
          <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(shareOfRevenue, 100)}%`,
                backgroundColor: pc.main,
                boxShadow: `0 0 8px ${pc.glow}`,
              }} />
          </div>
        </div>
      </div>

      {/* Top products */}
      {s.topProducts && s.topProducts.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <span className="text-[10px] text-text-dim uppercase tracking-wider font-semibold">Produtos Vendidos</span>
          <div className="mt-2 space-y-1">
            {s.topProducts.slice(0, 3).map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="text-text-muted truncate mr-2">{p.name}</span>
                <span className="text-accent font-semibold whitespace-nowrap">{p.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color = 'text-text' }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-text-dim" />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}

function HighlightCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4 card-scanline text-center hover-card">
      <Icon size={20} className={`${color} mx-auto mb-2`} />
      <p className="text-[10px] text-text-dim uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>
    </div>
  );
}

function RadarTooltip({ active, payload, label, top3, colors }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i] }} />
          <span className="text-text-muted">{top3[i]?.name?.split(' ')[0]}:</span>
          <span className="font-semibold text-text">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text">{d.fullName}</p>
      <p className="text-xs text-accent mt-1">{formatBRL(d.revenue)}</p>
    </div>
  );
}

// Helpers
function getBest(sellers, key) {
  if (!sellers.length) return null;
  return sellers.reduce((best, s) => (s[key] > (best[key] || 0) ? s : best), sellers[0]);
}

function getFastest(sellers) {
  const withDays = sellers.filter(s => s.avgClosingDays != null && s.won > 0);
  if (!withDays.length) return null;
  return withDays.reduce((best, s) => (s.avgClosingDays < best.avgClosingDays ? s : best), withDays[0]);
}
