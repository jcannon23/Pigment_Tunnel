export default function WorkdayLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#F98B1F"/>
      <path
        d="M22 34 L34 66 L44 44 L50 58 L56 44 L66 66 L78 34"
        stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </svg>
  );
}
