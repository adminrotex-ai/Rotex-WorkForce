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

export default function StatCard({ title, value, subtitle, icon, color = 'bg-gold-300' }: StatCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
      {icon && (
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-dark-800 shrink-0`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-2xl font-light text-gray-900 leading-none">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}
