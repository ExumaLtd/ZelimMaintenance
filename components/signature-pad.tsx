import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { PenLine, Trash2 } from 'lucide-react';

/**
 * SignaturePad Component
 *
 * A canvas-based signature field matching the form design system.
 *
 * @param {function} onChange(dataURL | null) - Called after each stroke ends, or null when cleared
 * @param {boolean}  hasError - Shows red border when true
 * @param {object}   ref     - Exposes { clear(), isEmpty(), toDataURL() }
 */
interface SignaturePadProps {
  onChange?: (dataURL: string | null) => void;
  hasError?: boolean;
}

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string | null;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad({ onChange, hasError }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // --- Resize handler: preserves drawn content across container width changes ---
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const pad = padRef.current;
    if (!canvas || !pad) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const savedData = pad.toData();

    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);

    pad.clear();
    if (savedData && savedData.length > 0) {
      pad.fromData(savedData);
    }
  }, []);

  // --- Initialise signature_pad (dynamic import to avoid SSR issues) ---
  useEffect(() => {
    let pad: any;
    let resizeObserver: ResizeObserver | undefined;

    import('signature_pad').then(({ default: SignaturePadLib }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Initial size before signature_pad attaches
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);

      pad = new SignaturePadLib(canvas, {
        backgroundColor: 'rgba(0,0,0,0)',
        penColor: '#F7F7F7',
        minWidth: 1.2,
        maxWidth: 2.8,
        velocityFilterWeight: 0.7,
      });

      padRef.current = pad;
      setIsReady(true);

      pad.addEventListener('beginStroke', () => {
        setIsEmpty(false);
      });

      pad.addEventListener('endStroke', () => {
        const data = pad.toData();
        // Only auto-clear a single accidental tap (< 8 points). Never clear mid-signature.
        if (data.length === 1 && data[0].points.length < 8) {
          pad.clear();
          setIsEmpty(true);
          if (onChange) onChange(null);
          return;
        }
        if (onChange) onChange(pad.toDataURL('image/png'));
      });

      // Watch for container resize
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }
    });

    return () => {
      resizeObserver?.disconnect();
      pad?.off();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Clear ---
  const handleClear = useCallback(() => {
    if (!padRef.current) return;
    padRef.current.clear();
    setIsEmpty(true);
    if (onChange) onChange(null);
  }, [onChange]);

  // --- Expose imperative API ---
  useImperativeHandle(ref, () => ({
    clear: handleClear,
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    toDataURL: (type = 'image/png') => padRef.current?.toDataURL(type) ?? null,
  }), [handleClear]);

  return (
    <div ref={wrapperRef} className={`signature-pad-wrapper${hasError ? ' has-error' : ''}`}>
      {/* Canvas area */}
      <div className="signature-canvas-area">
        <canvas ref={canvasRef} className="signature-canvas" />

        {/* Placeholder, hidden once user has drawn */}
        {isEmpty && isReady && (
          <div className="signature-placeholder" aria-hidden="true">
            <PenLine size={22} strokeWidth={1.5} />
            <span>Please sign here</span>
          </div>
        )}

        {/* Clear button, top-right corner, only shown when not empty */}
        {!isEmpty && (
          <button
            type="button"
            className="signature-clear-btn"
            onClick={handleClear}
            title="Clear signature"
          >
            <Trash2 size={14} strokeWidth={2} />
            <span>Clear</span>
          </button>
        )}
      </div>

      <style jsx>{`
        .signature-pad-wrapper {
          width: 100%;
          border: 1px solid transparent;
          border-radius: 8px;
          background-color: #27454b;
          transition: border-color 0.2s;
          overflow: hidden;
        }

        .signature-pad-wrapper:focus-within {
          border-color: #00FFF6;
        }

        .signature-pad-wrapper.has-error {
          border-color: rgb(255, 77, 77) !important;
        }

        .signature-canvas-area {
          position: relative;
          width: 100%;
          height: 158px;
        }

        @media (min-width: 992px) {
          .signature-canvas-area {
            height: 168px;
          }
        }

        .signature-canvas {
          display: block;
          width: 100%;
          height: 100%;
          touch-action: none;
          cursor: crosshair;
        }

        /* Placeholder */
        .signature-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          pointer-events: none;
          color: #7d8f93;
          font-size: 14px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 400;
          user-select: none;
        }

        .signature-placeholder svg {
          color: #7d8f93;
          stroke: #7d8f93;
          opacity: 0.7;
        }

        /* Clear button */
        .signature-clear-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: rgba(21, 42, 49, 0.8);
          border: 1px solid rgba(21, 42, 49, 0.8);
          border-radius: 6px;
          color: #a0acaf;
          font-size: 12px;
          font-weight: 400;
          font-family: 'Montserrat', sans-serif;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }

        .signature-clear-btn:hover {
          background: rgba(21, 42, 49, 0.95);
          color: #F7F7F7;
        }

        .signature-clear-btn svg {
          display: block;
          stroke: currentColor;
        }
      `}</style>
    </div>
  );
});

export default SignaturePad;
