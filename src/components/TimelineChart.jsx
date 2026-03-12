import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatBRL } from '../lib/utils';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="font-semibold text-text">
            {entry.dataKey === 'revenue' || entry.dataKey === 'cumRevenue'
              ? formatBRL(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TimelineChart({ data = [], mode = 'daily' }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-text-dim text-sm">
        Dados temporais serao exibidos com oportunidades registradas.
      </div>
    );
  }

  // Format date labels
  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }));

  if (mode === 'cumulative') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26428B" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#26428B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="cumRevenue" name="Receita Acumulada" stroke="#26428B"
            fill="url(#gradRevenue)" strokeWidth={2.5} dot={false} />
          <Area type="monotone" dataKey="cumWon" name="Vendas Acumuladas" stroke="#10b981"
            fill="transparent" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradOpps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26428B" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#26428B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8}
          formatter={(value) => <span className="text-xs text-text-muted">{value}</span>} />
        <Area type="monotone" dataKey="opps" name="Oportunidades" stroke="#26428B"
          fill="url(#gradOpps)" strokeWidth={2.5} dot={false} />
        <Area type="monotone" dataKey="won" name="Vendas" stroke="#10b981"
          fill="url(#gradWon)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="lost" name="Perdidas" stroke="#ef4444"
          fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
