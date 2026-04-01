type RecommendationPanelProps = {
  recommendations: string[];
};

export default function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  return (
    <ol className="workload-recommendations">
      {recommendations.map((item) => (
        <li key={item} className="workload-recommendation-item">
          {item}
        </li>
      ))}
    </ol>
  );
}
