import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { A4_HEIGHT_MM, A4_PX_HEIGHT, A4_PX_WIDTH, A4_WIDTH_MM } from '../constants';
import { SenderPresetId } from '../types';

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
}

function getFilePrefix(presetId: SenderPresetId): string {
  return presetId === 'sju' ? 'resi-sju-A4' : 'resi-suara-muhammadiyah-A4';
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

function getPageElements(container: HTMLElement): HTMLElement[] {
  const pages = Array.from(
    container.querySelectorAll<HTMLElement>('[data-export-sheet="true"]')
  );
  return pages.length > 0 ? pages : [container];
}

async function renderPageToDataUrl(pageElement: HTMLElement): Promise<string> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  await waitForImages(pageElement);

  const pageNumber = pageElement.getAttribute('data-page-number');

  // Use html2canvas with scale: 3 on A4 (2382x3369px ≈ 8.0 MP, ~288 DPI)
  // for crisp print quality while staying safely under mobile Safari canvas limits.
  const canvas = await html2canvas(pageElement, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FFFFFF',
    width: A4_PX_WIDTH,
    height: A4_PX_HEIGHT,
    windowWidth: A4_PX_WIDTH,
    windowHeight: A4_PX_HEIGHT,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    onclone: (clonedDoc) => {
      const clonedOffscreen = clonedDoc.querySelector('.offscreen-print-sheet') as HTMLElement | null;
      if (clonedOffscreen) {
        clonedOffscreen.style.left = '0px';
        clonedOffscreen.style.top = '0px';
        clonedOffscreen.style.position = 'static';
      }
      if (pageNumber) {
        const clonedPage = clonedDoc.querySelector(
          `[data-export-sheet="true"][data-page-number="${pageNumber}"]`
        ) as HTMLElement | null;
        if (clonedPage) {
          clonedPage.style.position = 'relative';
        }
      }
    },
  });

  return canvas.toDataURL('image/png');
}

function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadA4Png(
  container: HTMLElement,
  presetId: SenderPresetId
): Promise<string> {
  const pages = getPageElements(container);
  const stamp = buildTimestamp();
  const prefix = getFilePrefix(presetId);

  if (pages.length === 1) {
    const dataUrl = await renderPageToDataUrl(pages[0]);
    const filename = `${prefix}-${stamp}.png`;
    triggerDownload(dataUrl, filename);
    return filename;
  }

  for (let i = 0; i < pages.length; i += 1) {
    const dataUrl = await renderPageToDataUrl(pages[i]);
    const filename = `${prefix}-${stamp}-hal${i + 1}.png`;
    triggerDownload(dataUrl, filename);
  }

  return `${pages.length} file PNG (${prefix}-hal1..${pages.length})`;
}

export async function downloadA4Pdf(
  container: HTMLElement,
  presetId: SenderPresetId
): Promise<string> {
  const pages = getPageElements(container);
  const filename = `${getFilePrefix(presetId)}-${buildTimestamp()}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pages.length; i += 1) {
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }
    const dataUrl = await renderPageToDataUrl(pages[i]);
    pdf.addImage(dataUrl, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
  }

  pdf.save(filename);

  return filename;
}
