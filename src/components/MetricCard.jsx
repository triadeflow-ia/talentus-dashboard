import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorMap = {
  primary: {
    border: 'border-l-primary',
    icon: 'text-primary-light bg-primary/10',
    trend: 'text-primary-light',
  },
  accent: {
    border: 'border-l-accent',
    icon: 'text-accent-light bg-accent/10',
    trend: 'text-accent',
  },
  warning: {
    border: 'border-l-warning',
    icon: 'text-warning-light bg-warning/10',
    trend: 'text-warning',
  },
  danger: {
    border: 'border-l-danger',
    icon: 'text-danger-light bg-danger/10',
    trend: 'text-danger',
  },
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
}) {
  const colors = colorMap[color] || colorMap.primary;

  const TrendIcon =
    trend === 'up'
      ? TrendingUp
      : trend === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    trend === 'up'
      ? 'text-accent'
      : trend === 'down'
        ? 'text-danger'
        : 'text-text-dim';

  return (
    <div
      className={`
        bg-bg-card rounded-xl border border-border border-l-4 ${colors.border}
        p-5 hover-card card-scanline
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            {title}
          </p>
          <p className="text-2xl font-bold text-text truncate">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-1.5 mt-2">
              {trend && <TrendIcon size={14} className={trendColor} />}
              <p className={`text-xs ${trendColor}`}>{subtitle}</p>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${colors.icon} shrink-0 ml-3`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
