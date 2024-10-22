import parse from 'color-parse';
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';
import { oklch2rgb } from 'utils/oklch2rgb';

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function rgb2hex(c: string) {
  return `#${
  c
    .match(/\d+/g)!
    .map(x => (+x).toString(16).padStart(2, '0'))
    .join('')}`;
}

// function to handle cases when the computed style returns inconsistent colour spaces
function getHexColour(colour_str: string): string | null {
  const col = parse(colour_str);
  switch (col.space) {
    case "rgb":
      return rgb2hex(colour_str)
    case "oklch":
      return rgb2hex(oklch2rgb(col.values).map((v) => Math.round(v * 255)).toString())
    default:
      return null

  }
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
        light: getHexColour(style.backgroundColor) || "#ffffff",
        dark: getHexColour(style.color) || "#0000ff",
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

