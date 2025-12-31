"use client";

import { useState, useMemo } from "react";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface MetricOption {
  key: string;
  label: string;
  formatValue?: (value: number) => string;
}

interface DashboardSelectableChartProps {
  title: string;
  data: Array<{
    label: string;
    [key: string]: any;
  }>;
  metrics: MetricOption[];
  defaultMetric?: string;
  height?: number;
  colors?: string[];
}

export function DashboardSelectableChart({ 
  title, 
  data, 
  metrics,
  defaultMetric,
  height = 300,
  colors = [
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
  ]
}: DashboardSelectableChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>(
    defaultMetric || metrics[0]?.key || ''
  );

  const selectedMetricOption = metrics.find(m => m.key === selectedMetric) || metrics[0];
  const formatValue = selectedMetricOption?.formatValue || ((v) => v.toLocaleString());

  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((item, index) => ({
      label: item.label,
      value: item[selectedMetric] || 0,
      color: colors[index % colors.length],
    }));
  }, [data, selectedMetric, colors]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => Math.abs(d.value)), 1);
  }, [chartData]);

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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-main">{title}</h3>
        
        {/* Metric selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">מדד:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {metrics.map((metric) => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <div className="flex items-end justify-between gap-2 h-full">
          {chartData.map((point, index) => {
            const barHeight = maxValue > 0 ? (Math.abs(point.value) / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full">
                {/* Value label on top */}
                <div className="text-xs font-medium text-text-main text-center">
                  {formatValue(point.value)}
                </div>
                
                {/* Bar */}
                <div 
                  className={`w-full ${point.color} rounded-t-lg transition-all hover:opacity-80 relative group`}
                  style={{ height: `${barHeight}%`, minHeight: barHeight > 0 ? '4px' : '0' }}
                  title={`${point.label}: ${formatValue(point.value)}`}
                >
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {point.label}: {formatValue(point.value)}
                    </div>
                  </div>
                </div>
                
                {/* Label */}
                <div className="text-xs text-text-muted text-center leading-tight px-1">
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

