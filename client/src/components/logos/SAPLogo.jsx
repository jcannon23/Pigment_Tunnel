export default function SAPLogo({ size = 28 }) {
  const h = Math.round(size * 0.56);
  return (
    <svg width={size} height={h} viewBox="0 0 180 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="180" height="100" rx="6" fill="#0070F2"/>
      {/* S */}
      <path d="M18 28 C18 28 18 22 30 22 C42 22 42 32 30 36 C18 40 18 50 18 50 C18 50 18 58 30 58 C42 58 42 52 42 52"
        stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* A */}
      <path d="M54 58 L66 22 L78 58 M57 46 L75 46" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* P */}
      <path d="M90 58 L90 22 L108 22 C118 22 118 40 108 40 L90 40"
        stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
