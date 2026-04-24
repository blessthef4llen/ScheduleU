import SectionCard from "@/components/ui/SectionCard";
import StatBadge from "@/components/ui/StatBadge";
import type { WorkloadResult } from "@/lib/workloadScorer";
import CourseDifficultyCard from "./CourseDifficultyCard";
import RecommendationPanel from "./RecommendationPanel";
import WorkloadHeroCard from "./WorkloadHeroCard";
import WorkloadReasonTag from "./WorkloadReasonTag";

type WorkloadAnalysisViewProps = {
  result: WorkloadResult;
  sectionSubtitle: string;
};

export default function WorkloadAnalysisView({ result, sectionSubtitle }: WorkloadAnalysisViewProps) {
  return (
    <div className="workload-dashboard">
      <WorkloadHeroCard score={result.overallScore} label={result.label} explanation={result.explanation} />

      <SectionCard hover className="workload-section-card">
        <p className="page-label workload-stats-eyebrow">Workload summary</p>
        <p className="workload-section-lead">{sectionSubtitle}</p>
        <div className="stats-grid workload-stats-grid">
          <StatBadge label="Active Courses" value={result.stats.activeCourses} />
          <StatBadge label="Heavy Courses" value={result.stats.heavyCourses} />
          <StatBadge label="Early Classes" value={result.stats.earlyClasses} />
          <StatBadge label="Lab Courses" value={result.stats.labCourses} />
        </div>
      </SectionCard>

      <SectionCard hover className="workload-section-card">
        <p className="page-label workload-stats-eyebrow">Insights</p>
        <p className="workload-section-title workload-section-title--tight">Why this score</p>
        <p className="workload-section-text workload-section-text--readable">{result.explanation}</p>
        <div className="workload-tags-row workload-tags-row--insights">
          {result.reasonTags.length > 0 ? (
            result.reasonTags.map((tag) => <WorkloadReasonTag key={tag} text={tag} emphasis />)
          ) : (
            <WorkloadReasonTag text="General Course Load" emphasis />
          )}
        </div>
      </SectionCard>

      <SectionCard hover className="workload-section-card">
        <p className="page-label workload-stats-eyebrow">Next steps</p>
        <p className="workload-section-title workload-section-title--tight">Recommendations</p>
        <RecommendationPanel recommendations={result.recommendations} />
      </SectionCard>

      <section className="workload-course-section" aria-labelledby="workload-course-heading">
        <div className="workload-course-section__head">
          <p className="page-label workload-stats-eyebrow">Breakdown</p>
          <h2 id="workload-course-heading" className="workload-section-title workload-section-title--tight">
            Per-course workload
          </h2>
          <p className="workload-section-lead workload-section-lead--muted">
            Difficulty scores and drivers for each class in this plan.
          </p>
        </div>
        <div className="workload-course-list">
          {result.analyzedCourses.map((course) => (
            <CourseDifficultyCard key={`${course.courseCode}-${course.sectionCode}`} course={course} />
          ))}
        </div>
      </section>
    </div>
  );
}
