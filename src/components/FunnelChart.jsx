import { formatNumber, formatPercent } from '../lib/utils';

const stageColors = [
  '#6366f1',
  '#818cf8',
  '#a78bfa',
  '#c4b5fd',
  '#93c5fd',
  '#67e8f9',
  '#10b981',
];

export default function FunnelChart({ stages = [], showConversion = true }) {
  if (!stages.length) {
    return (
      <div className="flex items-center justify-center py-8 text-text-dim text-sm">
        Nenhum dado disponivel
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count || 0), 1);

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
            {/* Conversion rate between stages */}
            {showConversion && conversionRate !== null && (
              <div className="flex items-center gap-2 py-1 pl-2">
                <div className="w-px h-3 bg-border-light" />
                <span className="text-[10px] text-text-dim">
                  {formatPercent(conversionRate)} conversao
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 group">
              {/* Stage name */}
              <div className="w-32 shrink-0 text-right">
                <span className="text-xs text-text-muted group-hover:text-text transition-colors truncate block">
                  {stage.name}
                </span>
              </div>

              {/* Bar */}
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
