type WorkloadReasonTagProps = {
  text: string;
  emphasis?: boolean;
};

export default function WorkloadReasonTag({ text, emphasis = false }: WorkloadReasonTagProps) {
  return (
    <span className={`workload-reason-tag${emphasis ? " workload-reason-tag--emphasis" : ""}`}>{text}</span>
  );
}
