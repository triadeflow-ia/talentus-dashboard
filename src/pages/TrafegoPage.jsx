import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts';
import {
  DollarSign, Eye, MousePointerClick, Users, Target, Megaphone,
  PlugZap, TrendingUp, Layers, ArrowDown, BarChart3,
  ShoppingCart, Receipt, Wallet, Filter, Image,
} from 'lucide-react';
import { useFilter } from '../lib/FilterContext';
import { api } from '../lib/api';
import ChartCard from '../components/ChartCard';
import { SkeletonPage } from '../components/LoadingSkeleton';

// --- Formatters ---
function fmt(v) {
  if (v == null || isNaN(v)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtN(v) {
  if (v == null || isNaN(v)) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('pt-BR').format(v);
}
function fmtP(v) {
  if (v == null || isNaN(v)) return '0%';
  return `${parseFloat(v).toFixed(2)}%`;
}
function fmtRate(num, den) {
  if (!den || den === 0) return '0%';
  return `${((num / den) * 100).toFixed(1)}%`;
}

// --- Reusable Components ---
function KpiCard({ title, value, sub, icon: Icon, color = 'primary' }) {
  const cls = {
    primary: 'text-primary-light bg-primary/10',
    accent: 'text-accent bg-accent/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-danger bg-danger/10',
    info: 'text-[#38bdf8] bg-[#38bdf8]/10',
    green: 'text-[#10b981] bg-[#10b981]/10',
    purple: 'text-[#a78bfa] bg-[#a78bfa]/10',
  }[color] || 'text-primary-light bg-primary/10';
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4 hover-card card-scanline">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-lg ${cls}`}><Icon size={14} /></div>
      </div>
      <p className="text-lg font-bold text-text">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text mb-2">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-text-muted">{e.name}:</span>
          <span className="font-semibold text-text">
            {e.dataKey === 'spend' ? fmt(e.value) : fmtN(e.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const c = {
    ACTIVE: { bg: 'bg-accent/15', text: 'text-accent', label: 'ATIVO' },
    PAUSED: { bg: 'bg-warning/15', text: 'text-warning', label: 'PAUSADO' },
    ARCHIVED: { bg: 'bg-text-dim/15', text: 'text-text-dim', label: 'ARQUIVADO' },
  }[status] || { bg: 'bg-text-dim/15', text: 'text-text-dim', label: status };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}

function FunnelRow({ label, value, rate, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-1 h-10 rounded-full ${color}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{label}</span>
          <span className="text-sm font-bold text-text">{value}</span>
        </div>
        {rate && (
          <div className="flex items-center gap-1 mt-0.5">
            <ArrowDown size={10} className="text-text-dim" />
            <span className="text-[10px] text-text-dim">{rate}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ icon: Icon, label, value, onChange, options, disabled }) {
  return (
    <div className={`flex items-center gap-1.5 bg-bg-deep border border-border-light rounded-lg px-2.5 py-1.5 ${disabled ? 'opacity-50' : ''}`}>
      <Icon size={13} className="text-accent shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-bg-deep text-[11px] font-medium text-text border-none outline-none cursor-pointer pr-4 max-w-[220px] truncate disabled:cursor-not-allowed"
      >
        <option value="all">{label}</option>
        {options.map(o => (
          <option key={o.id} value={o.id} title={o.name}>{o.name}</option>
        ))}
      </select>
    </div>
  );
}

// --- Main Page ---
export default function TrafegoPage() {
  const { period } = useFilter();

  // Cascading filter state
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedAdset, setSelectedAdset] = useState('all');

  // Reset children when parent changes
  useEffect(() => { setSelectedCampaign('all'); setSelectedAdset('all'); }, [selectedAccount]);
  useEffect(() => { setSelectedAdset('all'); }, [selectedCampaign]);

  // --- Data fetching ---
  const { data: statusData } = useQuery({ queryKey: ['meta-status'], queryFn: api.metaStatus, staleTime: 300_000 });
  const { data: accountsData } = useQuery({ queryKey: ['meta-accounts'], queryFn: api.metaAccounts, enabled: !!statusData?.connected, staleTime: 300_000 });

  const accountId = selectedAccount !== 'all' ? selectedAccount : (accountsData?.accounts?.[0]?.id || null);

  // KPIs (account level)
  const { data: insightsData, isLoading } = useQuery({
    queryKey: ['trafego-insights', period, accountId],
    queryFn: () => api.metaInsights(period, accountId),
    enabled: !!accountId,
  });

  // Campaigns (always fetch for filter dropdown)
  const { data: campaignsData } = useQuery({
    queryKey: ['trafego-campaigns', period, accountId],
    queryFn: () => api.metaCampaigns(period, accountId),
    enabled: !!accountId,
  });

  // Ad Sets (fetch when account available, filter by campaign if selected)
  const { data: adsetsData } = useQuery({
    queryKey: ['trafego-adsets', period, accountId, selectedCampaign],
    queryFn: () => api.metaAdsets(period, accountId, selectedCampaign !== 'all' ? selectedCampaign : undefined),
    enabled: !!accountId,
  });

  // Ads (fetch when adset or campaign selected)
  const { data: adsData } = useQuery({
    queryKey: ['trafego-ads', period, accountId, selectedAdset],
    queryFn: () => api.metaAds(period, accountId, selectedAdset !== 'all' ? selectedAdset : undefined),
    enabled: !!accountId && (selectedAdset !== 'all' || selectedCampaign !== 'all'),
  });

  // Timeline (filtered by campaign if selected)
  const { data: timelineData } = useQuery({
    queryKey: ['trafego-timeline', period, accountId, selectedCampaign],
    queryFn: () => api.metaTimeline(period, accountId, selectedCampaign !== 'all' ? selectedCampaign : undefined),
    enabled: !!accountId,
  });

  // --- Not connected ---
  if (!statusData?.connected) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Megaphone size={40} className="text-text-dim mx-auto mb-3" />
          <p className="text-text-muted">Meta Ads nao conectado</p>
          <p className="text-xs text-text-dim mt-1">Configure META_ACCESS_TOKEN no .env</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <SkeletonPage cards={10} charts={2} />;

  // --- Data ---
  const accounts = accountsData?.accounts || [];
  const d = insightsData?.data || {};
  const campaigns = campaignsData?.campaigns || [];
  const adsets = adsetsData?.adsets || [];
  const ads = adsData?.ads || [];
  const timeline = (timelineData?.timeline || []).map(t => ({
    ...t,
    label: new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }));

  // Rates
  const lpViewRate = d.linkClicks > 0 ? (d.landingPageViews / d.linkClicks) * 100 : 0;
  const lpToLeadRate = d.landingPageViews > 0 ? (d.leads / d.landingPageViews) * 100 : 0;
  const siteConversion = d.clicks > 0 ? (d.leads / d.clicks) * 100 : 0;

  // Determine which level to show in the table
  let tableLevel = 'campaigns';
  let tableData = campaigns;
  let tableTitle = 'Campanhas';
  if (selectedAdset !== 'all') {
    tableLevel = 'ads';
    tableData = ads;
    tableTitle = 'Anuncios';
  } else if (selectedCampaign !== 'all') {
    tableLevel = 'adsets';
    tableData = adsets;
    tableTitle = 'Conjuntos de Anuncios';
  }

  const totalSpend = tableData.reduce((s, c) => s + (c.insights?.spend || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text">Trafego & Criativos</h2>
          <p className="text-sm text-text-muted mt-1">Meta Ads — Funil completo — ultimos {period} dias</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20">
          <PlugZap size={14} />
          <span className="text-xs font-medium">Conectado</span>
        </div>
      </div>

      {/* ========== FILTROS CASCATA ========== */}
      <div className="bg-bg-card rounded-xl border border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={14} className="text-text-dim" />
          <span className="text-xs font-bold text-text-dim uppercase tracking-wider">Filtros</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Conta */}
          <FilterSelect
            icon={Wallet}
            label="Todas as contas"
            value={selectedAccount}
            onChange={setSelectedAccount}
            options={accounts.map(a => ({ id: a.id, name: a.name }))}
          />

          {/* Campanha */}
          <FilterSelect
            icon={Megaphone}
            label="Todas as campanhas"
            value={selectedCampaign}
            onChange={setSelectedCampaign}
            options={campaigns.map(c => ({ id: c.id, name: c.name }))}
            disabled={campaigns.length === 0}
          />

          {/* Conjunto de Anuncios */}
          <FilterSelect
            icon={Layers}
            label="Todos os conjuntos"
            value={selectedAdset}
            onChange={setSelectedAdset}
            options={adsets.map(a => ({ id: a.id, name: a.name }))}
            disabled={adsets.length === 0}
          />

          {/* Nivel atual */}
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-dim">
            <span className={selectedAccount !== 'all' ? 'text-accent font-bold' : ''}>Conta</span>
            <span>›</span>
            <span className={selectedCampaign !== 'all' ? 'text-accent font-bold' : ''}>Campanha</span>
            <span>›</span>
            <span className={selectedAdset !== 'all' ? 'text-accent font-bold' : ''}>Conjunto</span>
            <span>›</span>
            <span className="text-text-dim">Anuncio</span>
          </div>
        </div>
      </div>

      {/* ========== TOPO DO FUNIL ========== */}
      <div>
        <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={14} /> Topo do Funil — Meta Ads
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard title="Investimento" value={fmt(d.spend)} icon={DollarSign} color="danger" />
          <KpiCard title="Impressoes" value={fmtN(d.impressions)} icon={Eye} color="info" />
          <KpiCard title="CPM" value={fmt(d.cpm)} sub="Custo por 1K impressoes" icon={BarChart3} color="primary" />
          <KpiCard title="CTR" value={fmtP(d.ctr)} sub={`${fmtN(d.clicks)} cliques totais`} icon={MousePointerClick} color="warning" />
          <KpiCard title="Cliques no Link" value={fmtN(d.linkClicks)} sub={`CPC ${fmt(d.cpc)}`} icon={MousePointerClick} color="primary" />
        </div>
      </div>

      {/* ========== CONVERSAO LP → LEAD ========== */}
      <div>
        <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers size={14} /> Conversao — Landing Page → Lead
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard title="Clique → LP View" value={fmtP(lpViewRate)} sub={`${fmtN(d.landingPageViews)} views`} icon={Eye} color="purple" />
          <KpiCard title="Visualizacoes LP" value={fmtN(d.landingPageViews)} icon={Eye} color="info" />
          <KpiCard title="LP View → Lead" value={fmtP(lpToLeadRate)} icon={ArrowDown} color="green" />
          <KpiCard title="Leads" value={fmtN(d.leads)} sub={d.cpl > 0 ? `CPL ${fmt(d.cpl)}` : '—'} icon={Users} color="accent" />
          <KpiCard title="Custo por Lead" value={d.cpl > 0 ? fmt(d.cpl) : '—'} icon={Target} color="danger" />
        </div>
      </div>

      {/* ========== FUNDO DO FUNIL ========== */}
      <div>
        <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShoppingCart size={14} /> Fundo do Funil — Vendas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard title="Compras" value={fmtN(d.purchases)} icon={ShoppingCart} color="green" />
          <KpiCard title="Custo por Compra" value={d.cpa > 0 ? fmt(d.cpa) : '—'} icon={Receipt} color="danger" />
          <KpiCard title="ROAS" value={d.spend > 0 && d.purchases > 0 ? `${((d.purchases * 497) / d.spend).toFixed(1)}x` : '—'} sub="Retorno sobre investimento" icon={TrendingUp} color="accent" />
          <KpiCard title="Conversao do Site" value={fmtP(siteConversion)} sub="Cliques → Leads" icon={Target} color="purple" />
          <KpiCard title="Taxa de Compra" value={d.leads > 0 ? fmtRate(d.purchases, d.leads) : '—'} sub="Lead → Compra" icon={ShoppingCart} color="green" />
        </div>
      </div>

      {/* ========== FUNIL + TIMELINE ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Funil de Conversao" subtitle="Do clique a compra" className="lg:col-span-1">
          <div className="space-y-3 py-2">
            <FunnelRow label="Impressoes" value={fmtN(d.impressions)} rate={`CTR ${fmtP(d.ctr)}`} color="bg-[#38bdf8]" />
            <FunnelRow label="Cliques no Link" value={fmtN(d.linkClicks)} rate={`${fmtP(lpViewRate)} → LP`} color="bg-primary-light" />
            <FunnelRow label="Views Landing Page" value={fmtN(d.landingPageViews)} rate={`${fmtP(lpToLeadRate)} → Lead`} color="bg-[#a78bfa]" />
            <FunnelRow label="Leads" value={fmtN(d.leads)} rate={d.leads > 0 ? `${fmtRate(d.purchases, d.leads)} → Compra` : null} color="bg-accent" />
            <FunnelRow label="Compras" value={fmtN(d.purchases)} color="bg-[#10b981]" />
          </div>
        </ChartCard>

        <ChartCard title="Investimento Diario" subtitle="Gasto ao longo do periodo" className="lg:col-span-2">
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradSpendT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="spend" name="Investimento" stroke="#ef4444" fill="url(#gradSpendT)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[260px] text-text-dim text-sm">Sem dados</div>}
        </ChartCard>
      </div>

      {/* Clicks + Leads timeline */}
      <ChartCard title="Cliques, LP Views e Leads por Dia" subtitle="Desempenho diario de aquisicao">
        {timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-text-muted">{v}</span>} />
              <Bar dataKey="linkClicks" name="Cliques Link" fill="#26428B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="landingPageViews" name="LP Views" fill="#a78bfa" radius={[3, 3, 0, 0]} />
              <Bar dataKey="leads" name="Leads" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-[260px] text-text-dim text-sm">Sem dados</div>}
      </ChartCard>

      {/* ========== TABELA DRILL-DOWN ========== */}
      <ChartCard
        title={tableTitle}
        subtitle={`${tableData.length} ${tableTitle.toLowerCase()} no periodo`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {tableLevel === 'ads' && <th className="w-10 py-3 px-2"></th>}
                <th className="text-left py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Nome</th>
                <th className="text-center py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Invest.</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Impress.</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Cliques</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">CTR</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">CPC</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Leads</th>
                <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">CPL</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((item) => {
                const ins = item.insights || {};
                const spPct = totalSpend > 0 ? ((ins.spend || 0) / totalSpend) * 100 : 0;
                return (
                  <tr key={item.id}
                    className={`border-b border-border/50 hover:bg-bg-hover transition-colors ${tableLevel !== 'ads' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (tableLevel === 'campaigns') setSelectedCampaign(item.id);
                      else if (tableLevel === 'adsets') setSelectedAdset(item.id);
                    }}
                  >
                    {tableLevel === 'ads' && (
                      <td className="py-2 px-2">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-bg-hover flex items-center justify-center">
                            <Image size={12} className="text-text-dim" />
                          </div>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-2">
                      <p className="font-medium text-text truncate max-w-[250px]">{item.name}</p>
                    </td>
                    <td className="py-3 px-2 text-center"><StatusBadge status={item.status} /></td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-semibold text-text">{fmt(ins.spend)}</span>
                      <div className="h-1 w-full bg-bg-hover rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-danger rounded-full" style={{ width: `${Math.min(spPct, 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-text-muted">{fmtN(ins.impressions)}</td>
                    <td className="py-3 px-2 text-right text-primary-light">{fmtN(ins.clicks)}</td>
                    <td className="py-3 px-2 text-right text-text-muted">{fmtP(ins.ctr)}</td>
                    <td className="py-3 px-2 text-right text-warning">{ins.cpc > 0 ? fmt(ins.cpc) : '—'}</td>
                    <td className="py-3 px-2 text-right text-accent font-semibold">{ins.leads > 0 ? ins.leads : '—'}</td>
                    <td className="py-3 px-2 text-right text-danger">{ins.cpl > 0 ? fmt(ins.cpl) : '—'}</td>
                  </tr>
                );
              })}
              {tableData.length === 0 && (
                <tr><td colSpan={tableLevel === 'ads' ? 10 : 9} className="text-center py-8 text-text-dim text-sm">
                  Nenhum item encontrado no periodo
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
