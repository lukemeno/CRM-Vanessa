import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { OfferPdfModel } from "@/domain/offer";
import { OfferDocument } from "@/pdf/offer-document";
import { registerOfferFonts } from "@/pdf/fonts";

export async function renderOfferPdf(model: OfferPdfModel): Promise<Buffer> {
  registerOfferFonts();
  const document = createElement(OfferDocument, {
    model,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(document);
  return Buffer.from(buffer);
}
