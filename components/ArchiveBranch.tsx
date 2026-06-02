type ArchiveBranchProps = {
  className?: string;
  color?: string;
};

export default function ArchiveBranch({
  className = "",
  color = "#7c8f72",
}: ArchiveBranchProps) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute overflow-visible ${className}`}
      viewBox="0 0 100 42"
      preserveAspectRatio="none"
    >
      <path
        d="M0 21 C 42 21, 54 21, 70 8 S 92 4, 100 4"
        fill="none"
        stroke={color}
        strokeOpacity="0.8"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx="100"
        cy="4"
        fill="#090807"
        r="3.2"
        stroke={color}
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
