import { useQuery } from '@tanstack/react-query';
import {
  Users, Target, Trophy, TrendingUp, DollarSign, Ticket,
  FileText, GitBranch, Tag, UserCheck, Calendar,
} from 'lucide-react';
import { api } from '../lib/api';
import { useBrand } from '../lib/BrandContext';
import { formatBRL, formatNumber, formatPercent } from '../lib/utils';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import FunnelChart from '../components/FunnelChart';
import ProgressTracker from '../components/ProgressTracker';
import { SkeletonPage } from '../components/LoadingSkeleton';

const tdiPhases = [
  { name: 'Diagnostico', status: 'done' },
  { name: 'Blueprint', status: 'done' },
  { name: 'Implantacao', status: 'done' },
  { name: 'Automacao', status: 'in-progress' },
  { name: 'Treinamento', status: 'in-progress' },
  { name: 'Auditoria', status: 'pending' },
  { name: 'Escala', status: 'pending' },
];

export default function OverviewPage() {
  const { brand } = useBrand();

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['overview', brand],
    queryFn: () => api.overview(brand),
  });

  const { data: crmData } = useQuery({
    queryKey: ['crm-structure'],
    queryFn: api.crmStructure,
  });

  if (loadingOverview) {
    return <SkeletonPage cards={6} charts={2} />;
  }

  const data = overview || {};
  const crm = crmData || { fields: 22, pipelines: 6, tags: 38, users: 4, calendars: 2 };

  const metrics = [
    {
      title: 'Total Leads',
      value: formatNumber(data.totalLeads || 0),
      subtitle: data.totalLeads > 0 ? 'contatos no CRM' : 'Nenhum lead ainda',
      icon: Users, trend: data.totalLeads > 0 ? 'up' : 'neutral', color: 'primary',
    },
    {
      title: 'Oportunidades Abertas',
      value: formatNumber(data.openOpps || 0),
      subtitle: data.openOpps > 0 ? 'em negociacao' : 'Pipeline vazio',
      icon: Target, trend: 'neutral', color: 'warning',
    },
    {
      title: 'Vendas (Won)',
      value: formatNumber(data.wonOpps || 0),
      subtitle: data.wonOpps > 0 ? 'negociacoes ganhas' : 'Nenhuma venda',
      icon: Trophy, trend: data.wonOpps > 0 ? 'up' : 'neutral', color: 'accent',
    },
    {
      title: 'Taxa Conversao',
      value: formatPercent(data.conversionRate || 0),
      subtitle: data.conversionRate > 0 ? 'leads → vendas' : 'Sem dados',
      icon: TrendingUp, trend: data.conversionRate > 15 ? 'up' : 'neutral', color: 'primary',
    },
    {
      title: 'Receita Total',
      value: formatBRL(data.totalRevenue || 0),
      subtitle: data.totalRevenue > 0 ? 'faturamento acumulado' : 'Sem receita',
      icon: DollarSign, trend: data.totalRevenue > 0 ? 'up' : 'neutral', color: 'accent',
    },
    {
      title: 'Ticket Medio',
      value: formatBRL(data.avgTicket || 0),
      subtitle: data.avgTicket > 0 ? 'por venda' : 'Sem dados',
      icon: Ticket, trend: 'neutral', color: 'warning',
    },
  ];

  const commercialStages = data.commercialFunnel || [];

  const crmItems = [
    { icon: FileText, label: 'Campos', value: crm.fields || 22 },
    { icon: GitBranch, label: 'Pipelines', value: crm.pipelines || 6 },
    { icon: Tag, label: 'Tags', value: crm.tags || 38 },
    { icon: UserCheck, label: 'Usuarios', value: crm.users || 4 },
    { icon: Calendar, label: 'Calendarios', value: crm.calendars || 2 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-text">Visao Geral</h2>
        <p className="text-sm text-text-muted mt-1">
          KPIs executivos e resumo do CRM
          {brand !== 'all' && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary-light">
              {brand === 'mateus' ? 'Mateus Cortez' : 'CybNutri'}
            </span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <div key={m.title} className={`animate-fade-in-delay-${Math.min(i, 3)}`}>
            <MetricCard {...m} />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Funil Comercial"
          subtitle="Pipeline comercial por etapa"
          className="animate-fade-in-delay-1"
        >
          {commercialStages.length > 0 ? (
            <FunnelChart stages={commercialStages} />
          ) : (
            <div className="text-center py-8 text-text-dim text-sm">
              Dados do funil serao exibidos com oportunidades registradas.
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Projeto TDI"
          subtitle="Progresso da implantacao — 7 fases"
          className="animate-fade-in-delay-2"
        >
          <ProgressTracker phases={tdiPhases} />
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-text-muted">Progresso geral</span>
              <span className="text-xs font-semibold text-primary-light">
                {Math.round((tdiPhases.filter(p => p.status === 'done').length / tdiPhases.length) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                style={{
                  width: `${(tdiPhases.filter(p => p.status === 'done').length / tdiPhases.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </ChartCard>
      </div>

      {/* CRM Structure */}
      <ChartCard title="Estrutura CRM" subtitle="Resumo da implantacao GoHighLevel" className="animate-fade-in-delay-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {crmItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-bg-hover border border-border">
              <div className="p-2 rounded-lg bg-primary/10 text-primary-light">
                <Icon size={16} />
              </div>
              <div>
                <p className="text-lg font-bold text-text">{value}</p>
                <p className="text-[11px] text-text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
