import { jsPDF } from 'jspdf';
import {
  DEFAULT_LOGO_SJU_ASPECT_RATIO,
  DEFAULT_LOGO_SJU_DATA_URL,
} from '../assets/logoSjuDataUrl';
import {
  DEFAULT_LOGO_SM_ASPECT_RATIO,
  DEFAULT_LOGO_SM_DATA_URL,
} from '../assets/logoSmDataUrl';
import {
  A4_HEIGHT_MM,
  A4_PX_WIDTH,
  A4_WIDTH_MM,
  getBottomRowHeightPx,
  getKelompokColor,
  getResiBottomRows,
  paginateResiList,
  RESI_PER_PAGE,
} from '../constants';
import { ResiItem, SenderHeader, SenderPresetId } from '../types';

export function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
}

function getFilePrefix(presetId: SenderPresetId): string {
  return presetId === 'sju' ? 'resi-sju-A4' : 'resi-suara-muhammadiyah-A4';
}

// Convert CSS pixels (96 DPI A4 = 794px) to mm and points
const PX_TO_MM = A4_WIDTH_MM / A4_PX_WIDTH; // ~0.26448 mm/px
const PX_TO_PT = 0.75; // 1 CSS px = 0.75 pt
const PT_TO_MM = 25.4 / 72; // ~0.35278 mm/pt
const CAP_HEIGHT_RATIO = 0.64; // Calibri cap height ratio

interface CalibriFontPair {
  regular: string;
  bold: string;
}

let cachedCalibriFonts: CalibriFontPair | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function loadCalibriFonts(): Promise<CalibriFontPair | null> {
  if (cachedCalibriFonts) return cachedCalibriFonts;

  const injected = (globalThis as unknown as { __CALIBRI_FONTS?: CalibriFontPair })
    .__CALIBRI_FONTS;
  if (injected) {
    cachedCalibriFonts = injected;
    return injected;
  }

  if (typeof fetch !== 'function') return null;

  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('/fonts/Calibri.ttf'),
      fetch('/fonts/Calibri-Bold.ttf'),
    ]);
    if (!regRes.ok || !boldRes.ok) return null;

    const [regBuf, boldBuf] = await Promise.all([
      regRes.arrayBuffer(),
      boldRes.arrayBuffer(),
    ]);

    cachedCalibriFonts = {
      regular: arrayBufferToBase64(regBuf),
      bold: arrayBufferToBase64(boldBuf),
    };
    return cachedCalibriFonts;
  } catch {
    return null;
  }
}

interface ResolvedLogo {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  aspectRatio: number;
}

async function resolveLogoForPdf(sender: SenderHeader): Promise<ResolvedLogo> {
  if (!sender.logoDataUrl) {
    if (sender.presetId === 'sju') {
      return {
        dataUrl: DEFAULT_LOGO_SJU_DATA_URL,
        format: 'JPEG',
        aspectRatio: DEFAULT_LOGO_SJU_ASPECT_RATIO,
      };
    }
    return {
      dataUrl: DEFAULT_LOGO_SM_DATA_URL,
      format: 'PNG',
      aspectRatio: DEFAULT_LOGO_SM_ASPECT_RATIO,
    };
  }

  const customUrl = sender.logoDataUrl;
  return new Promise<ResolvedLogo>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : 2;

      if (customUrl.startsWith('data:image/png')) {
        resolve({ dataUrl: customUrl, format: 'PNG', aspectRatio: ratio });
        return;
      }
      if (
        customUrl.startsWith('data:image/jpeg') ||
        customUrl.startsWith('data:image/jpg')
      ) {
        resolve({ dataUrl: customUrl, format: 'JPEG', aspectRatio: ratio });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(img.naturalWidth || 300, 1);
      canvas.height = Math.max(img.naturalHeight || 150, 1);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        format: 'PNG',
        aspectRatio: ratio,
      });
    };
    img.onerror = () => reject(new Error('Failed to load custom logo'));
    img.src = customUrl;
  });
}

function getCodeFontPx(value: string, rowCount = 1): number {
  const len = value.trim().length;
  const scale = rowCount >= 3 ? 0.84 : rowCount === 2 ? 0.92 : 1;
  let base = 18;
  if (len <= 3) base = 40;
  else if (len <= 5) base = 32;
  else if (len <= 7) base = 24;
  return Math.round(base * scale);
}

function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (/^(no\.?\s*hp|hp|telp|wa)/i.test(trimmed)) {
    return trimmed;
  }
  return `No. HP: ${trimmed}`;
}

function sanitizePdfText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

function fitSingleLinePt(
  doc: jsPDF,
  fontName: string,
  text: string,
  fontStyle: 'bold' | 'normal',
  maxWidthMm: number,
  minPt: number,
  maxPt: number
): number {
  if (!text) return maxPt;
  doc.setFont(fontName, fontStyle);
  let low = minPt;
  let high = maxPt;
  let best = minPt;
  for (let iter = 0; iter < 16; iter += 1) {
    const mid = (low + high) / 2;
    doc.setFontSize(mid);
    if (doc.getTextWidth(text) <= maxWidthMm) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
    if (high - low < 0.25) break;
  }
  return Math.floor(best * 4) / 4;
}

function drawCenteredLines(
  doc: jsPDF,
  lines: string[],
  centerX: number,
  centerY: number,
  fontPt: number,
  lineHeightFactor: number
): void {
  if (lines.length === 0) return;
  const fontMm = fontPt * PT_TO_MM;
  const capMm = fontMm * CAP_HEIGHT_RATIO;
  const lineStepMm = fontMm * lineHeightFactor;
  const totalSpanMm = capMm + (lines.length - 1) * lineStepMm;
  const firstBaselineY = centerY - totalSpanMm / 2 + capMm;

  doc.setFontSize(fontPt);
  lines.forEach((line, idx) => {
    doc.text(line, centerX, firstBaselineY + idx * lineStepMm, { align: 'center' });
  });
}

function drawCutLine(doc: jsPDF, cardX: number, cardW: number, cutY: number): void {
  const overhangMm = 14 * PX_TO_MM;
  const tickLenMm = 10 * PX_TO_MM;
  const leftEdge = cardX - overhangMm;
  const rightEdge = cardX + cardW + overhangMm;

  doc.setDrawColor(100, 116, 139); // #64748B
  doc.setLineWidth(0.4);
  doc.line(leftEdge, cutY, leftEdge + tickLenMm, cutY);
  doc.line(rightEdge - tickLenMm, cutY, rightEdge, cutY);

  const sx = leftEdge + tickLenMm + 1.1;
  doc.circle(sx, cutY - 0.55, 0.42, 'S');
  doc.circle(sx, cutY + 0.55, 0.42, 'S');
  doc.line(sx + 0.38, cutY - 0.35, sx + 2.3, cutY + 0.55);
  doc.line(sx + 0.38, cutY + 0.35, sx + 2.3, cutY - 0.55);

  doc.setDrawColor(148, 163, 184); // #94A3B8
  doc.setLineDashPattern([1.6, 1.3], 0);
  doc.line(sx + 3.0, cutY, rightEdge - tickLenMm - 1.0, cutY);
  doc.setLineDashPattern([], 0);
}

function drawResiCardPdf(
  doc: jsPDF,
  fontName: string,
  item: ResiItem,
  sender: SenderHeader,
  logo: ResolvedLogo,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const bottomRows = getResiBottomRows(item);
  const rowCount = bottomRows.length;
  const rowHeightMm = getBottomRowHeightPx(rowCount) * PX_TO_MM;
  const bottomH = rowHeightMm * rowCount;
  const upperH = h - bottomH;
  const rightColW = 144 * PX_TO_MM; // ~38.10 mm
  const leftW = w - rightColW;
  const leftLabelW = 66 * PX_TO_MM; // ~17.46 mm

  // 1. Card White Background
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, 'F');

  // 2. Bottom Color-Coded Rows Background (1–3 stacked rows)
  const bottomY = y + upperH;
  bottomRows.forEach((row, idx) => {
    const colorCfg = getKelompokColor(row.colorId);
    const [r, g, b] = colorCfg.rgb;
    doc.setFillColor(r, g, b);
    doc.rect(x, bottomY + idx * rowHeightMm, w, rowHeightMm, 'F');
  });

  // 3. Measure & layout Kop Pengirim row height (so enlarged Kop fits cleanly)
  const kopCellX = x + leftLabelW;
  const kopCellW = leftW - leftLabelW;
  const kopPadX = 8 * PX_TO_MM;
  const kopPadY = 6 * PX_TO_MM;
  const logoMaxH = (sender.presetId === 'sju' ? 36 : 44) * PX_TO_MM;
  const logoMaxW = (sender.presetId === 'sju' ? 154 : 106) * PX_TO_MM;

  let logoW = logoMaxH * logo.aspectRatio;
  let logoH = logoMaxH;
  if (logoW > logoMaxW) {
    logoW = logoMaxW;
    logoH = logoMaxW / logo.aspectRatio;
  }

  const gapMm = 7 * PX_TO_MM;
  const dividerW = 0.4;
  const kopTextX = kopCellX + kopPadX + logoW + gapMm + dividerW + gapMm;
  const kopTextMaxW = kopCellX + kopCellW - kopPadX - kopTextX;

  const kopTitle = sanitizePdfText(sender.title.trim());
  const kopAddr = sanitizePdfText(sender.address.trim());
  const kopContact = sanitizePdfText(
    [
      sender.phone ? `Telp. ${sender.phone}` : '',
      sender.email ? `Email: ${sender.email}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
  );

  const titlePt = fitSingleLinePt(doc, fontName, kopTitle, 'bold', kopTextMaxW, 9.5, 19.5);
  const addrPt = fitSingleLinePt(doc, fontName, kopAddr, 'bold', kopTextMaxW, 8, 13.5);
  const contactPt = kopContact
    ? fitSingleLinePt(doc, fontName, kopContact, 'normal', kopTextMaxW, 7, 10.75)
    : 0;

  const titleLineH = titlePt * PT_TO_MM * 1.16;
  const addrLineH = addrPt * PT_TO_MM * 1.2;
  const contactLineH = contactPt ? contactPt * PT_TO_MM * 1.2 : 0;
  const kopTextBlockH =
    titlePt * PT_TO_MM * CAP_HEIGHT_RATIO +
    (addrPt ? titleLineH * 0.16 + addrLineH : 0) +
    (contactLineH ? contactLineH : 0);

  const kopRowH = Math.max(logoH + kopPadY * 2, kopTextBlockH + kopPadY * 2, 16.5);
  const kepadaRowH = upperH - kopRowH;

  // 4. Gray Label Backgrounds (#F3F4F6)
  doc.setFillColor(243, 244, 246);
  doc.rect(x, y, leftLabelW, upperH, 'F');
  const rightX = x + leftW;
  const rightHalfH = upperH / 2;
  const cornerHeaderH = 22 * PX_TO_MM;
  doc.rect(rightX, y, rightColW, cornerHeaderH, 'F');
  doc.rect(rightX, y + rightHalfH, rightColW, cornerHeaderH, 'F');

  // 5. Render Logo + Vertical Divider + Enlarged Kop Pengirim Text
  try {
    doc.addImage(
      logo.dataUrl,
      logo.format,
      kopCellX + kopPadX,
      y + (kopRowH - logoH) / 2,
      logoW,
      logoH,
      undefined,
      'FAST'
    );
  } catch {
    // Fallback gracefully if a custom image fails
  }

  const divX = kopCellX + kopPadX + logoW + gapMm;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);
  doc.line(divX, y + kopPadY, divX, y + kopRowH - kopPadY);

  const titleCapMm = titlePt * PT_TO_MM * CAP_HEIGHT_RATIO;
  const addrStepMm = addrPt * PT_TO_MM * 1.24;
  const contactStepMm = contactPt ? contactPt * PT_TO_MM * 1.24 : 0;
  const kopSpanMm = titleCapMm + addrStepMm + contactStepMm;
  const kopStartBaseY = y + (kopRowH - kopSpanMm) / 2 + titleCapMm;

  doc.setTextColor(0, 0, 0);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(titlePt);
  doc.text(kopTitle, kopTextX, kopStartBaseY);

  doc.setTextColor(17, 24, 39);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(addrPt);
  doc.text(kopAddr, kopTextX, kopStartBaseY + addrStepMm);

  if (kopContact && contactPt > 0) {
    doc.setTextColor(55, 65, 81);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(contactPt);
    doc.text(kopContact, kopTextX, kopStartBaseY + addrStepMm + contactStepMm);
  }

  // 6. Left Labels: DARI & KEPADA (Centered X & Y)
  doc.setTextColor(17, 24, 39);
  doc.setFont(fontName, 'bold');
  drawCenteredLines(doc, ['DARI'], x + leftLabelW / 2, y + kopRowH / 2, 12.5 * PX_TO_PT, 1.15);
  drawCenteredLines(
    doc,
    ['KEPADA'],
    x + leftLabelW / 2,
    y + kopRowH + kepadaRowH / 2,
    12.5 * PX_TO_PT,
    1.15
  );

  // 7. KEPADA Content (Auto-fit binary search matching ResiCardPrint)
  const kepadaText = sanitizePdfText(item.kepada);
  const noHpText = sanitizePdfText(item.noHp);
  const hasKepada = kepadaText.trim().length > 0;
  const hasNoHp = noHpText.trim().length > 0;

  if (hasKepada || hasNoHp) {
    const rawLines = kepadaText.split('\n');
    const firstLine = (rawLines[0] ?? '').trim();
    const restText = rawLines.slice(1).join('\n').trim();
    const phoneDisplay = hasNoHp ? formatPhoneDisplay(noHpText) : '';

    const kPadX = 12 * PX_TO_MM;
    const kPadY = 8 * PX_TO_MM;
    const kAvailW = kopCellW - kPadX * 2;
    const kAvailH = kepadaRowH - kPadY * 2 - 4 * PX_TO_MM;

    const layoutKepada = (basePx: number) => {
      const basePt = basePx * PX_TO_PT;
      const firstPt = Math.round(basePx * 1.14) * PX_TO_PT;
      const gapSmallMm = Math.max(2, Math.round(basePx * 0.14)) * PX_TO_MM;
      const gapPhoneMm = Math.max(3, Math.round(basePx * 0.2)) * PX_TO_MM;

      const firstStep = firstPt * PT_TO_MM * 1.2;
      const baseStep = basePt * PT_TO_MM * 1.22;

      let firstWrapped: string[] = [];
      if (hasKepada && firstLine) {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(firstPt);
        firstWrapped = doc.splitTextToSize(firstLine, kAvailW);
      }

      let restWrapped: string[] = [];
      if (hasKepada && restText) {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(basePt);
        restWrapped = doc.splitTextToSize(restText, kAvailW);
      }

      let phoneWrapped: string[] = [];
      if (phoneDisplay) {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(basePt);
        phoneWrapped = doc.splitTextToSize(phoneDisplay, kAvailW);
      }

      let totalH = 0;
      if (firstWrapped.length > 0) {
        totalH += firstWrapped.length * firstStep;
      }
      if (restWrapped.length > 0) {
        totalH += (firstWrapped.length > 0 ? gapSmallMm : 0) + restWrapped.length * baseStep;
      }
      if (phoneWrapped.length > 0) {
        totalH += (hasKepada ? gapPhoneMm : 0) + phoneWrapped.length * baseStep;
      }

      return {
        firstPt,
        basePt,
        firstStep,
        baseStep,
        gapSmallMm,
        gapPhoneMm,
        firstWrapped,
        restWrapped,
        phoneWrapped,
        totalH,
      };
    };

    let lowPx = 10;
    let highPx = 34;
    let bestPx = 10;
    while (lowPx <= highPx) {
      const midPx = Math.floor((lowPx + highPx) / 2);
      const fit = layoutKepada(midPx);
      if (fit.totalH <= kAvailH) {
        bestPx = midPx;
        lowPx = midPx + 1;
      } else {
        highPx = midPx - 1;
      }
    }

    const best = layoutKepada(bestPx);
    const kStartX = kopCellX + kPadX;
    let curY = y + kopRowH + (kepadaRowH - best.totalH) / 2;

    if (best.firstWrapped.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(best.firstPt);
      const capMm = best.firstPt * PT_TO_MM * CAP_HEIGHT_RATIO;
      best.firstWrapped.forEach((line, idx) => {
        doc.text(line, kStartX, curY + capMm + idx * best.firstStep);
      });
      curY += best.firstWrapped.length * best.firstStep;
    }

    if (best.restWrapped.length > 0) {
      if (best.firstWrapped.length > 0) curY += best.gapSmallMm;
      doc.setTextColor(17, 24, 39);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(best.basePt);
      const capMm = best.basePt * PT_TO_MM * CAP_HEIGHT_RATIO;
      best.restWrapped.forEach((line, idx) => {
        doc.text(line, kStartX, curY + capMm + idx * best.baseStep);
      });
      curY += best.restWrapped.length * best.baseStep;
    }

    if (best.phoneWrapped.length > 0) {
      if (hasKepada) curY += best.gapPhoneMm;
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(best.basePt);
      const capMm = best.basePt * PT_TO_MM * CAP_HEIGHT_RATIO;
      best.phoneWrapped.forEach((line, idx) => {
        doc.text(line, kStartX, curY + capMm + idx * best.baseStep);
      });
    }
  }

  // 8. Right Corner Headers: KOLI KE & DARI (Centered X & Y)
  const rightCenterX = rightX + rightColW / 2;
  doc.setTextColor(0, 0, 0);
  doc.setFont(fontName, 'bold');
  drawCenteredLines(doc, ['KOLI KE'], rightCenterX, y + cornerHeaderH / 2, 11 * PX_TO_PT, 1.15);
  drawCenteredLines(
    doc,
    ['DARI'],
    rightCenterX,
    y + rightHalfH + cornerHeaderH / 2,
    11 * PX_TO_PT,
    1.15
  );

  // 9. KOLI KE Value (Centered X & Y)
  const koliKeTrimmed = sanitizePdfText(item.koliKe.trim());
  if (koliKeTrimmed) {
    const valCenterY = y + cornerHeaderH + (rightHalfH - cornerHeaderH) / 2;
    const maxPt = getCodeFontPx(koliKeTrimmed, rowCount) * PX_TO_PT;
    const fittedPt = fitSingleLinePt(
      doc,
      fontName,
      koliKeTrimmed,
      'bold',
      rightColW - 4,
      10,
      maxPt
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'bold');
    drawCenteredLines(doc, [koliKeTrimmed], rightCenterX, valCenterY, fittedPt, 1.05);
  }

  // 10. DARI Value — automatically adds "KOLI" cleanly below number without overlap
  const dariTrimmed = sanitizePdfText(item.dari.trim());
  if (dariTrimmed) {
    const dariCenterY = y + rightHalfH + cornerHeaderH + (rightHalfH - cornerHeaderH) / 2;
    const koliMatch = dariTrimmed.match(/^(\d+)(?:\s*koli)?$/i);
    if (koliMatch) {
      const numStr = koliMatch[1];
      const maxNumPt = getCodeFontPx(numStr, rowCount) * PX_TO_PT;
      const numPt = fitSingleLinePt(doc, fontName, numStr, 'bold', rightColW - 4, 10, maxNumPt);
      const koliPt = (rowCount >= 3 ? 9.5 : 10.5) * PX_TO_PT;

      const numCapMm = numPt * PT_TO_MM * CAP_HEIGHT_RATIO;
      const koliCapMm = koliPt * PT_TO_MM * CAP_HEIGHT_RATIO;
      const stackGapMm = rowCount >= 3 ? 1.15 : 1.45;
      const totalStackMm = numCapMm + stackGapMm + koliCapMm;
      const stackTopY = dariCenterY - totalStackMm / 2;

      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(numPt);
      doc.text(numStr, rightCenterX, stackTopY + numCapMm, { align: 'center' });

      doc.setTextColor(31, 41, 55);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(koliPt);
      doc.text('KOLI', rightCenterX, stackTopY + numCapMm + stackGapMm + koliCapMm, {
        align: 'center',
      });
    } else {
      const maxPt = getCodeFontPx(dariTrimmed, rowCount) * PX_TO_PT;
      const fittedPt = fitSingleLinePt(
        doc,
        fontName,
        dariTrimmed,
        'bold',
        rightColW - 4,
        9,
        maxPt
      );
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'bold');
      drawCenteredLines(doc, [dariTrimmed], rightCenterX, dariCenterY, fittedPt, 1.05);
    }
  }

  // 11 & 12. Bottom 1–3 Color-Coded Rows (Pesanan + QTY)
  const barangMaxPx = rowCount >= 3 ? 16 : rowCount === 2 ? 19 : 25;
  const barangMinPx = rowCount >= 3 ? 9 : 10.5;
  const qtyLabelPx = rowCount >= 3 ? 8 : rowCount === 2 ? 8.5 : 9.5;
  const qtyMaxPx = rowCount >= 3 ? 14 : rowCount === 2 ? 17 : 23;
  const qtyMinPx = rowCount >= 3 ? 9 : 9;

  bottomRows.forEach((row, idx) => {
    const rowY = bottomY + idx * rowHeightMm;
    const rowCenterY = rowY + rowHeightMm / 2;

    const barangText = sanitizePdfText(row.namaBarang.trim()).toUpperCase();
    if (barangText) {
      const bPadX = (rowCount >= 3 ? 10 : 12) * PX_TO_MM;
      const bPadY = (rowCount >= 3 ? 2.5 : 4) * PX_TO_MM;
      const bAvailW = leftW - bPadX * 2;
      const bAvailH = rowHeightMm - bPadY * 2;

      doc.setFont(fontName, 'bold');
      let bestPt = barangMinPx * PX_TO_PT;
      let bestLines: string[] = [barangText];
      for (let px = barangMaxPx; px >= barangMinPx; px -= 0.5) {
        const pt = px * PX_TO_PT;
        doc.setFontSize(pt);
        const wrapped: string[] = doc.splitTextToSize(barangText, bAvailW);
        const fontMm = pt * PT_TO_MM;
        const blockH =
          fontMm * CAP_HEIGHT_RATIO + (wrapped.length - 1) * fontMm * 1.15;
        if (blockH <= bAvailH) {
          bestPt = pt;
          bestLines = wrapped;
          break;
        }
      }

      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'bold');
      drawCenteredLines(doc, bestLines, x + leftW / 2, rowCenterY, bestPt, 1.15);
    }

    const qtyText = sanitizePdfText(row.qty.trim());
    const qtyLabelPt = qtyLabelPx * PX_TO_PT;
    const qtyLabelCapMm = qtyLabelPt * PT_TO_MM * CAP_HEIGHT_RATIO;

    if (qtyText) {
      const qAvailW = rightColW - 16 * PX_TO_MM;
      const qtyValPt = fitSingleLinePt(
        doc,
        fontName,
        qtyText,
        'bold',
        qAvailW,
        qtyMinPx * PX_TO_PT,
        qtyMaxPx * PX_TO_PT
      );
      const qtyValCapMm = qtyValPt * PT_TO_MM * CAP_HEIGHT_RATIO;
      const qtyGapMm = rowCount >= 3 ? 0.85 : 1.15;
      const totalStackMm = qtyLabelCapMm + qtyGapMm + qtyValCapMm;
      const stackTopY = rowCenterY - totalStackMm / 2;

      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(qtyLabelPt);
      doc.text('QTY', rightCenterX, stackTopY + qtyLabelCapMm, { align: 'center' });

      doc.setFontSize(qtyValPt);
      doc.text(qtyText, rightCenterX, stackTopY + qtyLabelCapMm + qtyGapMm + qtyValCapMm, {
        align: 'center',
      });
    } else {
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'bold');
      drawCenteredLines(doc, ['QTY'], rightCenterX, rowCenterY, qtyLabelPt, 1.1);
    }
  });

  // 13. Crisp Vector Borders (drawn last so lines are clean over background fills)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1 * PX_TO_MM);
  doc.line(rightX, y + cornerHeaderH, rightX + rightColW, y + cornerHeaderH);
  doc.line(
    rightX,
    y + rightHalfH + cornerHeaderH,
    rightX + rightColW,
    y + rightHalfH + cornerHeaderH
  );

  doc.setLineWidth(1.5 * PX_TO_MM);
  doc.line(x + leftLabelW, y, x + leftLabelW, y + upperH);
  doc.line(x, y + kopRowH, x + leftW, y + kopRowH);
  doc.line(rightX, y + rightHalfH, rightX + rightColW, y + rightHalfH);
  for (let idx = 0; idx < rowCount; idx += 1) {
    const lineY = bottomY + idx * rowHeightMm;
    doc.line(x, lineY, x + w, lineY);
  }

  doc.setLineWidth(2 * PX_TO_MM);
  doc.line(rightX, y, rightX, y + h);
  doc.rect(x, y, w, h, 'S');
}

export async function downloadA4Pdf(
  resiList: ResiItem[],
  sender: SenderHeader,
  showCutLines: boolean
): Promise<string> {
  const pages = paginateResiList(resiList);
  const [logo, calibri] = await Promise.all([
    resolveLogoForPdf(sender),
    loadCalibriFonts(),
  ]);
  const filename = `${getFilePrefix(sender.presetId)}-${buildTimestamp()}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let fontName = 'helvetica';
  if (calibri) {
    try {
      pdf.addFileToVFS('Calibri.ttf', calibri.regular);
      pdf.addFont('Calibri.ttf', 'Calibri', 'normal');
      pdf.addFileToVFS('Calibri-Bold.ttf', calibri.bold);
      pdf.addFont('Calibri-Bold.ttf', 'Calibri', 'bold');
      fontName = 'Calibri';
    } catch {
      fontName = 'helvetica';
    }
  }

  const marginX = 28 * PX_TO_MM;
  const marginY = 22 * PX_TO_MM;
  const usableH = A4_HEIGHT_MM - marginY * 2;
  const slotH = usableH / RESI_PER_PAGE;
  const cardW = A4_WIDTH_MM - marginX * 2;

  pages.forEach((pageItems, pageIdx) => {
    if (pageIdx > 0) {
      pdf.addPage('a4', 'portrait');
    }

    for (let slotIdx = 0; slotIdx < RESI_PER_PAGE; slotIdx += 1) {
      const item = pageItems[slotIdx];
      if (!item) continue;

      const isLastSlot = slotIdx === RESI_PER_PAGE - 1;
      const padTop = slotIdx === 0 ? 0 : 6 * PX_TO_MM;
      const padBottom = isLastSlot ? 0 : 6 * PX_TO_MM;

      const slotY = marginY + slotIdx * slotH;
      const cardY = slotY + padTop;
      const cardH = slotH - padTop - padBottom;

      drawResiCardPdf(pdf, fontName, item, sender, logo, marginX, cardY, cardW, cardH);

      if (showCutLines && !isLastSlot) {
        drawCutLine(pdf, marginX, cardW, slotY + slotH);
      }
    }
  });

  pdf.save(filename);
  return filename;
}
