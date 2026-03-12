import { Check, Clock, Circle } from 'lucide-react';

const statusConfig = {
  done: {
    bg: 'bg-accent',
    border: 'border-accent',
    text: 'text-accent',
    icon: Check,
    glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',
  },
  'in-progress': {
    bg: 'bg-primary',
    border: 'border-primary',
    text: 'text-primary-light',
    icon: Clock,
    glow: 'shadow-[0_0_10px_rgba(99,102,241,0.4)]',
  },
  pending: {
    bg: 'bg-bg-hover',
    border: 'border-border-light',
    text: 'text-text-dim',
    icon: Circle,
    glow: '',
  },
};

export default function ProgressTracker({ phases = [] }) {
  if (!phases.length) return null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start gap-0 min-w-[640px] px-2 py-4">
        {phases.map((phase, i) => {
          const config = statusConfig[phase.status] || statusConfig.pending;
          const Icon = config.icon;
          const isLast = i === phases.length - 1;

          return (
            <div key={phase.name} className="flex items-start flex-1">
              {/* Step */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    border-2 ${config.border} ${config.bg} ${config.glow}
                    transition-all duration-300
                  `}
                >
                  <Icon size={18} className="text-white" />
                </div>
                <p
                  className={`text-[11px] font-medium mt-2 text-center max-w-[90px] leading-tight ${config.text}`}
                >
                  {phase.name}
                </p>
                {phase.status !== 'pending' && (
                  <p className="text-[10px] text-text-dim mt-0.5 capitalize">
                    {phase.status === 'done' ? 'Concluido' : 'Em andamento'}
                  </p>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 flex items-center pt-5 px-1">
                  <div
                    className={`h-0.5 w-full rounded ${
                      phase.status === 'done'
                        ? 'bg-accent'
                        : phase.status === 'in-progress'
                          ? 'bg-gradient-to-r from-primary to-border'
                          : 'bg-border'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
