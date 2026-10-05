import type { LucideIcon } from 'lucide-react';
export function MetricCard({
  title,
  value,
  caption,
  icon: Icon,
  accent = false,
}: {
  title: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <article className={'metric-card' + (accent ? ' metric-accent' : '')}>
      <div className="metric-top">
        <h2>{title}</h2>
        <span className="metric-icon">
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-caption">{caption}</p>
    </article>
  );
}
