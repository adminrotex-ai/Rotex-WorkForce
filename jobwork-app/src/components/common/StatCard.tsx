import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  trend?: { value: string; positive: boolean };
  progress?: number;
}

export default function StatCard({ title, value, subtitle, icon, color = '#1a237e', trend, progress }: StatCardProps) {
  const circumference = 2 * Math.PI * 28;
  const dashOffset = progress !== undefined ? circumference - (progress / 100) * circumference : 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover-lift group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-2 tracking-tight" style={{ color }}>{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
              <span>{trend.positive ? '+' : ''}{trend.value}</span>
            </div>
          )}
        </div>
        {progress !== undefined ? (
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" stroke="#e8edf1" strokeWidth="4" fill="none" />
              <circle
                cx="32" cy="32" r="28"
                stroke={color}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
              {Math.round(progress)}%
            </span>
          </div>
        ) : icon ? (
          <div
            className="p-3 rounded-xl transition-transform group-hover:scale-110"
            style={{ backgroundColor: color + '12' }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
