"use client";

import { useMemo } from "react";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface DashboardChartProps {
  title: string;
  data: ChartDataPoint[];
  height?: number;
  formatValue?: (value: number, index?: number) => string;
}

export function DashboardChart({ 
  title, 
  data, 
  height = 300,
  formatValue = (v) => v.toLocaleString()
}: DashboardChartProps) {
  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => Math.abs(d.value)), 1);
  }, [data]);

  const defaultColors = [
    'bg-primary',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-cyan-500',
    'bg-lime-500',
  ];

  if (data.length === 0) {
    return (
      <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-text-main mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-text-muted">
          אין נתונים להצגה
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-text-main mb-6">{title}</h3>
      
      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <div className="flex justify-between gap-2 h-full items-end">
          {data.map((point, index) => {
            const barHeight = maxValue > 0 ? (Math.abs(point.value) / maxValue) * 100 : 0;
            const color = point.color || defaultColors[index % defaultColors.length];
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center h-full gap-1">
                {/* Value label on top */}
                <div className="text-xs font-medium text-text-main text-center mb-1">
                  {formatValue(point.value, index)}
                </div>
                
                {/* Bar container - grows from bottom */}
                <div className="w-full flex items-end flex-grow" style={{ minHeight: '100px' }}>
                  <div 
                    className={`w-full ${color} rounded-t-lg transition-all hover:opacity-80 relative group`}
                    style={{ height: `${barHeight}%`, minHeight: barHeight > 0 ? '4px' : '0' }}
                    title={`${point.label}: ${formatValue(point.value, index)}`}
                  >
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        {point.label}: {formatValue(point.value, index)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Label */}
                <div className="text-xs text-text-muted text-center leading-tight px-1 mt-1">
                  {point.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

