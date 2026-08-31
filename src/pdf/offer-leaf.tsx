import { G, Path, Svg } from "@react-pdf/renderer";

/** Botanical olive sprig from public/brand/olive-leaf.svg — lanceolate leaves, not ellipses. */
export function OfferLeaf({
  color = "#5c6540",
  width = 78,
  height = 96,
}: {
  color?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Svg viewBox="0 0 180 220" width={width} height={height}>
      <G>
        <Path
          d="M98 208C94 168 88 128 72 92C60 64 46 42 34 24"
          stroke={color}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M86 168C108 156 128 150 154 154"
          stroke={color}
          strokeWidth={1.3}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M78 122C56 110 40 88 28 62"
          stroke={color}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M70 96C54 78 44 54 40 32"
          stroke={color}
          strokeWidth={1.1}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M34 24C22 10 18 4 28 2C38 0 44 10 40 22C37 30 34 24 34 24Z"
          fill={color}
        />
        <Path
          d="M40 46C24 28 18 20 30 16C44 11 52 24 46 40C43 48 40 46 40 46Z"
          fill={color}
          opacity={0.92}
        />
        <Path
          d="M48 72C30 54 22 44 36 38C52 31 62 46 54 64C51 72 48 72 48 72Z"
          fill={color}
          opacity={0.88}
        />
        <Path
          d="M58 102C38 84 28 72 44 64C62 55 74 72 64 92C61 100 58 102 58 102Z"
          fill={color}
          opacity={0.9}
        />
        <Path
          d="M70 132C50 114 40 102 56 94C74 85 86 102 76 122C73 130 70 132 70 132Z"
          fill={color}
          opacity={0.86}
        />
        <Path
          d="M154 154C168 142 176 136 166 130C154 123 142 134 148 148C151 156 154 154 154 154Z"
          fill={color}
          opacity={0.9}
        />
        <Path
          d="M132 150C148 136 156 128 144 122C130 115 118 128 124 144C127 152 132 150 132 150Z"
          fill={color}
          opacity={0.84}
        />
        <Path
          d="M112 156C126 144 134 136 122 130C108 123 98 136 104 150C107 156 112 156 112 156Z"
          fill={color}
          opacity={0.78}
        />
        <Path
          d="M82 176C66 160 56 148 70 140C86 131 98 148 88 166C85 174 82 176 82 176Z"
          fill={color}
          opacity={0.7}
        />
      </G>
    </Svg>
  );
}
