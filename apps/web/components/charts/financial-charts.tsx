'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

interface ChartProps {
  data: any[]
  height?: number
}

export function LoanActivityChart({ data, height = 300 }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="approved" 
          stroke="#3B82F6" 
          name="Approuvés"
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="disbursed" 
          stroke="#10B981" 
          name="Décaissés"
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="completed" 
          stroke="#6B7280" 
          name="Complétés"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function CashFlowChart({ data, height = 300 }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
        <Legend />
        <Bar dataKey="inflow" fill="#10B981" name="Entrées" />
        <Bar dataKey="outflow" fill="#EF4444" name="Sorties" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LoanTypePieChart({ data, height = 250 }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.type}: ${entry.percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="amount"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TrendChart({ data, height = 200 }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke="#3B82F6" 
          fillOpacity={1} 
          fill="url(#colorValue)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function RepaymentRateGauge({ rate, height = 200 }: { rate: number; height?: number }) {
  const data = [
    { name: 'Remboursé', value: rate },
    { name: 'Restant', value: 100 - rate }
  ]
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          startAngle={180}
          endAngle={0}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={0}
          dataKey="value"
        >
          <Cell fill="#10B981" />
          <Cell fill="#E5E7EB" />
        </Pie>
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-3xl font-bold"
        >
          {rate}%
        </text>
        <text 
          x="50%" 
          y="50%" 
          dy={20} 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-sm text-muted-foreground"
        >
          Taux de remboursement
        </text>
      </PieChart>
    </ResponsiveContainer>
  )
}