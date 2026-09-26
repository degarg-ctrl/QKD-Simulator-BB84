export default function ParameterTooltip({ 
  title, 
  description, 
  range, 
  defaultValue, 
  impact
}) {
  return (
    <div className="rounded-lg shadow-2xl w-72 overflow-hidden border font-body"
         style={{ backgroundColor: 'var(--tooltip-bg, var(--panel-bg))', borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b"
           style={{ backgroundColor: 'rgba(0, 180, 220, 0.1)', borderColor: 'var(--border-color)' }}>
        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Description */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>

        {/* Range & Default */}
        {range && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wide">Range</span>
              <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{range}</span>
            </div>
            {defaultValue && (
              <div className="flex justify-between items-center">
                <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wide">Default</span>
                <span className="text-cyan-400 text-sm font-mono">{defaultValue}</span>
              </div>
            )}
          </div>
        )}

        {/* Impact */}
        {impact && (
          <div>
            <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
              Impact
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
              {impact}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
