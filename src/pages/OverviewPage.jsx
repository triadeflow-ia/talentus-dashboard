import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Target, Trophy, TrendingUp, DollarSign, Ticket,
  BarChart3, LineChart as LineChartIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { useBrand } from '../lib/BrandContext';
import { useFilter } from '../lib/FilterContext';
import { formatBRL, formatNumber, formatPercent } from '../lib/utils';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import FunnelChart from '../components/FunnelChart';
import TimelineChart from '../components/TimelineChart';
import DonutChart from '../components/DonutChart';
import { SkeletonPage } from '../components/LoadingSkeleton';

export default function OverviewPage() {
  const { brand } = useBrand();
  const { seller, period } = useFilter();
  const [timelineMode, setTimelineMode] = useState('daily');

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['overview', brand, seller, period],
    queryFn: () => api.overview(brand, seller, period),
    staleTime: 300_000,
  });

  const { data: timelineData } = useQuery({
    queryKey: ['timeline', brand, seller, period],
    queryFn: () => api.timeline(brand, seller, period),
    staleTime: 300_000,
  });

  const { data: distData } = useQuery({
    queryKey: ['distribution', brand, seller, period],
    queryFn: () => api.distribution(brand, seller, period),
    staleTime: 300_000,
  });

  if (loadingOverview) {
    return <SkeletonPage cards={6} charts={2} />;
  }

  const data = overview || {};
  const timeline = timelineData?.timeline || [];
  const dist = distData || { byStatus: [], byProduct: [], byBrand: [], bySeller: [] };

  const metrics = [
    {
      title: 'Total de Leads',
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
      title: 'Vendas Fechadas',
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-text">Visao Geral</h2>
        <p className="text-sm text-text-muted mt-1">
          Receita, vendas e desempenho comercial
          {brand !== 'all' && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary-light">
              {brand === 'mateus' ? 'Mateus Cortez' : 'CybNutri'}
            </span>
          )}
          {seller !== 'all' && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/15 text-accent">
              {seller}
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

      {/* Timeline + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart — 2 cols */}
        <ChartCard
          title="Evolucao no Tempo"
          subtitle={`Ultimos ${period} dias — oportunidades e vendas`}
          className="lg:col-span-2 animate-fade-in-delay-1"
        >
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setTimelineMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all
                ${timelineMode === 'daily'
                  ? 'bg-primary/15 text-primary-light border border-primary/30'
                  : 'text-text-muted hover:text-text bg-bg-hover border border-border'
                }`}
            >
              <BarChart3 size={12} />
              Diario
            </button>
            <button
              onClick={() => setTimelineMode('cumulative')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all
                ${timelineMode === 'cumulative'
                  ? 'bg-primary/15 text-primary-light border border-primary/30'
                  : 'text-text-muted hover:text-text bg-bg-hover border border-border'
                }`}
            >
              <LineChartIcon size={12} />
              Acumulado
            </button>
          </div>
          <TimelineChart data={timeline} mode={timelineMode} />
        </ChartCard>

        {/* Funnel — 1 col */}
        <ChartCard
          title="Funil Comercial"
          subtitle="Pipelines comerciais (Mateus + CybNutri)"
          className="animate-fade-in-delay-2"
        >
          {commercialStages.length > 0 ? (
            <FunnelChart stages={commercialStages} variant="pyramid" />
          ) : (
            <div className="text-center py-8 text-text-dim text-sm">
              Dados do funil serao exibidos com oportunidades registradas.
            </div>
          )}
        </ChartCard>
      </div>

      {/* Donuts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* By Status */}
        <ChartCard
          title="Distribuicao por Status"
          subtitle="Oportunidades por situacao"
          className="animate-fade-in-delay-1"
        >
          <DonutChart data={dist.byStatus} type="status" centerLabel="Oport." />
        </ChartCard>

        {/* By Product */}
        <ChartCard
          title="Receita por Produto"
          subtitle="Top produtos por faturamento"
          className="animate-fade-in-delay-2"
        >
          <DonutChart
            data={dist.byProduct.slice(0, 6).map(p => ({ name: p.name, value: p.count, revenue: p.revenue }))}
            centerLabel="Produtos"
          />
        </ChartCard>

        {/* By Seller */}
        <ChartCard
          title="Desempenho por Vendedor"
          subtitle="Oportunidades por responsavel"
          className="animate-fade-in-delay-3"
        >
          <DonutChart
            data={dist.bySeller.map(s => ({ name: s.name, value: s.count, revenue: s.revenue }))}
            centerLabel="Vendedores"
          />
        </ChartCard>
      </div>

      {/* Taxa de Conversao por Etapa do Funil */}
      {commercialStages.length > 1 && (
        <ChartCard
          title="Taxa de Conversao por Etapa"
          subtitle="Funil comercial combinado — conversao entre etapas"
          className="animate-fade-in-delay-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Etapa</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Quantidade</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Conversao</th>
                  <th className="text-left py-3 px-3 text-xs text-text-dim font-medium uppercase tracking-wider w-1/3">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {commercialStages.map((stage, i) => {
                  const prevCount = i > 0 ? commercialStages[i - 1].count : stage.count;
                  const conversion = prevCount > 0 ? ((stage.count || 0) / prevCount) * 100 : 100;
                  const totalConversion = commercialStages[0].count > 0
                    ? ((stage.count || 0) / commercialStages[0].count) * 100
                    : 0;
                  const barColor = conversion >= 70 ? '#10b981' : conversion >= 40 ? '#f59e0b' : '#ef4444';

                  return (
                    <tr key={stage.name} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-bg-hover text-text-dim">
                            {i + 1}
                          </span>
                          <span className="font-medium text-text">{stage.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-text">{formatNumber(stage.count || 0)}</td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-bold" style={{ color: barColor }}>
                          {i === 0 ? '—' : formatPercent(conversion)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="h-2 w-full bg-bg-hover rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${totalConversion}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {commercialStages.length > 0 && commercialStages[0].count > 0 && (
            <div className="mt-3 flex items-center justify-between px-2 py-2 rounded-lg bg-bg-hover">
              <span className="text-xs text-text-muted">Conversao total (topo → fim)</span>
              <span className="text-sm font-bold text-primary-light">
                {formatPercent(
                  commercialStages[0].count > 0
                    ? ((commercialStages[commercialStages.length - 1].count || 0) / commercialStages[0].count) * 100
                    : 0
                )}
              </span>
            </div>
          )}
        </ChartCard>
      )}

      {/* Tabela Oportunidades Recentes */}
      <ChartCard
        title="Resumo por Pipeline"
        subtitle="Oportunidades por pipeline e status"
        className="animate-fade-in-delay-3"
      >
        {data.pipelineSummary?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Pipeline</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Total</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Abertas</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Ganhas</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Perdidas</th>
                  <th className="text-right py-3 px-2 text-xs text-text-dim font-medium uppercase tracking-wider">Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.pipelineSummary.map((p) => (
                  <tr key={p.pipelineId} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                    <td className="py-3 px-2 font-medium text-text">{p.pipelineName}</td>
                    <td className="py-3 px-2 text-right text-text-muted">{formatNumber(p.total)}</td>
                    <td className="py-3 px-2 text-right text-warning">{formatNumber(p.open)}</td>
                    <td className="py-3 px-2 text-right text-accent">{formatNumber(p.won)}</td>
                    <td className="py-3 px-2 text-right text-danger">{formatNumber(p.lost)}</td>
                    <td className="py-3 px-2 text-right font-semibold text-primary-light">{formatBRL(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-text-dim text-sm">
            Dados serao exibidos com oportunidades registradas.
          </div>
        )}
      </ChartCard>
    </div>
  );
}
