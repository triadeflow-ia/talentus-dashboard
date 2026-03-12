export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`
        bg-bg-card rounded-xl border border-border p-5
        hover-card card-scanline ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-text">{title}</h3>
          )}
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
