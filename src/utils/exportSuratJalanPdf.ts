import { jsPDF } from 'jspdf';
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  formatIndonesianNumber,
  parseIndonesianNumber,
} from '../constants';
import { SenderHeader, SuratJalanData } from '../types';
import {
  buildTimestamp,
  CAP_HEIGHT_RATIO,
  drawCenteredLines,
  drawCutLine,
  loadCalibriFonts,
  PT_TO_MM,
  PX_TO_MM,
  ResolvedLogo,
  resolveLogoForPdf,
  sanitizePdfText,
} from './exportSheet';

function drawSuratJalanCopyPdf(
  doc: jsPDF,
  fontName: string,
  data: SuratJalanData,
  sender: SenderHeader,
  logo: ResolvedLogo,
  copyRole: 'copy' | 'original',
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const isSju = sender.presetId === 'sju';
  const accentRgb: [number, number, number] = isSju ? [255, 235, 0] : [251, 191, 36];

  const copyLabel =
    copyRole === 'copy'
      ? 'UNTUK DITINGGAL ( COPY )'
      : isSju
      ? 'UNTUK DIBAWA KEMBALI ( ASLI )'
      : 'UNTUK DIBAWA ( ASLI )';

  const padX = 1;
  const innerX = x + padX;
  const innerW = w - padX * 2;
  let curY = y + 1;

  // 1. Header Section
  if (isSju) {
    const logoMaxH = 14.5;
    const logoMaxW = 28;
    let logoW = logoMaxH * logo.aspectRatio;
    let logoH = logoMaxH;
    if (logoW > logoMaxW) {
      logoW = logoMaxW;
      logoH = logoMaxW / logo.aspectRatio;
    }

    try {
      doc.addImage(logo.dataUrl, logo.format, innerX, curY, logoW, logoH, undefined, 'FAST');
    } catch {
      // ignore
    }

    const leftTextX = innerX + logoW + 2.8;
    const leftTextMaxW = innerW * 0.52 - logoW - 4;
    let ly = curY + 2.8;

    doc.setFont(fontName, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(sanitizePdfText(sender.title), leftTextX, ly);
    ly += 3.2;

    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(75, 85, 99);
    doc.text('PENERBIT & PERCETAKAN', leftTextX, ly);
    ly += 3.2;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(31, 41, 55);
    const addrLines: string[] = doc.splitTextToSize(sanitizePdfText(sender.address), leftTextMaxW);
    addrLines.forEach((line) => {
      doc.text(line, leftTextX, ly);
      ly += 2.7;
    });
    if (sender.email) {
      doc.text(sanitizePdfText(`Email: ${sender.email}`), leftTextX, ly);
      ly += 2.7;
    }
    if (sender.phone) {
      doc.text(sanitizePdfText(`Telp. ${sender.phone}`), leftTextX, ly);
      ly += 2.7;
    }

    // Right: KEPADA, ALAMAT, NO. TLP
    const rightX = innerX + innerW * 0.54;
    const labelW = 15.5;
    const valX = rightX + labelW + 2.5;
    const valW = innerX + innerW - valX;
    let ry = curY + 2.8;

    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    doc.setFont(fontName, 'bold');
    doc.text('KEPADA', rightX, ry);
    doc.text(':', rightX + labelW, ry);
    const kepadaWrapped: string[] = doc.splitTextToSize(sanitizePdfText(data.kepada || '-'), valW);
    kepadaWrapped.forEach((line) => {
      doc.text(line, valX, ry);
      ry += 3.4;
    });

    doc.text('ALAMAT', rightX, ry);
    doc.text(':', rightX + labelW, ry);
    doc.setFont(fontName, 'normal');
    const alamatWrapped: string[] = doc.splitTextToSize(sanitizePdfText(data.alamat || '-'), valW);
    alamatWrapped.slice(0, 4).forEach((line) => {
      doc.text(line, valX, ry);
      ry += 3.4;
    });

    doc.setFont(fontName, 'bold');
    doc.text('NO. TLP', rightX, ry);
    doc.text(':', rightX + labelW, ry);
    doc.text(sanitizePdfText(data.telepon || '-'), valX, ry);
    ry += 3.5;

    curY = Math.max(ly, ry, curY + logoH) + 2;

    // Centered SURAT JALAN Title + Nomor
    doc.setFont(fontName, 'bold');
    doc.setFontSize(16.5);
    doc.setTextColor(0, 0, 0);
    doc.text('SURAT JALAN', innerX + innerW / 2, curY + 3.5, { align: 'center' });
    curY += 7.2;

    doc.setFontSize(8.8);
    const subParts = [
      `No. ${data.nomor || '-'}`,
      data.tanggal ? `Tanggal: ${data.tanggal}` : '',
      data.pengirim ? `Pengirim: ${data.pengirim}` : '',
    ].filter(Boolean);
    doc.text(sanitizePdfText(subParts.join('   •   ')), innerX + innerW / 2, curY, {
      align: 'center',
    });
    curY += 3.5;
  } else {
    // SM Header
    const logoMaxH = 12.5;
    const logoMaxW = 29;
    let logoW = logoMaxH * logo.aspectRatio;
    let logoH = logoMaxH;
    if (logoW > logoMaxW) {
      logoW = logoMaxW;
      logoH = logoMaxW / logo.aspectRatio;
    }

    try {
      doc.addImage(logo.dataUrl, logo.format, innerX, curY, logoW, logoH, undefined, 'FAST');
    } catch {
      // ignore
    }

    const kopX = innerX + logoW + 2.8;
    let ly = curY + 2.8;
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(11);
    doc.text(sanitizePdfText(sender.title), kopX, ly);
    ly += 3.2;

    doc.setFontSize(7.5);
    doc.text(sanitizePdfText(sender.address), kopX, ly);
    ly += 2.9;

    if (sender.email) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(6.8);
      doc.text(sanitizePdfText(`Email: ${sender.email}`), kopX, ly);
      ly += 3.1;
    }

    if (sender.phone) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(8.5);
      doc.text(sanitizePdfText(`Telp. ${sender.phone}`), kopX, ly);
      ly += 2.6;
    }

    // Right: SURAT JALAN
    doc.setFont(fontName, 'bold');
    doc.setFontSize(18.5);
    doc.setTextColor(0, 0, 0);
    doc.text('SURAT JALAN', innerX + innerW - 2, curY + 8.5, { align: 'right' });

    curY = Math.max(ly, curY + logoH) + 2;

    // SM Metadata 2-Column Bordered Box
    const boxLeftW = innerW * 0.56;
    const labelWLeft = 15.5;
    const valXLeft = innerX + 2.5 + labelWLeft + 2;
    const valWLeft = innerX + boxLeftW - 2.5 - valXLeft;

    doc.setFontSize(8.2);
    const kepadaWrapped: string[] = doc.splitTextToSize(
      sanitizePdfText(data.kepada || '-'),
      valWLeft
    );
    const alamatWrapped: string[] = doc.splitTextToSize(
      sanitizePdfText(data.alamat || '-'),
      valWLeft
    );

    const lineStep = 3.4;
    const leftLinesCount = kepadaWrapped.length + Math.min(alamatWrapped.length, 4) + 1;
    const boxH = Math.max(leftLinesCount * lineStep + 4, 15.5);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(innerX, curY, innerW, boxH, 'S');
    doc.line(innerX + boxLeftW, curY, innerX + boxLeftW, curY + boxH);

    // Left Meta Content
    let my = curY + 4;
    doc.setFont(fontName, 'bold');
    doc.text('KEPADA', innerX + 2.5, my);
    doc.text(':', innerX + 2.5 + labelWLeft, my);
    kepadaWrapped.forEach((line) => {
      doc.text(line, valXLeft, my);
      my += lineStep;
    });

    doc.text('ALAMAT', innerX + 2.5, my);
    doc.text(':', innerX + 2.5 + labelWLeft, my);
    doc.setFont(fontName, 'normal');
    alamatWrapped.slice(0, 4).forEach((line) => {
      doc.text(line, valXLeft, my);
      my += lineStep;
    });

    doc.setFont(fontName, 'bold');
    doc.text('TELEPON', innerX + 2.5, my);
    doc.text(':', innerX + 2.5 + labelWLeft, my);
    doc.text(sanitizePdfText(data.telepon || '-'), valXLeft, my);

    // Right Meta Content (Nomor, Tanggal, Pengirim)
    const metaRightX = innerX + boxLeftW + 3;
    const labelWRight = 16;
    const valXRight = metaRightX + labelWRight + 2;
    let rmy = curY + (boxH - 2 * 4.2) / 2 + 1.2;

    doc.setFont(fontName, 'bold');
    doc.text('Nomor', metaRightX, rmy);
    doc.text(':', metaRightX + labelWRight, rmy);
    doc.text(sanitizePdfText(data.nomor || '-'), valXRight, rmy);
    rmy += 4.2;

    doc.text('Tanggal', metaRightX, rmy);
    doc.text(':', metaRightX + labelWRight, rmy);
    doc.setFont(fontName, 'normal');
    doc.text(sanitizePdfText(data.tanggal || '-'), valXRight, rmy);
    rmy += 4.2;

    doc.setFont(fontName, 'bold');
    doc.text('Pengirim', metaRightX, rmy);
    doc.text(':', metaRightX + labelWRight, rmy);
    doc.setFont(fontName, 'normal');
    doc.text(sanitizePdfText(data.pengirim || ''), valXRight, rmy);

    curY += boxH + 2.8;
  }

  // 2. Items Table
  const displayRows =
    data.rows.length >= 2
      ? data.rows
      : [
          ...data.rows,
          ...Array.from({ length: 2 - data.rows.length }, (_, idx) => ({
            id: `pad-${idx}`,
            namaBarang: '',
            qty: '',
            jumlahKoli: '',
            keterangan: '',
          })),
        ];

  const colWidths = [
    9.5, // NO.
    innerW * 0.37, // NAMA BARANG
    innerW * 0.13, // QTY
    innerW * 0.18, // JUMLAH KOLI
    0, // KETERANGAN (remainder)
  ];
  colWidths[4] = innerW - (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]);

  const colXs: number[] = [];
  let accX = innerX;
  colWidths.forEach((cw) => {
    colXs.push(accX);
    accX += cw;
  });

  const thH = 5.6;
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(innerX, curY, innerW, thH, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(innerX, curY, innerW, thH, 'S');
  for (let i = 1; i < colXs.length; i += 1) {
    doc.line(colXs[i], curY, colXs[i], curY + thH);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont(fontName, 'bold');
  const thHeaders = ['NO.', 'NAMA BARANG', 'QTY', 'JUMLAH KOLI', 'KETERANGAN'];
  thHeaders.forEach((title, idx) => {
    drawCenteredLines(doc, [title], colXs[idx] + colWidths[idx] / 2, curY + thH / 2, 7.8, 1.1);
  });
  curY += thH;

  const compactRows = displayRows.length >= 4;
  const rowFontPt = compactRows ? 7.4 : 8.2;
  const rowLineStep = rowFontPt * PT_TO_MM * 1.22;

  displayRows.forEach((row, idx) => {
    const barangWrapped: string[] = row.namaBarang.trim()
      ? doc.splitTextToSize(sanitizePdfText(row.namaBarang.trim()), colWidths[1] - 3)
      : [];
    const ketWrapped: string[] = row.keterangan.trim()
      ? doc.splitTextToSize(sanitizePdfText(row.keterangan.trim()), colWidths[4] - 3)
      : [];

    const maxLines = Math.max(1, barangWrapped.length, ketWrapped.length);
    const rowH = Math.max(compactRows ? 4.8 : 5.6, maxLines * rowLineStep + 2.2);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.28);
    doc.rect(innerX, curY, innerW, rowH, 'S');
    for (let c = 1; c < colXs.length; c += 1) {
      doc.line(colXs[c], curY, colXs[c], curY + rowH);
    }

    const rowMidY = curY + rowH / 2;
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'bold');
    drawCenteredLines(doc, [String(idx + 1)], colXs[0] + colWidths[0] / 2, rowMidY, rowFontPt, 1.1);

    if (barangWrapped.length > 0) {
      const capMm = rowFontPt * PT_TO_MM * CAP_HEIGHT_RATIO;
      const spanMm = capMm + (barangWrapped.length - 1) * rowLineStep;
      const firstBase = rowMidY - spanMm / 2 + capMm;
      doc.setFont(fontName, 'bold');
      doc.setFontSize(rowFontPt);
      barangWrapped.forEach((line, lIdx) => {
        doc.text(line, colXs[1] + 1.6, firstBase + lIdx * rowLineStep);
      });
    }

    if (row.qty.trim()) {
      doc.setFont(fontName, 'bold');
      drawCenteredLines(
        doc,
        [sanitizePdfText(row.qty.trim())],
        colXs[2] + colWidths[2] / 2,
        rowMidY,
        rowFontPt,
        1.1
      );
    }

    if (row.jumlahKoli.trim()) {
      doc.setFont(fontName, 'bold');
      drawCenteredLines(
        doc,
        [sanitizePdfText(row.jumlahKoli.trim())],
        colXs[3] + colWidths[3] / 2,
        rowMidY,
        rowFontPt,
        1.1
      );
    }

    if (ketWrapped.length > 0) {
      const capMm = rowFontPt * PT_TO_MM * CAP_HEIGHT_RATIO;
      const spanMm = capMm + (ketWrapped.length - 1) * rowLineStep;
      const firstBase = rowMidY - spanMm / 2 + capMm;
      doc.setFont(fontName, 'normal');
      doc.setFontSize(rowFontPt);
      ketWrapped.forEach((line, lIdx) => {
        doc.text(line, colXs[4] + 1.6, firstBase + lIdx * rowLineStep);
      });
    }

    curY += rowH;
  });

  // Total Footer Row
  const totalQty = data.rows.reduce((sum, r) => sum + parseIndonesianNumber(r.qty), 0);
  const totalKoli = data.rows.reduce((sum, r) => sum + parseIndonesianNumber(r.jumlahKoli), 0);
  const formattedQty = formatIndonesianNumber(totalQty);
  const formattedKoli = formatIndonesianNumber(totalKoli);
  const totalH = 5.6;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(innerX, curY, innerW, totalH, 'S');
  doc.line(colXs[2], curY, colXs[2], curY + totalH);
  doc.line(colXs[3], curY, colXs[3], curY + totalH);
  doc.line(colXs[4], curY, colXs[4], curY + totalH);

  const totalMidY = curY + totalH / 2;
  doc.setFont(fontName, 'bold');
  drawCenteredLines(
    doc,
    [isSju ? 'TOTAL' : 'TOTAL KOLI'],
    innerX + (colWidths[0] + colWidths[1]) / 2,
    totalMidY,
    8.2,
    1.1
  );
  if (formattedQty) {
    drawCenteredLines(doc, [formattedQty], colXs[2] + colWidths[2] / 2, totalMidY, 8.2, 1.1);
  }
  const koliFooterVal = data.beratPerKoli.trim() || formattedKoli;
  if (koliFooterVal) {
    drawCenteredLines(
      doc,
      [sanitizePdfText(koliFooterVal)],
      colXs[3] + colWidths[3] / 2,
      totalMidY,
      8.2,
      1.1
    );
  }
  const ketFooterVal =
    data.totalBerat.trim() ||
    (data.beratPerKoli.trim() && formattedKoli ? `${formattedKoli} KOLI` : '');
  if (ketFooterVal) {
    drawCenteredLines(
      doc,
      [sanitizePdfText(ketFooterVal)],
      colXs[4] + colWidths[4] / 2,
      totalMidY,
      8.2,
      1.1
    );
  }
  curY += totalH + 2.8;

  // Note line
  if (data.catatan.trim()) {
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.2);
    if (isSju) {
      doc.setTextColor(31, 41, 55);
    } else {
      doc.setTextColor(220, 38, 38);
    }
    const noteLines: string[] = doc.splitTextToSize(
      sanitizePdfText(`Note : ${data.catatan.trim()}`),
      innerW
    );
    noteLines.slice(0, 2).forEach((line) => {
      doc.text(line, innerX, curY);
      curY += 3;
    });
  }

  // 3. Bottom Signature Boxes anchored neatly near bottom of half-page
  const bottomLimitY = y + h - 1;
  const sigHeaderH = 5.4;
  const sigBodyH = 14.5;
  const sigTopY = bottomLimitY - 4.2 - (sigHeaderH + sigBodyH);

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  if (isSju) {
    const sigCols = ['BAGIAN GUDANG', 'ADMINISTRASI', 'PENGIRIM', 'PENERIMA'];
    const sigW = innerW / 4;
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.rect(innerX, sigTopY, innerW, sigHeaderH, 'F');
    doc.rect(innerX, sigTopY, innerW, sigHeaderH + sigBodyH, 'S');
    doc.line(innerX, sigTopY + sigHeaderH, innerX + innerW, sigTopY + sigHeaderH);

    sigCols.forEach((label, idx) => {
      const sx = innerX + idx * sigW;
      if (idx > 0) {
        doc.line(sx, sigTopY, sx, sigTopY + sigHeaderH + sigBodyH);
      }
      doc.setFont(fontName, 'bold');
      drawCenteredLines(doc, [label], sx + sigW / 2, sigTopY + sigHeaderH / 2, 7.6, 1.1);

      doc.setFont(fontName, 'normal');
      doc.setFontSize(7.6);
      doc.text('(........................)', sx + sigW / 2, sigTopY + sigHeaderH + sigBodyH - 1.8, {
        align: 'center',
      });
    });
  } else {
    // SM: Left box (PENERIMA 36%), gap, Right box (BAGIAN GUDANG | PENGIRIM 64%)
    const gapSig = 3.8;
    const leftSigW = (innerW - gapSig) * 0.36;
    const rightSigW = innerW - gapSig - leftSigW;
    const rightSigX = innerX + leftSigW + gapSig;
    const rightHalfW = rightSigW / 2;

    // Left signature box
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.rect(innerX, sigTopY, leftSigW, sigHeaderH, 'F');
    doc.rect(innerX, sigTopY, leftSigW, sigHeaderH + sigBodyH, 'S');
    doc.line(innerX, sigTopY + sigHeaderH, innerX + leftSigW, sigTopY + sigHeaderH);
    doc.setFont(fontName, 'bold');
    drawCenteredLines(doc, ['PENERIMA'], innerX + leftSigW / 2, sigTopY + sigHeaderH / 2, 7.6, 1.1);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.6);
    doc.text(
      '(............................)',
      innerX + leftSigW / 2,
      sigTopY + sigHeaderH + sigBodyH - 1.8,
      { align: 'center' }
    );

    // Right signature group
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.rect(rightSigX, sigTopY, rightSigW, sigHeaderH, 'F');
    doc.rect(rightSigX, sigTopY, rightSigW, sigHeaderH + sigBodyH, 'S');
    doc.line(rightSigX, sigTopY + sigHeaderH, rightSigX + rightSigW, sigTopY + sigHeaderH);
    doc.line(
      rightSigX + rightHalfW,
      sigTopY,
      rightSigX + rightHalfW,
      sigTopY + sigHeaderH + sigBodyH
    );

    doc.setFont(fontName, 'bold');
    drawCenteredLines(
      doc,
      ['BAGIAN GUDANG'],
      rightSigX + rightHalfW / 2,
      sigTopY + sigHeaderH / 2,
      7.6,
      1.1
    );
    drawCenteredLines(
      doc,
      ['PENGIRIM'],
      rightSigX + rightHalfW + rightHalfW / 2,
      sigTopY + sigHeaderH / 2,
      7.6,
      1.1
    );

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.6);
    doc.text(
      '(............................)',
      rightSigX + rightHalfW / 2,
      sigTopY + sigHeaderH + sigBodyH - 1.8,
      { align: 'center' }
    );
    doc.text(
      '(............................)',
      rightSigX + rightHalfW + rightHalfW / 2,
      sigTopY + sigHeaderH + sigBodyH - 1.8,
      { align: 'center' }
    );
  }

  // Footnote & Copy Role Indicator
  const footY = bottomLimitY - 0.5;
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  doc.text(sanitizePdfText(data.footnote), innerX, footY);

  if (data.showCopyLabels) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 38, 38);
    doc.text(copyLabel, innerX + innerW, footY, { align: 'right' });
  }
}

export async function downloadSuratJalanPdf(
  data: SuratJalanData,
  sender: SenderHeader,
  showCutLines: boolean
): Promise<string> {
  const [logo, calibri] = await Promise.all([
    resolveLogoForPdf(sender),
    loadCalibriFonts(),
  ]);

  const prefix = sender.presetId === 'sju' ? 'surat-jalan-sju-A4' : 'surat-jalan-sm-A4';
  const filename = `${prefix}-${buildTimestamp()}.pdf`;

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
  const halfH = usableH / 2;
  const cardW = A4_WIDTH_MM - marginX * 2;
  const padGap = 12 * PX_TO_MM;

  // Top half: COPY
  drawSuratJalanCopyPdf(
    pdf,
    fontName,
    data,
    sender,
    logo,
    'copy',
    marginX,
    marginY,
    cardW,
    halfH - padGap
  );

  // Middle cut line
  if (showCutLines) {
    drawCutLine(pdf, marginX, cardW, marginY + halfH);
  }

  // Bottom half: ASLI
  drawSuratJalanCopyPdf(
    pdf,
    fontName,
    data,
    sender,
    logo,
    'original',
    marginX,
    marginY + halfH + padGap,
    cardW,
    halfH - padGap
  );

  pdf.save(filename);
  return filename;
}
