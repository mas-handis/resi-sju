import React from 'react';
import { A3_PX_HEIGHT, A3_PX_WIDTH } from '../constants';
import { GridCapacity, ResiItem, SenderHeader } from '../types';
import { ResiCardPrint } from './ResiCardPrint';

interface A3SheetProps {
  items: ResiItem[];
  sender: SenderHeader;
  gridCapacity: GridCapacity;
  showCutLines: boolean;
  isExport?: boolean;
  activeResiId?: string | null;
  onSelectSlot?: (id: string) => void;
}

export const A3Sheet = React.forwardRef<HTMLDivElement, A3SheetProps>(
  (
    {
      items,
      sender,
      gridCapacity,
      showCutLines,
      isExport = false,
      activeResiId,
      onSelectSlot,
    },
    ref
  ) => {
    // 10mm left/right margins ≈ 38px; ~7.5mm top/bottom margins ≈ 28px
    const horizontalMarginPx = 38;
    const verticalMarginPx = 28;
    const usableHeightPx = A3_PX_HEIGHT - verticalMarginPx * 2;
    const slotHeightPx = usableHeightPx / gridCapacity;

    const slots = Array.from({ length: gridCapacity }, (_, index) => items[index] ?? null);

    return (
      <div
        ref={ref}
        style={{
          width: `${A3_PX_WIDTH}px`,
          height: `${A3_PX_HEIGHT}px`,
          backgroundColor: '#FFFFFF',
          padding: `${verticalMarginPx}px ${horizontalMarginPx}px`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {slots.map((item, index) => {
          const isLastSlot = index === gridCapacity - 1;
          const isSelected = !isExport && item && activeResiId === item.id;
          // In export mode, only show cut line after a filled resi (if not the very last slot)
          const renderCutLine =
            showCutLines &&
            !isLastSlot &&
            (!isExport || item !== null);

          return (
            <div
              key={item ? item.id : `empty-slot-${index}`}
              style={{
                height: `${slotHeightPx}px`,
                width: '100%',
                position: 'relative',
                boxSizing: 'border-box',
                paddingTop: index === 0 ? '0px' : '9px',
                paddingBottom: isLastSlot ? '0px' : '9px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {item ? (
                <div
                  onClick={() => {
                    if (!isExport && onSelectSlot) {
                      onSelectSlot(item.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    cursor: !isExport && onSelectSlot ? 'pointer' : 'default',
                    outline: isSelected ? '3px solid #2563EB' : 'none',
                    outlineOffset: '3px',
                    borderRadius: isSelected ? '2px' : '0px',
                    transition: 'outline 0.15s ease',
                  }}
                >
                  <ResiCardPrint
                    item={item}
                    sender={sender}
                    gridCapacity={gridCapacity}
                    isExport={isExport}
                  />
                </div>
              ) : !isExport ? (
                <div
                  style={{
                    flex: 1,
                    border: '1.5px dashed #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                    fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                  }}
                >
                  Slot Resi #{index + 1} (Kosong — tidak tercetak)
                </div>
              ) : (
                <div style={{ flex: 1 }} />
              )}

              {/* Dashed Cut Line with subtle edge crop ticks */}
              {renderCutLine && (
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
                  {/* Left crop tick */}
                  <span
                    style={{
                      width: '10px',
                      height: '1.5px',
                      backgroundColor: '#64748B',
                      flexShrink: 0,
                    }}
                  />
                  {/* Scissor indicator */}
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
                  {/* Main dashed line */}
                  <span
                    style={{
                      flex: 1,
                      borderTop: '1.5px dashed #94A3B8',
                    }}
                  />
                  {/* Right crop tick */}
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
          );
        })}
      </div>
    );
  }
);

A3Sheet.displayName = 'A3Sheet';
