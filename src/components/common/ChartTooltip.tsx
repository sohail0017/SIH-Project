import React from 'react';

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string | number) => string;
}

/**
 * Shared, restrained chart tooltip used across all visualisations.
 */
export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  // Scatter charts carry the entity name inside the first payload datum
  const entityName = (payload[0] as { payload?: { name?: string } } | undefined)?.payload?.name;
  const heading =
    label !== undefined && label !== ''
      ? labelFormatter
        ? labelFormatter(label)
        : String(label)
      : entityName;
  // Skip null/undefined series values (chart gaps = "no data", not 0)
  const rows = payload.filter((item) => item.value !== null && item.value !== undefined);
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 max-w-[220px]">
      {heading && <p className="text-[11px] font-semibold text-slate-900 mb-1">{heading}</p>}
      <div className="space-y-0.5">
        {rows.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: item.color || '#264f83' }}
              />
              {item.name}
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatter ? formatter(Number(item.value), String(item.name)) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Central chart colour tokens (kept in sync with the gov palette)
export const CHART = {
  primary: '#264f83',
  primaryLight: '#649bce',
  positive: '#047857',
  warning: '#b45309',
  negative: '#be123c',
  neutral: '#94a3b8',
  violet: '#6d28d9',
  cyan: '#0e7490',
  grid: '#e8edf3',
  axis: '#94a3b8',
};
