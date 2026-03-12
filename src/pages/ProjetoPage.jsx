import { useQuery } from '@tanstack/react-query';
import {
  Rocket,
  CheckCircle2,
  Clock,
  Circle,
  FileText,
  GitBranch,
  Tag,
  UserCheck,
  Calendar,
  Shield,
  Workflow,
  BookOpen,
  LayoutList,
  PenTool,
} from 'lucide-react';
import { api } from '../lib/api';
import ChartCard from '../components/ChartCard';
import ProgressTracker from '../components/ProgressTracker';
import { SkeletonPage } from '../components/LoadingSkeleton';

const phases = [
  { name: 'Diagnostico', status: 'done', description: 'Levantamento completo do cenario atual do CRM e processos de vendas' },
  { name: 'Blueprint', status: 'done', description: 'Desenho da arquitetura de pipelines, campos, tags e automacoes' },
  { name: 'Implantacao', status: 'done', description: 'Criacao de campos, pipelines, tags, usuarios e calendarios no GHL' },
  { name: 'Automacao', status: 'in-progress', description: 'Configuracao de workflows, webhooks e integracoes automatizadas' },
  { name: 'Treinamento', status: 'in-progress', description: 'Capacitacao da equipe no uso do CRM e processos padronizados' },
  { name: 'Auditoria', status: 'pending', description: 'Validacao de dados, testes de fluxo e correcao de inconsistencias' },
  { name: 'Escala', status: 'pending', description: 'Otimizacao continua, dashboards avancados e expansao de automacoes' },
];

const implantationDetails = [
  { icon: FileText, label: 'Campos Customizados', value: 22, status: 'done' },
  { icon: GitBranch, label: 'Pipelines', value: 6, status: 'done' },
  { icon: Tag, label: 'Tags', value: 38, status: 'done' },
  { icon: UserCheck, label: 'Usuarios', value: 4, status: 'done' },
  { icon: Calendar, label: 'Calendarios', value: 2, status: 'done' },
  { icon: Shield, label: 'Score de Verificacao', value: '99%', status: 'done' },
];

const checklist = [
  { label: 'Campos customizados criados (22)', done: true, category: 'CRM' },
  { label: 'Pipelines configurados (6)', done: true, category: 'CRM' },
  { label: 'Tags organizadas (38)', done: true, category: 'CRM' },
  { label: 'Usuarios criados e permissoes definidas', done: true, category: 'CRM' },
  { label: 'Calendarios de agendamento configurados', done: true, category: 'CRM' },
  { label: 'Workflows de automacao (recovery, onboarding)', done: false, category: 'Automacao' },
  { label: 'Webhooks de integracao configurados', done: false, category: 'Automacao' },
  { label: 'Integracao Notion (base de conhecimento)', done: false, category: 'Integracao' },
  { label: 'Integracao Asana (gestao de tarefas)', done: false, category: 'Integracao' },
  { label: 'Integracao Miro (mapas visuais)', done: false, category: 'Integracao' },
  { label: 'Treinamento equipe comercial', done: false, category: 'Treinamento' },
  { label: 'Treinamento gestores', done: false, category: 'Treinamento' },
  { label: 'Auditoria de dados pos-implantacao', done: false, category: 'Auditoria' },
  { label: 'Dashboard de metricas avancadas', done: false, category: 'Escala' },
];

export default function ProjetoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['project-status'],
    queryFn: api.projectStatus,
  });

  if (isLoading) {
    return <SkeletonPage cards={6} charts={2} />;
  }

  const completedPhases = phases.filter((p) => p.status === 'done').length;
  const completedTasks = checklist.filter((c) => c.done).length;
  const progressPercent = Math.round((completedPhases / phases.length) * 100);

  // Group checklist by category
  const categories = [...new Set(checklist.map((c) => c.category))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Projeto TDI</h2>
          <p className="text-sm text-text-muted mt-1">
            Implantacao CRM GoHighLevel — 7 fases
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary-light">
          <Rocket size={16} />
          <span className="text-sm font-medium">{progressPercent}%</span>
        </div>
      </div>

      {/* Progress tracker */}
      <ChartCard
        title="Fases do Projeto"
        subtitle={`${completedPhases} de ${phases.length} fases concluidas`}
        className="animate-fade-in-delay-1"
      >
        <ProgressTracker phases={phases} />

        {/* Overall progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Progresso geral</span>
            <span className="text-sm font-bold text-primary-light">
              {progressPercent}%
            </span>
          </div>
          <div className="h-3 bg-bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary-light to-accent rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </ChartCard>

      {/* Phase details */}
      <ChartCard
        title="Detalhes das Fases"
        subtitle="Status e descricao de cada fase"
        className="animate-fade-in-delay-2"
      >
        <div className="space-y-3">
          {phases.map((phase) => {
            const StatusIcon =
              phase.status === 'done'
                ? CheckCircle2
                : phase.status === 'in-progress'
                  ? Clock
                  : Circle;
            const statusColor =
              phase.status === 'done'
                ? 'text-accent'
                : phase.status === 'in-progress'
                  ? 'text-primary-light'
                  : 'text-text-dim';
            const statusLabel =
              phase.status === 'done'
                ? 'Concluido'
                : phase.status === 'in-progress'
                  ? 'Em andamento'
                  : 'Pendente';

            return (
              <div
                key={phase.name}
                className="flex items-start gap-3 p-3 rounded-lg bg-bg-hover/50 hover:bg-bg-hover transition-colors"
              >
                <StatusIcon size={18} className={`${statusColor} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-text">{phase.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        phase.status === 'done'
                          ? 'bg-accent/15 text-accent'
                          : phase.status === 'in-progress'
                            ? 'bg-primary/15 text-primary-light'
                            : 'bg-bg-hover text-text-dim'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Implantation details */}
      <ChartCard
        title="Implantacao — Detalhes"
        subtitle="Elementos criados no GoHighLevel"
        className="animate-fade-in-delay-2"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {implantationDetails.map(({ icon: Icon, label, value, status }) => (
            <div
              key={label}
              className="p-3 rounded-lg bg-bg-hover border border-border text-center"
            >
              <div className="flex items-center justify-center gap-1 mb-2">
                <Icon size={14} className="text-primary-light" />
                <CheckCircle2 size={12} className="text-accent" />
              </div>
              <p className="text-xl font-bold text-text">{value}</p>
              <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
                {label}
              </p>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Checklist */}
      <ChartCard
        title="Checklist de Entrega"
        subtitle={`${completedTasks} de ${checklist.length} itens concluidos`}
        className="animate-fade-in-delay-3"
      >
        <div className="space-y-5">
          {categories.map((category) => {
            const items = checklist.filter((c) => c.category === category);
            const catDone = items.filter((c) => c.done).length;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {category}
                  </h4>
                  <span className="text-[10px] text-text-dim">
                    ({catDone}/{items.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-hover/50 transition-colors"
                    >
                      {item.done ? (
                        <CheckCircle2 size={16} className="text-accent shrink-0" />
                      ) : (
                        <Circle size={16} className="text-text-dim shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          item.done ? 'text-text-muted line-through' : 'text-text'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}
