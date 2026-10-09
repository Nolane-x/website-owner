'use client';

import React, { useRef, useEffect } from 'react';
import { getShaderDimensions } from '@/lib/wallpaper/wallpaper-utils';

export type ShaderMode = 'matrix' | 'starfield' | 'rain' | 'waves' | 'none';

interface CanvasShadersProps {
  mode: ShaderMode;
  className?: string;
}

export function CanvasShaders({ mode, className = '' }: CanvasShadersProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (mode === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dims = getShaderDimensions(width, height, window.devicePixelRatio || 1);
      canvas.width = dims.scaledWidth;
      canvas.height = dims.scaledHeight;
      canvas.style.width = `${dims.width}px`;
      canvas.style.height = `${dims.height}px`;
      ctx.scale(dims.pixelRatio, dims.pixelRatio);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 1. Matrix Rain state
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const matrixDrops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));
    const matrixChars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ'.split('');

    // 2. Starfield Warp state
    const numStars = 400;
    const stars = Array.from({ length: numStars }, () => ({
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * width,
      pz: Math.random() * width,
    }));

    // 3. Rain on glass state
    const numRainDrops = 120;
    const rainDrops = Array.from({ length: numRainDrops }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 10 + Math.random() * 20,
      speed: 4 + Math.random() * 8,
      opacity: 0.2 + Math.random() * 0.5,
    }));

    // 4. Cosmic Waves state
    let waveStep = 0;

    const render = () => {
      if (mode === 'matrix') {
        // Semi-transparent black to create trailing effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.08)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < matrixDrops.length; i++) {
          const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          const x = i * fontSize;
          const y = matrixDrops[i] * fontSize;

          // Glowing head character
          ctx.fillStyle = '#6ee7b7';
          ctx.fillText(char, x, y);

          // Darker green body
          ctx.fillStyle = '#10b981';
          if (matrixDrops[i] > 1) {
            const prevChar = matrixChars[Math.floor(Math.random() * matrixChars.length)];
            ctx.fillText(prevChar, x, y - fontSize);
          }

          if (y > height && Math.random() > 0.975) {
            matrixDrops[i] = 0;
          }
          matrixDrops[i]++;
        }
      } else if (mode === 'starfield') {
        ctx.fillStyle = 'rgba(5, 5, 10, 0.25)';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const speed = 12;

        for (const star of stars) {
          star.z -= speed;
          if (star.z <= 0) {
            star.z = width;
            star.x = (Math.random() - 0.5) * width;
            star.y = (Math.random() - 0.5) * height;
            star.pz = star.z;
          }

          const k = 250 / star.z;
          const px = star.x * k + cx;
          const py = star.y * k + cy;

          const pk = 250 / star.pz;
          const pxOld = star.x * pk + cx;
          const pyOld = star.y * pk + cy;
          star.pz = star.z;

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            const size = Math.max(0.5, (1 - star.z / width) * 2.5);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = size;
            ctx.beginPath();
            ctx.moveTo(pxOld, pyOld);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        }
      } else if (mode === 'rain') {
        ctx.fillStyle = 'rgba(5, 8, 12, 0.2)';
        ctx.fillRect(0, 0, width, height);

        for (const drop of rainDrops) {
          ctx.strokeStyle = `rgba(186, 230, 253, ${drop.opacity})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + 1, drop.y + drop.length);
          ctx.stroke();

          drop.y += drop.speed;
          drop.x += 0.5;

          if (drop.y > height) {
            drop.y = -drop.length;
            drop.x = Math.random() * width;
          }
        }
      } else if (mode === 'waves') {
        ctx.fillStyle = 'rgba(6, 6, 12, 0.15)';
        ctx.fillRect(0, 0, width, height);

        waveStep += 0.02;
        const numWaves = 4;

        for (let w = 0; w < numWaves; w++) {
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = w % 2 === 0 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(16, 185, 129, 0.4)';

          const freq = 0.005 + w * 0.002;
          const amp = 40 + w * 15;
          const yOffset = height / 2 + Math.sin(waveStep + w) * 30;

          for (let x = 0; x < width; x += 6) {
            const y = yOffset + Math.sin(x * freq + waveStep * (w + 1)) * amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mode]);

  if (mode === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
    />
  );
}
