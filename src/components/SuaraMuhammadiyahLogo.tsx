import React from 'react';
import defaultLogoSm from '../assets/logo-sm.png';

interface SuaraMuhammadiyahLogoProps {
  logoDataUrl?: string | null;
  height?: number;
}

export const SuaraMuhammadiyahLogo: React.FC<SuaraMuhammadiyahLogoProps> = ({
  logoDataUrl,
  height = 52,
}) => {
  return (
    <img
      src={logoDataUrl || defaultLogoSm}
      alt="Logo Suara Muhammadiyah"
      style={{
        height: `${height}px`,
        width: 'auto',
        maxWidth: '220px',
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
};
