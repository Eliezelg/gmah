// Widget stubs - to be implemented
export function TableWidget({ data }: any) {
  return <div className="p-4">Table Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}

export function ListWidget({ data }: any) {
  return <div className="p-4">List Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}

export function CalendarWidget({ data }: any) {
  return <div className="p-4">Calendar Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}

export function GaugeWidget({ data }: any) {
  return <div className="p-4">Gauge Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}

export function ProgressWidget({ data }: any) {
  return <div className="p-4">Progress Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}

export function AlertWidget({ data }: any) {
  return <div className="p-4">Alert Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}

export function HeatmapWidget({ data }: any) {
  return <div className="p-4">Heatmap Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}

export function TimelineWidget({ data }: any) {
  return <div className="p-4">Timeline Widget - {JSON.stringify(data).slice(0, 50)}...</div>;
}