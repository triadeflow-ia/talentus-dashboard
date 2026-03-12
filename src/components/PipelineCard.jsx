import { GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatNumber } from '../lib/utils';
import FunnelChart from './FunnelChart';

const statusBadge = {
  open: { bg: 'bg-warning/15', text: 'text-warning', label: 'Abertas' },
  won: { bg: 'bg-accent/15', text: 'text-accent', label: 'Ganhas' },
  lost: { bg: 'bg-danger/15', text: 'text-danger', label: 'Perdidas' },
  abandoned: { bg: 'bg-text-dim/15', text: 'text-text-dim', label: 'Abandonadas' },
};

export default function PipelineCard({ pipeline }) {
  const [expanded, setExpanded] = useState(false);

  const {
    name = 'Pipeline',
    stages = [],
    summary = {},
  } = pipeline || {};

  const totalOpps = (summary.open || 0) + (summary.won || 0) + (summary.lost || 0) + (summary.abandoned || 0);

  return (
    <div className="bg-bg-card rounded-xl border border-border hover-card card-scanline">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary-light">
            <GitBranch size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">{name}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {stages.length} etapas &middot; {formatNumber(totalOpps)} oportunidades
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badges */}
          <div className="hidden sm:flex items-center gap-2">
            {Object.entries(statusBadge).map(([key, badge]) => {
              const count = summary[key] || 0;
              if (count === 0) return null;
              return (
                <span
                  key={key}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}
                >
                  {count} {badge.label}
                </span>
              );
            })}
          </div>

          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-border">
          <div className="pt-4">
            <FunnelChart stages={stages} showConversion={true} />
          </div>

          {/* Mobile status badges */}
          <div className="flex sm:hidden flex-wrap gap-2 mt-4">
            {Object.entries(statusBadge).map(([key, badge]) => {
              const count = summary[key] || 0;
              if (count === 0) return null;
              return (
                <span
                  key={key}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}
                >
                  {count} {badge.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
