import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  padded = true,
}) => (
  <section
    className={`bg-white border border-slate-200 rounded-lg ${padded ? 'p-5' : ''} ${className}`}
  >
    {(title || action) && (
      <header
        className={`flex items-start justify-between gap-3 ${padded ? '' : 'px-5 pt-5'} ${
          subtitle || title ? 'mb-4' : ''
        }`}
      >
        <div>
          {title && (
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h2>
          )}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    {children}
  </section>
);
