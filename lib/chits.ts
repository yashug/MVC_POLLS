import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * The printable chit sheet for a manual (physical) draw.
 *
 * The whole point of a chit draw is that nobody can tell one folded chit from
 * another, so the geometry matters more than the styling:
 *
 *  - Every chit is the same rectangle, and the cut lines run the full width and
 *    height of the page. A guillotine can take one straight pass per line, which
 *    is what actually keeps the pieces identical — cutting rectangle by
 *    rectangle never does.
 *  - Nothing is drawn near a chit's edge. There is no border, because an inset
 *    frame turns a 1mm cutting drift into a visibly lopsided chit.
 *  - Every chit uses one type size, chosen from the longest name on the sheet,
 *    so a villa with three partners doesn't get smaller print than a villa on
 *    its own.
 *  - The name sits dead centre. Folded in half twice it ends up in the middle of
 *    four layers of paper, furthest from every edge and from the light.
 */

const MM = 72 / 25.4;
const A4 = { w: 210 * MM, h: 297 * MM };

const MARGIN = 12 * MM;
const COLS = 3;
const ROWS = 6;
export const CHITS_PER_SHEET = COLS * ROWS;

const CHIT_W = (A4.w - 2 * MARGIN) / COLS;
const CHIT_H = (A4.h - 2 * MARGIN) / ROWS;

/** Nothing is printed outside this, so a slightly crooked cut never clips a name. */
const NAME_ROOM = CHIT_W - 12 * MM;
const HEAD_TRACK = 1.4;

const INK = rgb(0, 0, 0);
const GREY = rgb(0.45, 0.45, 0.45);
const FAINT = rgb(0.72, 0.72, 0.72);

/** The 14 standard PDF fonts only speak WinAnsi, so Telugu titles are not an option here. */
const ascii = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‒-―]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type Fonts = { body: PDFFont; bold: PDFFont };

export type ChitEntrant = { entryId: number; label: string };

export type ChitSheetInput = {
  itemTitle: string;
  eventName: string;
  drawId: number;
  entrantHash: string;
  preparedAt: string;
  entrants: ChitEntrant[];
};

export async function buildChitSheetPdf(input: ChitSheetInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    body: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const itemTitle = ascii(input.itemTitle) || "Draw";
  const shortHash = input.entrantHash.slice(0, 8).toUpperCase();
  const chits = input.entrants.map((e, i) => ({
    n: i + 1,
    name: chitName(e.label),
  }));

  const sheets = Math.max(1, Math.ceil(chits.length / CHITS_PER_SHEET));
  const blanks = sheets * CHITS_PER_SHEET - chits.length;

  pdf.setTitle(`${itemTitle} — manual draw chits`);
  pdf.setSubject(`Draw ${input.drawId} · entrant list ${input.entrantHash}`);
  pdf.setCreator("MVC Polls");

  drawCoverSheets(pdf, fonts, { ...input, itemTitle, shortHash, chits, sheets, blanks });

  // The item name above already keeps two draws out of the same bowl. This is
  // here for the other mix-up: a draw cancelled and re-prepared gets a new
  // number, so a stale reprint doesn't quietly join the fresh chits.
  const stamp = `DRAW ${input.drawId}`;
  const nameSize = uniformNameSize(fonts.bold, chits.map((c) => c.name));

  const headRoom = CHIT_W - 10 * MM;
  const headSize = fitSize(fonts.body, itemTitle.toUpperCase(), headRoom, 7, 5, HEAD_TRACK);
  const head = ellipsize(fonts.body, itemTitle.toUpperCase(), headRoom, headSize, HEAD_TRACK);

  for (let s = 0; s < sheets; s++) {
    const page = pdf.addPage([A4.w, A4.h]);
    for (let cell = 0; cell < CHITS_PER_SHEET; cell++) {
      const chit = chits[s * CHITS_PER_SHEET + cell];
      const box = cellBox(cell);
      if (chit) drawChit(page, fonts, box, chit, { head, headSize, nameSize, stamp });
      else drawBlank(page, fonts, box);
    }
    drawCutLines(page);
  }

  return pdf.save();
}

/* ── Chits ─────────────────────────────────────────────────── */

const chitName = (label: string) =>
  `${label.includes("+") ? "VILLAS" : "VILLA"} ${ascii(label)}`;

/**
 * One size for the whole sheet, taken from the longest name. Shrinking only the
 * long ones would make those chits recognisable at a glance.
 */
function uniformNameSize(bold: PDFFont, names: string[]) {
  return names.reduce((size, name) => Math.min(size, fitSize(bold, name, NAME_ROOM, 19, 7)), 19);
}

const trackedWidth = (font: PDFFont, text: string, size: number, spacing: number) =>
  font.widthOfTextAtSize(text, size) + spacing * Math.max(0, text.length - 1);

function fitSize(
  font: PDFFont, text: string, maxWidth: number, start: number, min: number, spacing = 0,
) {
  let size = start;
  while (size > min && trackedWidth(font, text, size, spacing) > maxWidth) size -= 0.25;
  return size;
}

/** Last resort once the size floor is reached, so nothing ever bleeds into the chit next door. */
function ellipsize(
  font: PDFFont, text: string, maxWidth: number, size: number, spacing = 0,
) {
  if (trackedWidth(font, text, size, spacing) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && trackedWidth(font, `${cut}...`, size, spacing) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trim()}...`;
}

function cellBox(cell: number) {
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  const x = MARGIN + col * CHIT_W;
  const top = A4.h - MARGIN - row * CHIT_H;
  return { x, y: top - CHIT_H, cx: x + CHIT_W / 2, cy: top - CHIT_H / 2 };
}

type Box = ReturnType<typeof cellBox>;

function drawChit(
  page: PDFPage,
  fonts: Fonts,
  box: Box,
  chit: { n: number; name: string },
  style: { head: string; headSize: number; nameSize: number; stamp: string },
) {
  // Both small lines sit the same distance from the centre, so the printed area
  // is balanced however long the villa name turns out to be.
  centre(page, fonts.body, style.head, style.headSize, box.cx, box.cy + 11 * MM, GREY, HEAD_TRACK);
  const name = ellipsize(fonts.bold, chit.name, NAME_ROOM, style.nameSize);
  centre(page, fonts.bold, name, style.nameSize, box.cx, box.cy - style.nameSize * 0.35, INK);
  centre(page, fonts.body, `${style.stamp} - #${chit.n}`, 6, box.cx, box.cy - 11 * MM, GREY, 0.8);

  drawFoldTicks(page, box);
}

function drawBlank(page: PDFPage, fonts: Fonts, box: Box) {
  centre(page, fonts.body, "BLANK - CUT OFF AND THROW AWAY", 6.5, box.cx, box.cy - 2, FAINT, 0.8);
}

/** Halfway marks on all four edges, so every chit gets folded the same way. */
function drawFoldTicks(page: PDFPage, box: Box) {
  const t = 2 * MM;
  const seg = (x: number, y: number, dx: number, dy: number) =>
    page.drawLine({
      start: { x, y },
      end: { x: x + dx, y: y + dy },
      thickness: 0.4,
      color: FAINT,
    });
  seg(box.x, box.cy, t, 0);
  seg(box.x + CHIT_W - t, box.cy, t, 0);
  seg(box.cx, box.y, 0, t);
  seg(box.cx, box.y + CHIT_H - t, 0, t);
}

/**
 * Edge to edge, including the outside of the grid — the outer chits have to be
 * trimmed off the margin or they come out larger than the rest.
 */
function drawCutLines(page: PDFPage) {
  for (let c = 0; c <= COLS; c++) {
    const x = MARGIN + c * CHIT_W;
    page.drawLine({ start: { x, y: 0 }, end: { x, y: A4.h }, thickness: 0.5, color: FAINT });
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = MARGIN + r * CHIT_H;
    page.drawLine({ start: { x: 0, y }, end: { x: A4.w, y }, thickness: 0.5, color: FAINT });
  }
}

/* ── Cover ─────────────────────────────────────────────────── */

const STEPS = [
  "Print at 100% / Actual size. Any 'fit to page' setting makes the chits a different size.",
  "Cut along every grey line, straight across the page - all the way to the paper edge.",
  "Throw away the blanks, then count the chits against the list below before folding.",
  "Fold each chit in half, then in half again the other way. The name ends up in the middle of four layers.",
  "Press the folds flat, drop them all in the same bowl, and mix well in front of everyone.",
  "Unfold the drawn chit in front of the gathering, read out the villa, then record it in the app.",
];

function drawCoverSheets(
  pdf: PDFDocument,
  fonts: Fonts,
  info: ChitSheetInput & {
    itemTitle: string;
    shortHash: string;
    chits: { n: number; name: string }[];
    sheets: number;
    blanks: number;
  },
) {
  const M = 18 * MM;
  const page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - M;

  page.drawText("MANUAL DRAW - CHITS TO CUT", {
    x: M, y: y - 14, size: 15, font: fonts.bold, color: INK,
  });
  y -= 14 + 9;
  page.drawText(info.itemTitle, { x: M, y: y - 12, size: 12, font: fonts.body, color: INK });
  y -= 12 + 16;

  const meta = [
    `${ascii(info.eventName)}   ·   prepared ${ascii(info.preparedAt)}`,
    `${info.chits.length} chits   ·   ${info.sheets} sheet${info.sheets === 1 ? "" : "s"} of ${CHITS_PER_SHEET}   ·   ${info.blanks} blank${info.blanks === 1 ? "" : "s"} to throw away`,
    `Draw ${info.drawId}   ·   sealed entrant list ${info.entrantHash}`,
  ];
  for (const line of meta) {
    page.drawText(line, { x: M, y: y - 8, size: 8, font: fonts.body, color: GREY });
    y -= 8 + 5;
  }

  y -= 12;
  page.drawLine({
    start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.6, color: FAINT,
  });
  y -= 20;

  page.drawText("ON THE DAY", { x: M, y: y - 8, size: 8, font: fonts.bold, color: GREY });
  y -= 8 + 12;
  STEPS.forEach((step, i) => {
    page.drawText(`${i + 1}.`, { x: M, y: y - 9, size: 9, font: fonts.bold, color: INK });
    for (const line of wrap(fonts.body, step, 9, A4.w - 2 * M - 14 * MM)) {
      page.drawText(line, { x: M + 14, y: y - 9, size: 9, font: fonts.body, color: INK });
      y -= 13;
    }
    y -= 4;
  });

  y -= 8;
  page.drawLine({
    start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.6, color: FAINT,
  });
  y -= 20;

  page.drawText("EVERY CHIT, IN ORDER - TICK THEM OFF AFTER CUTTING", {
    x: M, y: y - 8, size: 8, font: fonts.bold, color: GREY,
  });
  y -= 8 + 14;

  drawChecklist(pdf, fonts, info.chits, page, y, M);
}

/** Three columns, balanced, spilling onto further sheets if the community turns out in force. */
function drawChecklist(
  pdf: PDFDocument,
  fonts: Fonts,
  chits: { n: number; name: string }[],
  firstPage: PDFPage,
  firstTop: number,
  M: number,
) {
  const LINE = 12;
  const COLW = (A4.w - 2 * M) / 3;
  const BOX = 6.5;

  let page = firstPage;
  let top = firstTop;
  let done = 0;

  while (done < chits.length) {
    const fits = Math.max(1, Math.floor((top - M) / LINE));
    // Short lists spread across all three columns rather than filling the first.
    const rows = Math.min(fits, Math.ceil((chits.length - done) / 3));
    const take = Math.min(chits.length - done, rows * 3);

    for (let s = 0; s < take; s++) {
      const chit = chits[done + s];
      const x = M + Math.floor(s / rows) * COLW;
      const y = top - ((s % rows) + 1) * LINE;

      page.drawRectangle({
        x, y: y + 1, width: BOX, height: BOX,
        borderWidth: 0.6, borderColor: FAINT,
      });
      page.drawText(`#${chit.n}`, {
        x: x + BOX + 6, y: y + 2, size: 8, font: fonts.body, color: GREY,
      });
      page.drawText(ellipsize(fonts.body, chit.name, COLW - BOX - 40, 8.5), {
        x: x + BOX + 30, y: y + 2, size: 8.5, font: fonts.body, color: INK,
      });
    }

    done += take;
    if (done < chits.length) {
      page = pdf.addPage([A4.w, A4.h]);
      top = A4.h - M;
    }
  }
}

/* ── Text helpers ──────────────────────────────────────────── */

function centre(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  cx: number,
  baseline: number,
  color = INK,
  spacing = 0,
) {
  const w = font.widthOfTextAtSize(text, size) + spacing * Math.max(0, text.length - 1);
  if (spacing === 0) {
    page.drawText(text, { x: cx - w / 2, y: baseline, size, font, color });
    return;
  }
  let x = cx - w / 2;
  for (const ch of text) {
    page.drawText(ch, { x, y: baseline, size, font, color });
    x += font.widthOfTextAtSize(ch, size) + spacing;
  }
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
