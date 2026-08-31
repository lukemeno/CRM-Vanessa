import { Ellipse, G, Path, Svg } from "@react-pdf/renderer";

export function OfferLeaf({
  color,
  width = 72,
  height = 88,
}: {
  color: string;
  width?: number;
  height?: number;
}) {
  return (
    <Svg viewBox="0 0 180 220" width={width} height={height}>
      <G>
        <Path
          d="M92 210C88 150 70 110 38 72"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M86 168C108 150 132 148 158 156"
          stroke={color}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M78 128C54 118 36 92 32 64"
          stroke={color}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
        <Ellipse
          cx="28"
          cy="58"
          rx="16"
          ry="8"
          fill={color}
          opacity={0.55}
          transform="rotate(-30 28 58)"
        />
        <Ellipse
          cx="48"
          cy="86"
          rx="18"
          ry="8"
          fill={color}
          opacity={0.45}
          transform="rotate(-18 48 86)"
        />
        <Ellipse
          cx="64"
          cy="118"
          rx="16"
          ry="7"
          fill={color}
          opacity={0.4}
          transform="rotate(-10 64 118)"
        />
        <Ellipse
          cx="148"
          cy="150"
          rx="18"
          ry="8"
          fill={color}
          opacity={0.45}
          transform="rotate(20 148 150)"
        />
        <Ellipse
          cx="118"
          cy="146"
          rx="14"
          ry="7"
          fill={color}
          opacity={0.35}
          transform="rotate(12 118 146)"
        />
      </G>
    </Svg>
  );
}
