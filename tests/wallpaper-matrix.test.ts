import { describe, it, expect } from 'vitest';
import {
  generateCssFilterString,
  getShaderDimensions,
} from '../src/lib/wallpaper/wallpaper-utils';

describe('Wallpaper Matrix Utilities & Filter Generators', () => {
  it('tạo chuỗi CSS filter chính xác từ bộ thông số hậu kỳ', () => {
    const filters = {
      dim: 40,
      blur: 12,
      contrast: 110,
      saturation: 120,
      vignette: true,
      scanlines: false,
    };

    const cssString = generateCssFilterString(filters);
    expect(cssString).toContain('blur(12px)');
    expect(cssString).toContain('contrast(110%)');
    expect(cssString).toContain('saturate(120%)');
    expect(cssString).toContain('brightness(60%)'); // 100% - dim 40% = 60%
  });

  it('xử lý giá trị filter mặc định khi không truyền tham số', () => {
    const emptyCss = generateCssFilterString({});
    expect(emptyCss).toBe('none');
  });

  it('tính toán kích thước canvas cho shader theo DPR màn hình', () => {
    const bounds = getShaderDimensions(1920, 1080, 2);
    expect(bounds.width).toBe(1920);
    expect(bounds.height).toBe(1080);
    expect(bounds.pixelRatio).toBe(2);
    expect(bounds.scaledWidth).toBe(3840);
    expect(bounds.scaledHeight).toBe(2160);
  });
});
