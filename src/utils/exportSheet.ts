import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { A3_HEIGHT_MM, A3_PX_HEIGHT, A3_PX_WIDTH, A3_WIDTH_MM } from '../constants';

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
}

async function renderSheetToDataUrl(element: HTMLElement): Promise<string> {
  // Ensure web fonts are loaded before rasterizing
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  return toPng(element, {
    width: A3_PX_WIDTH,
    height: A3_PX_HEIGHT,
    pixelRatio: 2.5, // ~240 DPI crisp print quality for A3 (2808 x 3968 px)
    backgroundColor: '#FFFFFF',
    cacheBust: true,
    skipFonts: true, // Resi uses crisp system print fonts (Arial/Helvetica); avoids CORS stylesheet issues offline/online
    style: {
      transform: 'none',
      transformOrigin: 'top left',
    },
  });
}

export async function downloadA3Png(element: HTMLElement): Promise<string> {
  const dataUrl = await renderSheetToDataUrl(element);
  const filename = `resi-suara-muhammadiyah-A3-${buildTimestamp()}.png`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return filename;
}

export async function downloadA3Pdf(element: HTMLElement): Promise<string> {
  const dataUrl = await renderSheetToDataUrl(element);
  const filename = `resi-suara-muhammadiyah-A3-${buildTimestamp()}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a3',
    compress: true,
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, A3_WIDTH_MM, A3_HEIGHT_MM, undefined, 'FAST');
  pdf.save(filename);

  return filename;
}
