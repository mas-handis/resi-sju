import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { A3_HEIGHT_MM, A3_PX_HEIGHT, A3_PX_WIDTH, A3_WIDTH_MM } from '../constants';

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      }
      if (typeof img.decode === 'function') {
        await img.decode().catch(() => {});
      }
    })
  );
}

async function renderSheetToDataUrl(element: HTMLElement): Promise<string> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  await waitForImages(element);

  // Use html2canvas with scale: 2 (2246x3174px ≈ 7.1 MP) so mobile browsers
  // (especially iOS Safari) reliably draw embedded PNG logos without hitting canvas limits.
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FFFFFF',
    width: A3_PX_WIDTH,
    height: A3_PX_HEIGHT,
    windowWidth: A3_PX_WIDTH,
    windowHeight: A3_PX_HEIGHT,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    onclone: (clonedDoc) => {
      const clonedSheet = clonedDoc.querySelector('[data-export-sheet="true"]') as HTMLElement | null;
      if (clonedSheet && clonedSheet.parentElement) {
        clonedSheet.parentElement.style.left = '0px';
        clonedSheet.parentElement.style.top = '0px';
        clonedSheet.parentElement.style.position = 'static';
      }
    },
  });

  return canvas.toDataURL('image/png');
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
