import { formatNumber, formatPercent } from '../lib/utils';

const stageColors = [
  '#26428B',
  '#3a5ca8',
  '#4d6fb8',
  '#C0B289',
  '#7a8fb8',
  '#94a8cc',
  '#d4c9a5',
];

const funnelLabels = ['TOPO', 'TOPO', 'MEIO', 'MEIO', 'FIM', 'FIM', 'FIM'];

export default function FunnelChart({ stages = [], showConversion = true, variant = 'pyramid' }) {
  if (!stages.length) {
    return (
      <div className="flex items-center justify-center py-8 text-text-dim text-sm">
        Nenhum dado disponivel
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count || 0), 1);

  if (variant === 'bars') {
    return <BarFunnel stages={stages} maxCount={maxCount} showConversion={showConversion} />;
  }

  // Pyramid variant (like the reference)
  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const widthPercent = Math.max(((stage.count || 0) / maxCount) * 100, 15);
        const dropoff = i > 0 && stages[i - 1].count > 0
          ? (1 - (stage.count || 0) / stages[i - 1].count) * 100
          : null;
        const color = stageColors[i % stageColors.length];
        const funnelSection = i < stages.length / 3 ? 'TOPO' : i < (stages.length * 2) / 3 ? 'MEIO' : 'FIM';
        const showLabel = i === 0 || (i === Math.floor(stages.length / 3)) || (i === Math.floor((stages.length * 2) / 3));

        return (
          <div key={stage.name || i}>
            {showLabel && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                  {funnelSection} DE FUNIL
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            <div className="flex flex-col items-center gap-1">
              <div className="w-full flex items-center justify-between px-1 mb-0.5">
                <span className="text-xs font-bold text-text">{stage.name}</span>
                <span className="text-xs font-bold text-text">{formatNumber(stage.count || 0)}</span>
              </div>
              <div
                className="h-10 rounded-lg transition-all duration-500 flex items-center justify-center"
                style={{
                  width: `${widthPercent}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                }}
              >
                {stage.count > 0 && (
                  <span className="text-xs font-semibold text-white/80">
                    {formatPercent((stage.count / maxCount) * 100)}
                  </span>
                )}
              </div>
              {showConversion && dropoff !== null && dropoff > 0 && (
                <span className="text-[10px] text-text-dim font-bold">
                  {formatPercent(dropoff)} perda
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarFunnel({ stages, maxCount, showConversion }) {
  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const widthPercent = Math.max(((stage.count || 0) / maxCount) * 100, 8);
        const conversionRate =
          i > 0 && stages[i - 1].count > 0
            ? ((stage.count || 0) / stages[i - 1].count) * 100
            : null;
        const color = stageColors[i % stageColors.length];

        return (
          <div key={stage.name || i}>
            {showConversion && conversionRate !== null && (
              <div className="flex items-center gap-2 py-1 pl-2">
                <div className="w-px h-3 bg-border-light" />
                <span className="text-[10px] text-text-dim">
                  {formatPercent(conversionRate)} conversao
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 group">
              <div className="w-32 shrink-0 text-right">
                <span className="text-xs text-text-muted group-hover:text-text transition-colors truncate block">
                  {stage.name}
                </span>
              </div>
              <div className="flex-1 h-8 bg-bg-hover rounded relative overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500 ease-out flex items-center px-3"
                  style={{
                    width: `${widthPercent}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  }}
                >
                  <span className="text-xs font-semibold text-white whitespace-nowrap">
                    {formatNumber(stage.count || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
