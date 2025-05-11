import React, { useEffect, useRef } from "react";

type Props = {
  getWaveform: () => Uint8Array | null;
  isVisualizing: boolean;
  size?: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const CircularWaveformVisualizer: React.FC<Props> = ({
  getWaveform,
  isVisualizing,
  size = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spikes = 80;
  const prevHeights = useRef<number[]>([]);

  useEffect(() => {
    prevHeights.current = Array(spikes).fill(0);
  }, [spikes, size]);

  useEffect(() => {
    if (!isVisualizing) return;
    let animationFrameId: number;

    const ratio = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = size * ratio;
      canvas.height = size * ratio;
    }

    const draw = () => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // make all coordinates based on logical (not physical) pixels
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(ratio, ratio);

      // Draw white circle background
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      const dataArray = getWaveform();
      if (dataArray) {
        const cx = size / 2;
        const cy = size / 2;
        const minR = size * 0.46;
        const maxR = size * 0.495;

        for (let i = 0; i < spikes; i++) {
          const segStart = Math.floor((i / spikes) * dataArray.length);
          const segEnd = Math.floor(((i + 1) / spikes) * dataArray.length);
          let maxVal = 0;
          for (let j = segStart; j < segEnd; ++j) {
            if (dataArray[j] > maxVal) maxVal = dataArray[j];
          }
          const spike = maxVal / 255;
          prevHeights.current[i] = lerp(prevHeights.current[i], spike, 0.34);

          const r = minR + (maxR - minR) * prevHeights.current[i];
          const angle = (i / spikes) * Math.PI * 2;

          const sx = cx + minR * Math.cos(angle);
          const sy = cy + minR * Math.sin(angle);
          const ex = cx + r * Math.cos(angle);
          const ey = cy + r * Math.sin(angle);

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = "#111";
          ctx.lineWidth = 2.3;
          ctx.shadowColor = "#0001";
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getWaveform, isVisualizing, size, spikes]);

  const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return (
    <canvas
      ref={canvasRef}
      width={size * ratio}
      height={size * ratio}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "block",
        background: "none",
        boxShadow: "0 1px 12px #0002",
      }}
    />
  );
};