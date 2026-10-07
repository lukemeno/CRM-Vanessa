export function OliveBranch({
  className,
  mirrored = false,
}: {
  className?: string;
  mirrored?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 220"
      fill="none"
      aria-hidden="true"
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M92 210C88 150 70 110 38 72"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M86 168C108 150 132 148 158 156"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M78 128C54 118 36 92 32 64"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <ellipse
        cx="28"
        cy="58"
        rx="16"
        ry="8"
        transform="rotate(-30 28 58)"
        fill="currentColor"
        opacity="0.55"
      />
      <ellipse
        cx="48"
        cy="86"
        rx="18"
        ry="8"
        transform="rotate(-18 48 86)"
        fill="currentColor"
        opacity="0.45"
      />
      <ellipse
        cx="64"
        cy="118"
        rx="16"
        ry="7"
        transform="rotate(-10 64 118)"
        fill="currentColor"
        opacity="0.4"
      />
      <ellipse
        cx="148"
        cy="150"
        rx="18"
        ry="8"
        transform="rotate(20 148 150)"
        fill="currentColor"
        opacity="0.45"
      />
      <ellipse
        cx="118"
        cy="146"
        rx="14"
        ry="7"
        transform="rotate(12 118 146)"
        fill="currentColor"
        opacity="0.35"
      />
      <ellipse
        cx="42"
        cy="148"
        rx="13"
        ry="6"
        transform="rotate(-40 42 148)"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
}
