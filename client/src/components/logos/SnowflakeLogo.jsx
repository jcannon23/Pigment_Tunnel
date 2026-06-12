export default function SnowflakeLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#29B5E8"/>
      {/* Vertical bar */}
      <rect x="46" y="14" width="8" height="72" rx="4" fill="white"/>
      {/* Horizontal bar */}
      <rect x="14" y="46" width="72" height="8" rx="4" fill="white"/>
      {/* Diagonal TL-BR */}
      <rect x="46" y="46" width="8" height="52" rx="4" fill="white"
        transform="rotate(45 50 50)"/>
      {/* Diagonal TR-BL */}
      <rect x="46" y="46" width="8" height="52" rx="4" fill="white"
        transform="rotate(-45 50 50)"/>
      {/* Arrow tips — top */}
      <path d="M50 14 L44 24 M50 14 L56 24" stroke="white" strokeWidth="5" strokeLinecap="round"/>
      {/* Arrow tips — bottom */}
      <path d="M50 86 L44 76 M50 86 L56 76" stroke="white" strokeWidth="5" strokeLinecap="round"/>
      {/* Arrow tips — left */}
      <path d="M14 50 L24 44 M14 50 L24 56" stroke="white" strokeWidth="5" strokeLinecap="round"/>
      {/* Arrow tips — right */}
      <path d="M86 50 L76 44 M86 50 L76 56" stroke="white" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  );
}
