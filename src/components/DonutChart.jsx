import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatBRL, formatNumber } from '../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const STATUS_COLORS = {
  open: '#f59e0b',
  won: '#10b981',
  lost: '#ef4444',
  abandoned: '#64748b',
};

const STATUS_LABELS = {
  open: 'Abertas',
  won: 'Ganhas',
  lost: 'Perdidas',
  abandoned: 'Abandonadas',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.fill }} />
        <span className="font-semibold text-text">{d.name}</span>
      </div>
      <p className="text-xs text-text-muted mt-1">
        {d.payload.revenue != null ? formatBRL(d.payload.revenue) : formatNumber(d.value)}
        {d.payload.count != null && ` (${d.payload.count} opps)`}
      </p>
    </div>
  );
}

export default function DonutChart({ data = [], type = 'default', centerLabel, centerValue }) {
  if (!data.length || data.every(d => (d.value || d.count || 0) === 0)) {
    return (
      <div className="flex items-center justify-center h-[220px] text-text-dim text-sm">
        Sem dados para exibir
      </div>
    );
  }

  const isStatus = type === 'status';
  const chartData = data.map((d, i) => ({
    ...d,
    name: isStatus ? (STATUS_LABELS[d.name] || d.name) : d.name,
    value: d.value || d.count || 0,
    fill: isStatus ? (STATUS_COLORS[d.name] || COLORS[i]) : COLORS[i % COLORS.length],
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-text">{centerValue || formatNumber(total)}</span>
          <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest">
            {centerLabel || 'Total'}
          </span>
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2 mt-2 px-2">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
            <span className="text-xs text-text-muted truncate">{d.name}</span>
            <span className="text-xs font-semibold text-text ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
