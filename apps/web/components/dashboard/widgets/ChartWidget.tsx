import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartWidgetProps {
  data: any;
  config: any;
  isDarkMode: boolean;
  compactMode: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ChartWidget({ data, config, isDarkMode, compactMode }: ChartWidgetProps) {
  const chartType = config.displayConfig?.chartType || 'line';
  const height = compactMode ? 150 : 200;

  if (!data || !Array.isArray(data)) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              {config.displayConfig?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              )}
              <XAxis 
                dataKey={config.dataConfig?.xAxis || 'date'} 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              {config.displayConfig?.showTooltip !== false && <Tooltip />}
              {config.displayConfig?.showLegend && <Legend />}
              <Bar
                dataKey={config.dataConfig?.yAxis || 'value'}
                fill={config.displayConfig?.colors?.[0] || COLORS[0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              {config.displayConfig?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              )}
              <XAxis 
                dataKey={config.dataConfig?.xAxis || 'date'} 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              {config.displayConfig?.showTooltip !== false && <Tooltip />}
              {config.displayConfig?.showLegend && <Legend />}
              <Area
                type="monotone"
                dataKey={config.dataConfig?.yAxis || 'value'}
                stroke={config.displayConfig?.colors?.[0] || COLORS[0]}
                fill={config.displayConfig?.colors?.[0] || COLORS[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={config.displayConfig?.showLabels}
                outerRadius={compactMode ? 50 : 80}
                fill={COLORS[0]}
                dataKey={config.dataConfig?.valueKey || 'value'}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={config.displayConfig?.colors?.[index] || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              {config.displayConfig?.showTooltip !== false && <Tooltip />}
              {config.displayConfig?.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              {config.displayConfig?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              )}
              <XAxis 
                dataKey={config.dataConfig?.xAxis || 'date'} 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              {config.displayConfig?.showTooltip !== false && <Tooltip />}
              {config.displayConfig?.showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey={config.dataConfig?.yAxis || 'value'}
                stroke={config.displayConfig?.colors?.[0] || COLORS[0]}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return <div className="w-full">{renderChart()}</div>;
}