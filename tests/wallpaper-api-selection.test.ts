import { describe, expect, it } from 'vitest';
import { wallpaperMetadataSelection } from '@/lib/wallpaper/api-selection';

describe('wallpaper library performance boundary', () => {
  it('keeps uploaded media payloads out of metadata queries', () => {
    const selectedColumns = Object.keys(wallpaperMetadataSelection);
    expect(selectedColumns).not.toContain('localDataUrl');
    expect(selectedColumns).toContain('hasLocalDataUrl');
    expect(selectedColumns).toEqual(expect.arrayContaining([
      'id',
      'title',
      'sourceUrl',
      'type',
      'filtersJson',
      'isFavorite',
    ]));
  });
});
