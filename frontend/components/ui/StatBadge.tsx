type StatBadgeProps = {
  label: string;
  value: number;
};

export default function StatBadge({ label, value }: StatBadgeProps) {
  return (
    <article className="stat-badge">
      <p className="stat-badge__label">{label}</p>
      <p className="stat-badge__value">{value}</p>
    </article>
  );
}
