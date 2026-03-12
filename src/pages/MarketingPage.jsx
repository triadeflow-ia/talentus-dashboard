import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts';
import {
  Megaphone, DollarSign, Eye, MousePointerClick, Users, Target,
  TrendingUp, TrendingDown, Minus, Plug, PlugZap, ArrowUpRight,
  Zap, BarChart3, Clock,
} from 'lucide-react';
import { useFilter } from '../lib/FilterContext';
import { api } from '../lib/api';
import ChartCard from '../components/ChartCard';
import { SkeletonPage } from '../components/LoadingSkeleton';

function formatCurrency(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCompact(value) {
  if (value == null || isNaN(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatPct(value) {
  if (value == null || isNaN(value)) return '0%';
  return `${parseFloat(value).toFixed(2)}%`;
}

function MetaKpiCard({ title, value, icon: Icon, color = 'primary', trend }) {
  const colorClasses = {
    primary: 'text-primary-light bg-primary/10 border-primary/20',
    accent: 'text-accent bg-accent/10 border-accent/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    danger: 'text-danger bg-danger/10 border-danger/20',
    info: 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20',
  };
  const cls = colorClasses[color] || colorClasses.primary;

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4 hover-card card-scanline">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-lg ${cls}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-xl font-bold text-text">{value}</p>
      {trend && (
        <p className="text-[11px] text-text-muted mt-1">{trend}</p>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="font-semibold text-text">
            {entry.dataKey === 'spend' ? formatCurrency(entry.value) : formatCompact(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Status badge for campaigns
function StatusBadge({ status }) {
  const config = {
    ACTIVE: { bg: 'bg-accent/15', text: 'text-accent', label: 'ATIVO' },
    PAUSED: { bg: 'bg-warning/15', text: 'text-warning', label: 'PAUSADO' },
    ARCHIVED: { bg: 'bg-text-dim/15', text: 'text-text-dim', label: 'ARQUIVADO' },
    DELETED: { bg: 'bg-danger/15', text: 'text-danger', label: 'EXCLUIDO' },
  };
  const c = config[status] || config.PAUSED;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// Objective label
function objectiveLabel(obj) {
  const map = {
    OUTCOME_LEADS: 'Leads',
    OUTCOME_SALES: 'Vendas',
    OUTCOME_TRAFFIC: 'Trafego',
    OUTCOME_AWARENESS: 'Alcance',
    OUTCOME_ENGAGEMENT: 'Engajamento',
    OUTCOME_APP_PROMOTION: 'App',
    LINK_CLICKS: 'Cliques',
    LEAD_GENERATION: 'Leads',
    CONVERSIONS: 'Conversoes',
    BRAND_AWARENESS: 'Marca',
    REACH: 'Alcance',
    TRAFFIC: 'Trafego',
    MESSAGES: 'Mensagens',
    VIDEO_VIEWS: 'Videos',
  };
  return map[obj] || obj || '—';
}

export default function MarketingPage() {
  const { period } = useFilter();

  const { data: statusData } = useQuery({
    queryKey: ['meta-status'],
    queryFn: api.metaStatus,
    staleTime: 300_000,
  });

  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey: ['meta-insights', period],
    queryFn: () => api.metaInsights(period),
    enabled: !!statusData?.connected,
  });

  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['meta-campaigns', period],
    queryFn: () => api.metaCampaigns(period),
    enabled: !!statusData?.connected,
  });

  const { data: timelineData } = useQuery({
    queryKey: ['meta-timeline', period],
    queryFn: () => api.metaTimeline(period),
    enabled: !!statusData?.connected,
  });

  const connected = statusData?.connected;

  // Not connected state
  if (connected === false) {
    return <NotConnectedState />;
  }

  if (loadingInsights) {
    return <SkeletonPage cards={8} charts={2} />;
  }

  const insights = insightsData?.data || {};
  const campaigns = campaignsData?.campaigns || [];
  const timeline = (timelineData?.timeline || []).map(d => ({
    ...d,
    label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }));

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.insights?.spend || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Marketing</h2>
          <p className="text-sm text-text-muted mt-1">
            Meta Ads — ultimos {period} dias
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20">
          <PlugZap size={14} />
          <span className="text-xs font-medium">Meta Ads Conectado</span>
        </div>
      </div>

      {/* KPI Cards — 4 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetaKpiCard
          title="Investimento"
          value={formatCurrency(insights.spend)}
          icon={DollarSign}
          color="danger"
          trend={`${formatCompact(insights.impressions)} impressoes`}
        />
        <MetaKpiCard
          title="Alcance"
          value={formatCompact(insights.reach)}
          icon={Eye}
          color="info"
          trend={`Freq. ${parseFloat(insights.frequency || 0).toFixed(1)}x`}
        />
        <MetaKpiCard
          title="Cliques"
          value={formatCompact(insights.clicks)}
          icon={MousePointerClick}
          color="primary"
          trend={`CTR ${formatPct(insights.ctr)}`}
        />
        <MetaKpiCard
          title="Leads"
          value={formatCompact(insights.leads)}
          icon={Users}
          color="accent"
          trend={insights.cpl > 0 ? `CPL ${formatCurrency(insights.cpl)}` : 'Sem CPL'}
        />
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetaKpiCard
          title="CPC Medio"
          value={formatCurrency(insights.cpc)}
          icon={Target}
          color="warning"
        />
        <MetaKpiCard
          title="CPM"
          value={formatCurrency(insights.cpm)}
          icon={BarChart3}
          color="primary"
          trend="Custo por 1.000 impressoes"
        />
        <MetaKpiCard
          title="Cliques Unicos"
          value={formatCompact(insights.uniqueClicks)}
          icon={MousePointerClick}
          color="info"
          trend={insights.costPerUniqueClick > 0 ? `${formatCurrency(insights.costPerUniqueClick)}/clique` : ''}
        />
        <MetaKpiCard
          title="Campanhas Ativas"
          value={activeCampaigns.length}
          icon={Megaphone}
          color="accent"
          trend={`${campaigns.length} total`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spend over time */}
        <ChartCard
          title="Investimento Diario"
          subtitle="Gasto em anuncios ao longo do periodo"
          className="animate-fade-in-delay-1"
        >
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="spend" name="Investimento" stroke="#ef4444"
                  fill="url(#gradSpend)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-text-dim text-sm">
              Sem dados de timeline
            </div>
          )}
        </ChartCard>

        {/* Clicks + Leads over time */}
        <ChartCard
          title="Cliques e Leads"
          subtitle="Desempenho diario de aquisicao"
          className="animate-fade-in-delay-2"
        >
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => <span className="text-xs text-text-muted">{value}</span>} />
                <Bar dataKey="clicks" name="Cliques" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" name="Leads" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-text-dim text-sm">
              Sem dados de timeline
            </div>
          )}
        </ChartCard>
      </div>

      {/* Campaigns Table */}
      <ChartCard
        title="Campanhas"
        subtitle={`${campaigns.length} campanhas no periodo`}
        className="animate-fade-in-delay-3"
      >
        {campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Campanha</th>
                  <th className="text-center py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Objetivo</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Invest.</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Impressoes</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Cliques</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">CTR</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">CPC</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Leads</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">CPL</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const ins = c.insights || {};
                  const spendPct = totalSpend > 0 ? (ins.spend / totalSpend) * 100 : 0;
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-medium text-text truncate max-w-[200px]">{c.name}</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-xs text-text-muted">{objectiveLabel(c.objective)}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div>
                          <span className="font-semibold text-text">{formatCurrency(ins.spend)}</span>
                          <div className="h-1 w-full bg-bg-hover rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-danger rounded-full" style={{ width: `${spendPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-text-muted">{formatCompact(ins.impressions)}</td>
                      <td className="py-3 px-2 text-right text-primary-light">{formatCompact(ins.clicks)}</td>
                      <td className="py-3 px-2 text-right text-text-muted">{formatPct(ins.ctr)}</td>
                      <td className="py-3 px-2 text-right text-warning">{ins.cpc > 0 ? formatCurrency(ins.cpc) : '—'}</td>
                      <td className="py-3 px-2 text-right text-accent font-semibold">{ins.leads > 0 ? ins.leads : '—'}</td>
                      <td className="py-3 px-2 text-right text-danger">{ins.cpl > 0 ? formatCurrency(ins.cpl) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-text-dim text-sm">
            Nenhuma campanha encontrada no periodo.
          </div>
        )}
      </ChartCard>
    </div>
  );
}

// Not connected state — shows setup instructions
function NotConnectedState() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-text">Marketing</h2>
        <p className="text-sm text-text-muted mt-1">Meta Ads — Facebook e Instagram</p>
      </div>

      {/* Connection banner */}
      <div className="bg-gradient-to-r from-primary/10 via-bg-card to-primary/5 rounded-xl border border-primary/20 p-8 text-center card-scanline">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <Plug size={28} className="text-primary-light" />
        </div>
        <h3 className="text-2xl font-bold text-text mb-2">Conectar Meta Ads</h3>
        <p className="text-sm text-text-muted max-w-lg mx-auto">
          Para visualizar dados reais de campanhas, configure as credenciais do Meta Ads no arquivo .env do servidor.
        </p>
      </div>

      {/* Setup steps */}
      <ChartCard title="Como Conectar" subtitle="4 passos para integrar o Meta Ads">
        <div className="space-y-4">
          {[
            {
              step: 1,
              title: 'Criar App no Facebook Developer',
              desc: 'Acesse developers.facebook.com → My Apps → Create App → Business → Adicione Marketing API',
            },
            {
              step: 2,
              title: 'Gerar Access Token',
              desc: 'No App → Tools → Graph API Explorer → Selecione permissoes: ads_read, ads_management, read_insights → Generate Token (long-lived)',
            },
            {
              step: 3,
              title: 'Pegar Ad Account ID',
              desc: 'Meta Business Suite → Configuracoes → Contas de anuncio → Copie o ID (formato: act_123456789)',
            },
            {
              step: 4,
              title: 'Configurar .env',
              desc: 'Adicione no arquivo .env: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_APP_ID, META_APP_SECRET',
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-bg-hover/50">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary-light">{item.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-text">{item.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* .env example */}
      <ChartCard title="Exemplo .env" subtitle="Adicione estas variaveis ao seu arquivo .env">
        <div className="bg-bg-deep rounded-lg p-4 font-mono text-xs text-text-muted leading-relaxed">
          <p><span className="text-primary-light">META_ACCESS_TOKEN</span>=EAABsbCS...</p>
          <p><span className="text-primary-light">META_AD_ACCOUNT_ID</span>=act_123456789</p>
          <p><span className="text-primary-light">META_APP_ID</span>=123456789</p>
          <p><span className="text-primary-light">META_APP_SECRET</span>=abc123def456</p>
        </div>
      </ChartCard>

      {/* Metrics preview */}
      <ChartCard title="Metricas Disponiveis" subtitle="O que voce vera quando conectar">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, label: 'Investimento', desc: 'Gasto total' },
            { icon: Eye, label: 'Alcance', desc: 'Pessoas impactadas' },
            { icon: MousePointerClick, label: 'Cliques', desc: 'CPC e CTR' },
            { icon: Users, label: 'Leads', desc: 'CPL por campanha' },
            { icon: Target, label: 'CPM', desc: 'Custo por 1K imp.' },
            { icon: Zap, label: 'Frequencia', desc: 'Media de exibicao' },
            { icon: TrendingUp, label: 'Evolucao', desc: 'Evolucao diaria' },
            { icon: Megaphone, label: 'Campanhas', desc: 'Tabela detalhada' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 rounded-lg bg-bg-hover border border-border">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary-light">
                <Icon size={14} />
              </div>
              <div>
                <p className="text-xs font-medium text-text">{label}</p>
                <p className="text-[10px] text-text-dim">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
