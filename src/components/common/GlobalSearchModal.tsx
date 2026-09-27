import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User, BookOpen, Building2, MapPin, CornerDownLeft } from 'lucide-react';
import { Trainee, TrainingProgram, TrainingProvider } from '../../types';
import { MAHARASHTRA_DISTRICTS } from '../../data/reference';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainees: Trainee[];
  programs: TrainingProgram[];
  providers: TrainingProvider[];
  onSelectTrainee: (trainee: Trainee) => void;
  onNavigate: (section: string, payload?: string) => void;
}

type Result =
  | { kind: 'trainee'; label: string; sub: string; trainee: Trainee }
  | { kind: 'program'; label: string; sub: string; id: string }
  | { kind: 'provider'; label: string; sub: string; id: string }
  | { kind: 'district'; label: string; sub: string; id: string };

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  trainees,
  programs,
  providers,
  onSelectTrainee,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];

    trainees
      .filter(
        (t) =>
          t.fullName.toLowerCase().includes(q) ||
          t.traineeId.toLowerCase().includes(q) ||
          t.district.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((t) =>
        out.push({ kind: 'trainee', label: t.fullName, sub: `${t.traineeId} · ${t.district}`, trainee: t })
      );

    programs
      .filter(
        (p) =>
          p.courseName.toLowerCase().includes(q) || p.sector.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach((p) =>
        out.push({ kind: 'program', label: p.courseName, sub: `Programme · ${p.sector}`, id: p.id })
      );

    providers
      .filter(
        (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach((p) =>
        out.push({ kind: 'provider', label: p.name, sub: `Provider · ${p.type}`, id: p.id })
      );

    MAHARASHTRA_DISTRICTS.filter((d) => d.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((d) =>
        out.push({ kind: 'district', label: d, sub: 'District · Maharashtra', id: d })
      );

    return out;
  }, [query, trainees, programs, providers]);

  if (!isOpen) return null;

  const icons = {
    trainee: User,
    program: BookOpen,
    provider: Building2,
    district: MapPin,
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/40 animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trainees, programmes, providers, districts…"
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() === '' && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-slate-400">
                Search across Maharashtra trainees, programmes, providers and districts
              </p>
            </div>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-slate-400">No matches found for “{query}”</p>
            </div>
          )}
          {results.map((r, i) => {
            const Icon = icons[r.kind];
            return (
              <button
                key={`${r.kind}-${i}`}
                onClick={() => {
                  if (r.kind === 'trainee') onSelectTrainee(r.trainee);
                  else if (r.kind === 'program') onNavigate('analytics');
                  else if (r.kind === 'provider') onNavigate('providers');
                  else if (r.kind === 'district') onNavigate('districts', r.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gov-50 transition-colors text-left group"
              >
                <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-slate-800 truncate">
                    {r.label}
                  </span>
                  <span className="block text-[11px] text-slate-400 truncate">{r.sub}</span>
                </span>
                <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-gov-600 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
