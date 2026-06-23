import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  onNavigate?: () => void;
  className?: string;
  dark?: boolean;
  noPadding?: boolean;
}

export function WidgetCard({ title, children, onNavigate, className = '', dark = false, noPadding = false }: WidgetCardProps) {
  return (
    <div className={`${dark ? 'dark-card' : 'warm-card'} ${noPadding ? '' : 'p-5'} ${className}`}>
      <div className={`flex items-center justify-between ${noPadding ? 'px-5 pt-5' : ''} mb-4`}>
        <h3 className={`text-sm font-semibold ${dark ? 'text-white/90' : 'text-gray-800'}`}>{title}</h3>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              dark ? 'bg-white/10 hover:bg-white/20' : 'bg-[#f5f0e5] hover:bg-[#ebe4d0]'
            }`}
          >
            <ArrowUpRight size={14} className={dark ? 'text-white/70' : 'text-gray-500'} />
          </button>
        )}
      </div>
      <div className={noPadding ? 'px-5 pb-5' : ''}>
        {children}
      </div>
    </div>
  );
}

interface AccordionProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({ title, subtitle, icon, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="warm-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#f5f0e5]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="text-left">
            <p className="font-semibold text-sm text-gray-800">{title}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-[#e8e2d4] animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

interface PillTabsProps {
  tabs: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onChange: (key: string) => void;
}

export function PillTabs({ tabs, active, onChange }: PillTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`pill-tab ${active === tab.key ? 'active' : ''}`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              active === tab.key ? 'bg-white/20' : 'bg-gray-200/80'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface SegmentedProgressProps {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
}

export function SegmentedProgress({ segments, total }: SegmentedProgressProps) {
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-2">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="h-full transition-all duration-500"
            style={{
              width: total > 0 ? `${(seg.value / total) * 100}%` : '0%',
              backgroundColor: seg.color,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[11px] text-gray-500">{seg.label}</span>
            <span className="text-[11px] font-bold text-gray-700">
              {total > 0 ? `${((seg.value / total) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
