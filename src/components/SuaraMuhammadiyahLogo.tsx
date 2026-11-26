import React, { useState } from 'react';
import {
  DEFAULT_LOGO_SM_ASPECT_RATIO,
  DEFAULT_LOGO_SM_DATA_URL,
} from '../assets/logoSmDataUrl';
import {
  DEFAULT_LOGO_SJU_ASPECT_RATIO,
  DEFAULT_LOGO_SJU_DATA_URL,
} from '../assets/logoSjuDataUrl';
import { SenderPresetId } from '../types';

interface SuaraMuhammadiyahLogoProps {
  presetId?: SenderPresetId;
  logoDataUrl?: string | null;
  height?: number;
  maxWidth?: number;
}

export const SuaraMuhammadiyahLogo: React.FC<SuaraMuhammadiyahLogoProps> = ({
  presetId = 'sm',
  logoDataUrl,
  height = 46,
  maxWidth,
}) => {
  const [customRatio, setCustomRatio] = useState<number | null>(null);

  const isCustom = Boolean(logoDataUrl);
  const src =
    logoDataUrl ||
    (presetId === 'sju' ? DEFAULT_LOGO_SJU_DATA_URL : DEFAULT_LOGO_SM_DATA_URL);

  const defaultMaxWidth = presetId === 'sju' ? 195 : 155;
  const effectiveMaxWidth = maxWidth ?? defaultMaxWidth;

  const ratio = isCustom
    ? customRatio
    : presetId === 'sju'
    ? DEFAULT_LOGO_SJU_ASPECT_RATIO
    : DEFAULT_LOGO_SM_ASPECT_RATIO;

  const computedWidth = ratio
    ? Math.min(Math.round(height * ratio), effectiveMaxWidth)
    : undefined;
  const computedHeight =
    ratio && Math.round(height * ratio) > effectiveMaxWidth
      ? Math.round(effectiveMaxWidth / ratio)
      : height;

  return (
    <img
      src={src}
      alt={presetId === 'sju' ? 'Logo Penerbit Surya Jaya Utomo' : 'Logo Suara Muhammadiyah'}
      width={computedWidth}
      height={computedHeight}
      onLoad={(e) => {
        if (isCustom) {
          const img = e.currentTarget;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setCustomRatio(img.naturalWidth / img.naturalHeight);
          }
        }
      }}
      style={{
        height: `${computedHeight}px`,
        width: computedWidth ? `${computedWidth}px` : 'auto',
        maxWidth: `${effectiveMaxWidth}px`,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
};
