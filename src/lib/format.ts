// Formatting helpers — Indian conventions (en-IN)

export const formatNumber = (n: number): string => n.toLocaleString('en-IN');

export const formatINR = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

export const formatCompactINR = (n: number): string => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

export const formatCompactNumber = (n: number): string => {
  if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

export const formatPct = (n: number, decimals = 1): string => `${n.toFixed(decimals)}%`;

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
