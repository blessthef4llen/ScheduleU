type EmptyStateProps = {
  icon?: string;
  title: string;
  text: string;
};

export default function EmptyState({ icon = "🔕", title, text }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__text">{text}</p>
    </div>
  );
}
