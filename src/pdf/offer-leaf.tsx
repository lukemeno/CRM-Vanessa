import { readFileSync } from "node:fs";
import path from "node:path";
import { Image } from "@react-pdf/renderer";
import { OLIVE_LEAF_ASSET } from "@/domain/beleg";

let png: Buffer | undefined;

export function oliveLeafPng(): Buffer {
  png ??= readFileSync(path.resolve(OLIVE_LEAF_ASSET));
  return png;
}

/** Raster botanical olive sprig from public/brand/olive-leaf.png — not ellipses. */
export function OfferLeaf({
  width = 86,
  height = 110,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <Image src={{ data: oliveLeafPng(), format: "png" }} style={{ width, height }} />
  );
}
