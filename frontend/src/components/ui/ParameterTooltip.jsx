export default function ParameterTooltip({ 
  title, 
  description, 
  range, 
  defaultValue, 
  impact
}) {
  return (
    <div className="bg-gray-900/98 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl w-72 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-900/30 to-transparent border-b border-cyan-500/20">
        <h3 className="text-white font-semibold text-base">{title}</h3>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed">
          {description}
        </p>

        {/* Range & Default */}
        {range && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wide">Range</span>
              <span className="text-gray-300 text-sm font-mono">{range}</span>
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
            <p className="text-gray-400 text-sm leading-relaxed">
              {impact}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
