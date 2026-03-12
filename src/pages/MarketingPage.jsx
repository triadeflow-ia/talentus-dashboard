import {
  Megaphone,
  Facebook,
  Search,
  Globe,
  Plug,
  Clock,
  BarChart3,
  Target,
} from 'lucide-react';
import ChartCard from '../components/ChartCard';

const channels = [
  {
    name: 'Meta Ads',
    description: 'Facebook e Instagram Ads — campanhas, conjuntos e anuncios com metricas de performance',
    icon: Facebook,
    color: '#6366f1',
    status: 'not_connected',
    features: ['Campanhas ativas', 'CPL e CPA', 'ROAS', 'Conversoes por funil'],
  },
  {
    name: 'Google Ads',
    description: 'Campanhas de Search, Display e YouTube com acompanhamento de conversoes',
    icon: Search,
    color: '#f59e0b',
    status: 'not_connected',
    features: ['Palavras-chave', 'Quality Score', 'CPC medio', 'Conversoes'],
  },
  {
    name: 'Trafego Organico',
    description: 'Acompanhamento de visitas organicas, SEO e presenca digital',
    icon: Globe,
    color: '#10b981',
    status: 'not_connected',
    features: ['Sessoes organicas', 'Palavras rankeadas', 'Paginas mais visitadas', 'Bounce rate'],
  },
];

export default function MarketingPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text">Marketing</h2>
        <p className="text-sm text-text-muted mt-1">
          Campanhas e trafego pago
        </p>
      </div>

      {/* Coming soon banner */}
      <div className="bg-gradient-to-r from-primary/10 via-bg-card to-primary/5 rounded-xl border border-primary/20 p-8 text-center card-scanline animate-pulse-glow">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <Megaphone size={28} className="text-primary-light" />
        </div>
        <h3 className="text-2xl font-bold text-text mb-2">Em Breve</h3>
        <p className="text-sm text-text-muted max-w-md mx-auto">
          As metricas de marketing serao disponibilizadas quando as integracoes com
          plataformas de anuncios forem conectadas.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-primary-light">
          <Clock size={14} />
          <span>Fase de Automacao &amp; Integracoes</span>
        </div>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((channel, i) => {
          const Icon = channel.icon;
          return (
            <div
              key={channel.name}
              className={`bg-bg-card rounded-xl border border-border p-5 hover-card card-scanline animate-fade-in-delay-${Math.min(i + 1, 3)}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-lg"
                    style={{
                      backgroundColor: `${channel.color}15`,
                      color: channel.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-text">
                    {channel.name}
                  </h3>
                </div>

                {/* Connection status */}
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-hover text-[10px] font-medium text-text-dim">
                  <Plug size={10} />
                  Nao conectado
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                {channel.description}
              </p>

              {/* Features that will be available */}
              <div className="border-t border-border pt-3">
                <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">
                  Metricas disponiveis apos conexao
                </p>
                <div className="space-y-1.5">
                  {channel.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-xs text-text-muted"
                    >
                      <div className="w-1 h-1 rounded-full bg-text-dim" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* What's next */}
      <ChartCard
        title="Proximos Passos"
        subtitle="Roadmap de integracoes de marketing"
        className="animate-fade-in-delay-3"
      >
        <div className="space-y-3">
          {[
            {
              step: 1,
              label: 'Conectar Meta Ads (Facebook Business)',
              description: 'Vincular conta de anuncios e configurar tracking de conversoes',
              status: 'pending',
            },
            {
              step: 2,
              label: 'Conectar Google Ads',
              description: 'Integrar campanhas e configurar importacao de conversoes do CRM',
              status: 'pending',
            },
            {
              step: 3,
              label: 'Configurar UTMs padronizados',
              description: 'Implementar rastreamento unificado de trafego pago e organico',
              status: 'pending',
            },
            {
              step: 4,
              label: 'Dashboard de ROAS unificado',
              description: 'Visualizar retorno sobre investimento por canal, campanha e produto',
              status: 'pending',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 p-3 rounded-lg bg-bg-hover/50"
            >
              <div className="w-7 h-7 rounded-full bg-bg-hover border border-border flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-text-dim">
                  {item.step}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-text">{item.label}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
