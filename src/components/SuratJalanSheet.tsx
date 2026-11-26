import React from 'react';
import { A4_PX_HEIGHT, A4_PX_WIDTH } from '../constants';
import { SenderHeader, SuratJalanData } from '../types';
import { SuratJalanCardPrint } from './SuratJalanCardPrint';

interface SuratJalanSheetProps {
  data: SuratJalanData;
  sender: SenderHeader;
  showCutLines: boolean;
}

export const SuratJalanSheet: React.FC<SuratJalanSheetProps> = ({
  data,
  sender,
  showCutLines,
}) => {
  const horizontalMarginPx = 28;
  const verticalMarginPx = 22;
  const usableHeightPx = A4_PX_HEIGHT - verticalMarginPx * 2;
  const halfHeightPx = usableHeightPx / 2;

  return (
    <div
      style={{
        width: `${A4_PX_WIDTH}px`,
        height: `${A4_PX_HEIGHT}px`,
        backgroundColor: '#FFFFFF',
        padding: `${verticalMarginPx}px ${horizontalMarginPx}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Half: Copy (Untuk Ditinggal) */}
      <div
        style={{
          height: `${halfHeightPx}px`,
          width: '100%',
          position: 'relative',
          boxSizing: 'border-box',
          paddingBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <SuratJalanCardPrint data={data} sender={sender} copyRole="copy" />
        </div>

        {/* Middle Cut Line */}
        {showCutLines && (
          <div
            style={{
              position: 'absolute',
              left: '-14px',
              right: '-14px',
              bottom: '-1px',
              height: '2px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '1.5px',
                backgroundColor: '#64748B',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '11px',
                lineHeight: 1,
                color: '#64748B',
                marginLeft: '3px',
                marginRight: '4px',
                userSelect: 'none',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              ✂
            </span>
            <span
              style={{
                flex: 1,
                borderTop: '1.5px dashed #94A3B8',
              }}
            />
            <span
              style={{
                width: '10px',
                height: '1.5px',
                backgroundColor: '#64748B',
                marginLeft: '4px',
                flexShrink: 0,
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom Half: Original (Untuk Dibawa / Dikembalikan) */}
      <div
        style={{
          height: `${halfHeightPx}px`,
          width: '100%',
          boxSizing: 'border-box',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <SuratJalanCardPrint data={data} sender={sender} copyRole="original" />
        </div>
      </div>
    </div>
  );
};
