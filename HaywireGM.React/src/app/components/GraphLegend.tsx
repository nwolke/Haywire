interface GraphLegendItem {
  type: string;
  color: string;
  label: string;
}

const defaultNodeItems: GraphLegendItem[] = [
  { type: 'npc', color: 'hsl(var(--primary) / 0.7)', label: 'NPC' },
  { type: 'pc', color: 'rgba(34,197,94,0.7)', label: 'PC' },
  { type: 'organization', color: 'rgba(14,165,233,0.7)', label: 'Organization' },
];

interface GraphLegendProps {
  items: GraphLegendItem[];
  nodeItems?: GraphLegendItem[];
}

export function GraphLegend({ items, nodeItems = defaultNodeItems }: GraphLegendProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap px-2 py-1.5 bg-card/40 border border-primary/20 rounded-xl">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Relationships:
      </span>
      {items.map(({ type, color, label }) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
      {nodeItems.length > 0 && (
        <div className="flex items-center gap-3 ml-2 border-l border-primary/20 pl-2">
          {nodeItems.map(({ type, color, label }) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
