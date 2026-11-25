import React, { useState } from 'react';
import {
  DEFAULT_LOGO_SM_ASPECT_RATIO,
  DEFAULT_LOGO_SM_DATA_URL,
} from '../assets/logoSmDataUrl';

interface SuaraMuhammadiyahLogoProps {
  logoDataUrl?: string | null;
  height?: number;
}

export const SuaraMuhammadiyahLogo: React.FC<SuaraMuhammadiyahLogoProps> = ({
  logoDataUrl,
  height = 52,
}) => {
  const [customRatio, setCustomRatio] = useState<number | null>(null);

  const isDefault = !logoDataUrl;
  const ratio = isDefault ? DEFAULT_LOGO_SM_ASPECT_RATIO : customRatio;
  const computedWidth = ratio ? Math.min(Math.round(height * ratio), 220) : undefined;
  const computedHeight =
    ratio && Math.round(height * ratio) > 220
      ? Math.round(220 / ratio)
      : height;

  return (
    <img
      src={logoDataUrl || DEFAULT_LOGO_SM_DATA_URL}
      alt="Logo Suara Muhammadiyah"
      width={computedWidth}
      height={computedHeight}
      onLoad={(e) => {
        if (!isDefault) {
          const img = e.currentTarget;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setCustomRatio(img.naturalWidth / img.naturalHeight);
          }
        }
      }}
      style={{
        height: `${computedHeight}px`,
        width: computedWidth ? `${computedWidth}px` : 'auto',
        maxWidth: '220px',
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
};
