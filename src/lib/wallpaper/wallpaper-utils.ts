import { WallpaperFilters } from '@/lib/types';

export function generateCssFilterString(filters: WallpaperFilters): string {
  const parts: string[] = [];

  if (typeof filters.dim === 'number' && filters.dim > 0) {
    const brightness = Math.max(0, 100 - filters.dim);
    parts.push(`brightness(${brightness}%)`);
  }

  if (typeof filters.blur === 'number' && filters.blur > 0) {
    parts.push(`blur(${filters.blur}px)`);
  }

  if (typeof filters.contrast === 'number' && filters.contrast !== 100) {
    parts.push(`contrast(${filters.contrast}%)`);
  }

  if (typeof filters.saturation === 'number' && filters.saturation !== 100) {
    parts.push(`saturate(${filters.saturation}%)`);
  }

  if (parts.length === 0) {
    return 'none';
  }

  return parts.join(' ');
}

export function getShaderDimensions(
  width: number,
  height: number,
  dpr = 1
): {
  width: number;
  height: number;
  pixelRatio: number;
  scaledWidth: number;
  scaledHeight: number;
} {
  const safeDpr = Math.min(2, Math.max(1, dpr));
  return {
    width,
    height,
    pixelRatio: safeDpr,
    scaledWidth: Math.floor(width * safeDpr),
    scaledHeight: Math.floor(height * safeDpr),
  };
}
