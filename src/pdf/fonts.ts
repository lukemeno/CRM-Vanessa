import path from "node:path";
import { Font } from "@react-pdf/renderer";

const fontsDir = path.join(process.cwd(), "public/brand/fonts");

let registered = false;

export function registerOfferFonts() {
  if (registered) {
    return;
  }
  Font.register({
    family: "Cormorant Garamond",
    fonts: [
      {
        src: path.join(fontsDir, "CormorantGaramond-Medium.ttf"),
        fontWeight: 500,
      },
      {
        src: path.join(fontsDir, "CormorantGaramond-SemiBold.ttf"),
        fontWeight: 600,
      },
    ],
  });
  Font.register({
    family: "Great Vibes",
    src: path.join(fontsDir, "GreatVibes-Regular.ttf"),
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
