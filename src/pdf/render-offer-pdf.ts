import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { BelegPdfModel } from "@/domain/beleg";
import { BelegDocument } from "@/pdf/offer-document";
import { registerOfferFonts } from "@/pdf/fonts";

export async function renderBelegPdf(model: BelegPdfModel): Promise<Buffer> {
  registerOfferFonts();
  const document = createElement(BelegDocument, {
    model,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(document);
  return Buffer.from(buffer);
}

export async function renderOfferPdf(model: BelegPdfModel): Promise<Buffer> {
  return renderBelegPdf(model);
}

export async function renderInvoicePdf(model: BelegPdfModel): Promise<Buffer> {
  return renderBelegPdf(model);
}
