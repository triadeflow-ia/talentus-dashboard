export function formatBRL(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatCompact(value) {
  if (value == null || isNaN(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercent(value) {
  if (value == null || isNaN(value)) return '0%';
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function statusColor(status) {
  const map = {
    won: '#10b981',
    lost: '#ef4444',
    open: '#f59e0b',
    abandoned: '#64748b',
  };
  return map[status] || '#94a3b8';
}

export function statusLabel(status) {
  const map = {
    won: 'Ganhas',
    lost: 'Perdidas',
    open: 'Abertas',
    abandoned: 'Abandonadas',
  };
  return map[status] || status;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
