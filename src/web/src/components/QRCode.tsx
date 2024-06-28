import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function rgb2hex(c: string) {
  return `#${
  c
    .match(/\d+/g)!
    .map(x => (+x).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function QRCodeRender(props: { content: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const styleDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!styleDivRef.current || !canvasRef.current) {
      return;
    }

    const style = getComputedStyle(styleDivRef.current);

    void QRCode.toCanvas(canvasRef.current, props.content, {
      margin: 0,
      width: props.size ?? 300,
      errorCorrectionLevel: 'low',
      color: {
        light: rgb2hex(style.backgroundColor),
        dark: rgb2hex(style.color),
      },
    });
  }, [canvasRef.current, styleDivRef.current, props.size, props.content]);

  return (
    <div className="flex items-center justify-center">
      <div className="bg-base-300" ref={styleDivRef}></div>
      <canvas ref={canvasRef} className="rounded-lg" />
    </div>
  );
}
