# ADR 002 — @react-pdf/renderer for German offers

Add `@react-pdf/renderer` to render the Eventakte offer as a downloadable PDF.

HTML print is not a file download. pdfkit would draw the same olive/serif/script layout by hand. React-PDF keeps the Beleg in components (EVENTS + by Vanessa, leaf, table, 19% MwSt) and `renderToBuffer` on the Node route `/anfragen/[id]/angebot`.

Fonts live under `public/brand/fonts/` (Cormorant Garamond, Great Vibes, OFL). Invoice numbers stay `RE-YYYY-NNN` and are out of this PR.
