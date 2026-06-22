import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
}

export default function StatCard({ title, value, subtitle, icon, color = '#001f3f' }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow" style={{ borderRadius: '8px' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-2 rounded-lg" style={{ backgroundColor: color + '10' }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
