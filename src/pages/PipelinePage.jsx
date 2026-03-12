import { useQuery } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import { api } from '../lib/api';
import { useBrand } from '../lib/BrandContext';
import { useFilter } from '../lib/FilterContext';
import PipelineCard from '../components/PipelineCard';
import { SkeletonPage } from '../components/LoadingSkeleton';

export default function PipelinePage() {
  const { brand } = useBrand();
  const { seller } = useFilter();

  const { data, isLoading } = useQuery({
    queryKey: ['pipelines', brand, seller],
    queryFn: () => api.pipelines(brand, seller),
  });

  if (isLoading) {
    return <SkeletonPage cards={6} charts={0} />;
  }

  const pipelines = data?.pipelines || [];

  const totalOpps = pipelines.reduce((acc, p) => {
    const s = p.summary || {};
    return acc + (s.open || 0) + (s.won || 0) + (s.lost || 0) + (s.abandoned || 0);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Pipelines</h2>
          <p className="text-sm text-text-muted mt-1">
            {pipelines.length} pipelines &middot; {totalOpps} oportunidades
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary-light">
          <GitBranch size={16} />
          <span className="text-sm font-medium">{pipelines.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {pipelines.map((pipeline, i) => (
          <div key={pipeline.id || pipeline.name || i} className={`animate-fade-in-delay-${Math.min(i, 3)}`}>
            <PipelineCard pipeline={pipeline} />
          </div>
        ))}
      </div>

      {pipelines.length === 0 && (
        <div className="text-center py-16">
          <GitBranch size={48} className="mx-auto text-text-dim mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">Nenhum pipeline encontrado</h3>
          <p className="text-sm text-text-muted">
            Os pipelines serao exibidos aqui quando o CRM estiver configurado.
          </p>
        </div>
      )}
    </div>
  );
}
