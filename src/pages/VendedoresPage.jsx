import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import {
  DollarSign, Trophy, Medal, Crown, Award, Clock, AlertTriangle,
  TrendingUp, Users, Target, Zap, ShoppingBag, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { useBrand } from '../lib/BrandContext';
import { useFilter } from '../lib/FilterContext';
import { formatBRL, formatNumber, formatPercent } from '../lib/utils';
import ChartCard from '../components/ChartCard';
import { SkeletonPage } from '../components/LoadingSkeleton';

const avatarColors = ['#26428B', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DONUT_COLORS = ['#26428B', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const badgeConfig = {
  gold: { icon: Crown, bg: 'bg-warning/20', text: 'text-warning', label: '1o Lugar', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  silver: { icon: Medal, bg: 'bg-text-muted/20', text: 'text-text-muted', label: '2o Lugar', glow: '' },
  bronze: { icon: Award, bg: 'bg-[#cd7f32]/20', text: 'text-[#cd7f32]', label: '3o Lugar', glow: '' },
};

export default function VendedoresPage() {
  const { brand } = useBrand();
  const { seller, period } = useFilter();

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', brand, seller, period],
    queryFn: () => api.sellers(brand, seller, period),
    staleTime: 300_000,
  });

  if (isLoading) {
    return <SkeletonPage cards={6} charts={2} />;
  }

  const sellers = data?.sellers || [];
  const team = data?.teamKPIs || {};
  const hasData = sellers.some(s => s.totalOpps > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-text">Desempenho da Equipe</h2>
        <p className="text-sm text-text-muted mt-1">
          Visao gerencial — indicadores de vendas, velocidade e saude do pipeline
        </p>
      </div>

      {/* ===== TEAM KPIs ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in-delay-1">
        <KPICard icon={Target} label="Oportunidades" value={formatNumber(team.totalOpps || 0)}
          sub={`${formatNumber(team.open || 0)} abertas`} color="text-primary-light" />
        <KPICard icon={Trophy} label="Vendas Fechadas" value={formatNumber(team.won || 0)}
          sub={`${formatPercent(team.conversionRate || 0)} conversao`} color="text-accent" />
        <KPICard icon={DollarSign} label="Receita Total" value={formatBRL(team.revenue || 0)}
          sub={`Ticket medio ${formatBRL(team.avgTicket || 0)}`} color="text-accent" />
        <KPICard icon={Clock} label="Ciclo de Venda" value={team.avgClosingDays != null ? `${team.avgClosingDays}d` : '-'}
          sub="Tempo medio fechamento" color="text-warning" />
        <KPICard icon={Zap} label="Ultimos 30 dias" value={formatNumber(team.recentWon30d || 0)}
          sub={formatBRL(team.recentRevenue30d || 0)} color="text-primary-light" />
        <KPICard icon={AlertTriangle} label="Concentracao" value={formatPercent(team.revenueConcentration || 0)}
          sub="Receita no top vendedor" color={team.revenueConcentration > 70 ? 'text-danger' : 'text-accent'} />
      </div>

      {/* ===== PODIUM ===== */}
      {hasData && sellers.length >= 2 && (
        <div className="bg-bg-card rounded-xl border border-border p-6 card-scanline animate-fade-in-delay-1">
          <div className="flex items-center gap-2 mb-6">
            <Trophy size={20} className="text-warning" />
            <h3 className="text-sm font-semibold text-text">Ranking por Receita</h3>
          </div>
          <div className="flex items-end justify-center gap-4 sm:gap-8">
            {sellers[1] && <PodiumItem seller={sellers[1]} position={2} height="h-24" color={avatarColors[1]} />}
            {sellers[0] && <PodiumItem seller={sellers[0]} position={1} height="h-32" color={avatarColors[0]} />}
            {sellers[2] && <PodiumItem seller={sellers[2]} position={3} height="h-16" color={avatarColors[2]} />}
          </div>
        </div>
      )}

      {/* ===== SELLER DETAIL CARDS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sellers.map((s, i) => (
          <SellerDetailCard key={s.name} seller={s} index={i} />
        ))}
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue distribution donut */}
        <ChartCard title="Distribuicao de Receita" subtitle="Participacao % por vendedor" className="animate-fade-in-delay-2">
          {hasData ? (
            <RevenueDonut sellers={sellers} />
          ) : <EmptyState />}
        </ChartCard>

        {/* Stacked bar: won/open/lost/abandoned per seller */}
        <ChartCard title="Composicao do Pipeline" subtitle="Status das oportunidades por vendedor" className="animate-fade-in-delay-2">
          {hasData ? (
            <PipelineComposition sellers={sellers} />
          ) : <EmptyState />}
        </ChartCard>
      </div>

      {/* ===== VELOCITY COMPARISON ===== */}
      <ChartCard title="Velocidade de Fechamento" subtitle="Tempo medio em dias para fechar uma venda" className="animate-fade-in-delay-3">
        {sellers.some(s => s.avgClosingDays != null) ? (
          <VelocityChart sellers={sellers} />
        ) : <EmptyState text="Dados de velocidade aparecerao quando houver vendas fechadas." />}
      </ChartCard>

      {/* ===== FULL LEADERBOARD TABLE ===== */}
      <ChartCard title="Tabela Completa da Equipe" subtitle="Todos os indicadores em um so lugar" className="animate-fade-in-delay-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <Th>#</Th><Th>Vendedor</Th><Th right>Oport.</Th><Th right>Ganhas</Th>
                <Th right>Perdidas</Th><Th right>Abertas</Th><Th right>Conv.</Th>
                <Th right>Ciclo</Th><Th right>Tempo</Th><Th right>Ticket</Th>
                <Th right>Maior</Th><Th right>Receita</Th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((s, i) => (
                <tr key={s.name} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                  <td className="py-3 px-2">
                    <RankBadge rank={s.rank} index={i} />
                  </td>
                  <td className="py-3 px-2 font-medium text-text whitespace-nowrap">{s.name}</td>
                  <td className="py-3 px-2 text-right text-text-muted">{formatNumber(s.totalOpps)}</td>
                  <td className="py-3 px-2 text-right text-accent">{formatNumber(s.won)}</td>
                  <td className="py-3 px-2 text-right text-danger">{formatNumber(s.lost)}</td>
                  <td className="py-3 px-2 text-right text-warning">{formatNumber(s.open)}</td>
                  <td className="py-3 px-2 text-right text-primary-light">{formatPercent(s.conversionRate)}</td>
                  <td className="py-3 px-2 text-right text-text-muted">
                    {s.avgClosingDays != null ? `${s.avgClosingDays}d` : '-'}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <AgingBadge days={s.avgOpenAging} />
                  </td>
                  <td className="py-3 px-2 text-right text-text-muted">{formatBRL(s.avgTicket)}</td>
                  <td className="py-3 px-2 text-right text-text-muted">{formatBRL(s.biggestSale)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-accent">{formatBRL(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!hasData && <EmptyState />}
      </ChartCard>
    </div>
  );
}

// ===== COMPONENTS =====

function KPICard({ icon: Icon, label, value, sub, color = 'text-text' }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4 card-scanline">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-[10px] text-text-dim uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-text-dim mt-1">{sub}</p>}
    </div>
  );
}

function SellerDetailCard({ seller: s, index }) {
  const color = avatarColors[index % avatarColors.length];
  const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const badge = s.badge ? badgeConfig[s.badge] : null;
  const BadgeIcon = badge?.icon;

  return (
    <div className={`bg-bg-card rounded-xl border border-border p-5 hover-card card-scanline animate-fade-in-delay-${Math.min(index, 3)} ${badge ? badge.glow : ''}`}>
      {/* Header: Avatar + Name + Badge */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {s.photo ? (
            <img src={s.photo} alt={s.name} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: color }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2"
              style={{ backgroundColor: color, borderColor: color }}>
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
            <h3 className="text-sm font-semibold text-text truncate">{s.name}</h3>
            {badge && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                #{s.rank}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">{s.role || 'Vendedor(a)'}</p>
        </div>
        {/* Recent performance indicator */}
        {s.recentWon30d > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 border border-accent/20">
            <ArrowUpRight size={12} className="text-accent" />
            <span className="text-[10px] font-bold text-accent">{s.recentWon30d} vendas 30d</span>
          </div>
        )}
      </div>

      {/* Stats Grid — Primary */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <MiniStat label="Oport." value={formatNumber(s.totalOpps)} />
        <MiniStat label="Ganhas" value={formatNumber(s.won)} color="text-accent" />
        <MiniStat label="Perdidas" value={formatNumber(s.lost)} color="text-danger" />
        <MiniStat label="Conv." value={formatPercent(s.conversionRate)} color="text-primary-light" />
      </div>

      {/* Stats Grid — Revenue & Velocity */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-accent/5 border border-accent/20">
          <p className="text-[9px] text-text-dim">Receita</p>
          <p className="text-sm font-bold text-accent">{formatBRL(s.revenue)}</p>
        </div>
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-[9px] text-text-dim">Ticket Medio</p>
          <p className="text-sm font-bold text-primary-light">{formatBRL(s.avgTicket)}</p>
        </div>
        <div className="p-2 rounded-lg bg-warning/5 border border-warning/20">
          <p className="text-[9px] text-text-dim">Ciclo Venda</p>
          <p className="text-sm font-bold text-warning">
            {s.avgClosingDays != null ? `${s.avgClosingDays} dias` : '-'}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-danger/5 border border-danger/20">
          <p className="text-[9px] text-text-dim">Maior Venda</p>
          <p className="text-sm font-bold text-text">{formatBRL(s.biggestSale)}</p>
        </div>
      </div>

      {/* Pipeline Health: open opps aging */}
      {s.open > 0 && (
        <div className="p-3 rounded-lg bg-bg-hover border border-border mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={12} className={s.avgOpenAging > 14 ? 'text-danger' : 'text-warning'} />
              <span className="text-[10px] font-semibold text-text-dim uppercase">
                Pipeline Ativo — {s.open} opp{s.open > 1 ? 's' : ''} abertas
              </span>
            </div>
            <AgingBadge days={s.avgOpenAging} showLabel />
          </div>
          {s.openStages && s.openStages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {s.openStages.map(st => (
                <span key={st.name} className="px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border text-text-muted">
                  {st.name}: <strong className="text-text">{st.count}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Products */}
      {s.topProducts && s.topProducts.length > 0 && (
        <div className="p-3 rounded-lg bg-bg-hover border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <ShoppingBag size={12} className="text-primary-light" />
            <span className="text-[10px] font-semibold text-text-dim uppercase">Produtos Vendidos</span>
          </div>
          <div className="space-y-1">
            {s.topProducts.map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="text-text-muted truncate mr-2">{p.name}</span>
                <span className="text-accent font-semibold whitespace-nowrap">
                  {p.count}x — {formatBRL(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lost Reasons */}
      {s.lostReasons && s.lostReasons.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-danger/5 border border-danger/20">
          <span className="text-[10px] font-semibold text-danger uppercase">Motivos de Perda</span>
          <div className="mt-1 space-y-1">
            {s.lostReasons.map(lr => (
              <div key={lr.reason} className="flex items-center justify-between text-xs">
                <span className="text-text-muted truncate mr-2">{lr.reason}</span>
                <span className="text-danger font-semibold">{lr.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueDonut({ sellers }) {
  const data = sellers
    .filter(s => s.revenue > 0)
    .map((s, i) => ({
      name: s.name,
      value: s.revenue,
      fill: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  if (data.length === 0) return <EmptyState />;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={65} outerRadius={95}
              paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-text">{formatBRL(total)}</span>
          <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest">Receita Total</span>
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2 mt-2 px-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
            <span className="text-xs text-text-muted truncate">{d.name}</span>
            <span className="text-xs font-semibold text-text ml-auto">
              {formatPercent((d.value / total) * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.fill }} />
        <span className="font-semibold text-text">{d.name}</span>
      </div>
      <p className="text-xs text-text-muted mt-1">{formatBRL(d.value)} ({pct}%)</p>
    </div>
  );
}

function PipelineComposition({ sellers }) {
  const data = sellers.map(s => ({
    name: s.name.split(' ')[0],
    fullName: s.name,
    won: s.won,
    open: s.open,
    lost: s.lost,
    abandoned: s.abandoned,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sellers.length * 50)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<StackedTooltip />} />
        <Bar dataKey="won" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Ganhas" />
        <Bar dataKey="open" stackId="a" fill="#f59e0b" name="Abertas" />
        <Bar dataKey="lost" stackId="a" fill="#ef4444" name="Perdidas" />
        <Bar dataKey="abandoned" stackId="a" fill="#64748b" radius={[0, 4, 4, 0]} name="Abandonadas" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StackedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const fullName = payload[0]?.payload?.fullName || label;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text mb-1">{fullName}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-text-muted">{p.name}:</span>
          <span className="font-semibold text-text">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function VelocityChart({ sellers }) {
  const data = sellers
    .filter(s => s.avgClosingDays != null)
    .map((s, i) => ({
      name: s.name.split(' ')[0],
      fullName: s.name,
      days: s.avgClosingDays,
      color: avatarColors[i % avatarColors.length],
    }));

  if (data.length === 0) return <EmptyState text="Sem dados de velocidade" />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 50)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
          label={{ value: 'dias', position: 'insideBottomRight', fill: '#64748b', fontSize: 10 }} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<VelocityTooltip />} />
        <Bar dataKey="days" radius={[0, 4, 4, 0]} name="Dias">
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function VelocityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text">{d.fullName}</p>
      <p className="text-xs text-text-muted mt-1">Tempo medio: <strong className="text-warning">{d.days} dias</strong></p>
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
      <p className="text-[9px] text-text-dim">{formatPercent(seller.conversionRate || 0)} conv.</p>
      <div className={`${height} w-20 sm:w-24 mt-2 rounded-t-lg ${pc.bg}/20 border border-b-0 ${pc.border}/30 flex items-center justify-center`}>
        <span className={`text-2xl font-bold ${pc.text}/60`}>{position}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = 'text-text' }) {
  return (
    <div className="p-2 rounded-lg bg-bg-hover text-center">
      <p className="text-[9px] text-text-dim uppercase">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}

function AgingBadge({ days, showLabel = false }) {
  if (days == null) return <span className="text-text-dim text-xs">-</span>;

  let bgColor = 'bg-accent/10 text-accent border-accent/20';
  let label = 'Saudavel';
  if (days > 14) {
    bgColor = 'bg-danger/10 text-danger border-danger/20';
    label = 'Critico';
  } else if (days > 7) {
    bgColor = 'bg-warning/10 text-warning border-warning/20';
    label = 'Atencao';
  }

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${bgColor}`}>
      {days}d {showLabel && `— ${label}`}
    </span>
  );
}

function RankBadge({ rank, index }) {
  const cls = index === 0 ? 'bg-warning/20 text-warning'
    : index === 1 ? 'bg-text-dim/20 text-text-muted'
      : index === 2 ? 'bg-[#cd7f32]/20 text-[#cd7f32]'
        : 'bg-bg-hover text-text-dim';

  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${cls}`}>
      {rank}
    </span>
  );
}

function Th({ children, right }) {
  return (
    <th className={`${right ? 'text-right' : 'text-left'} py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider`}>
      {children}
    </th>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-8 text-text-dim text-sm">
      {text || 'Dados serao exibidos quando houver vendas registradas.'}
    </div>
  );
}
