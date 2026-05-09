import InfoBadge from "@/components/ui/InfoBadge";
import type { AnalyzedCourse } from "@/frontend/lib/workloadScorer";
import WorkloadReasonTag from "./WorkloadReasonTag";

type CourseDifficultyCardProps = {
  course: AnalyzedCourse;
};

function variantForScore(score: number): "info" | "urgent" | "unread" | "read" {
  if (score >= 8.5) return "urgent";
  if (score >= 6.5) return "unread";
  if (score >= 4.0) return "read";
  return "info";
}

export default function CourseDifficultyCard({ course }: CourseDifficultyCardProps) {
  return (
    <article className="workload-course-card" aria-label={`${course.courseCode} workload`}>
      <div className="workload-course-top">
        <div className="workload-course-info">
          <p className="workload-course-code">{course.courseCode}</p>
          <h3 className="workload-course-name">{course.courseTitle}</h3>
          <dl className="workload-course-schedule">
            <div className="workload-course-schedule__row">
              <dt>Section</dt>
              <dd>{course.sectionCode}</dd>
            </div>
            <div className="workload-course-schedule__row">
              <dt>Days</dt>
              <dd>{course.meetingDays}</dd>
            </div>
            <div className="workload-course-schedule__row workload-course-schedule__row--wide">
              <dt>Time</dt>
              <dd>
                {course.startTime} – {course.endTime}
              </dd>
            </div>
          </dl>
        </div>
        <div className="workload-course-score-col">
          <span className="workload-course-score-label">Difficulty</span>
          <InfoBadge variant={variantForScore(course.score)}>{course.score.toFixed(1)} / 10</InfoBadge>
        </div>
      </div>

      <div className="workload-course-reasons">
        <span className="workload-course-reasons__label">Drivers</span>
        <div className="workload-tags-row workload-tags-row--compact">
          {course.reasons.length > 0 ? (
            course.reasons.slice(0, 4).map((reason) => <WorkloadReasonTag key={`${course.courseCode}-${reason}`} text={reason} />)
          ) : (
            <WorkloadReasonTag text="Standard Course Load" />
          )}
        </div>
      </div>
    </article>
  );
}
