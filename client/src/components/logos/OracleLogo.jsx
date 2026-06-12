export default function OracleLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#C74634"/>
      {/* Oracle "O" ellipse mark */}
      <ellipse cx="50" cy="50" rx="26" ry="26" stroke="white" strokeWidth="10" fill="none"/>
      <rect x="36" y="43" width="28" height="14" fill="#C74634"/>
    </svg>
  );
}
