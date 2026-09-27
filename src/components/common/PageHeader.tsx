import React from 'react';
import { Info } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-500 border border-slate-200"
          title="Demonstration data for illustration. Not official Government of Maharashtra statistics."
        >
          <Info className="w-3 h-3" />
          Demonstration Data
        </span>
      </div>
      {subtitle && (
        <p className="text-[13px] text-slate-500 mt-1 max-w-3xl leading-relaxed">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
