import { describe, it, expect } from 'vitest';
import {
  inboxItems,
  customWallpapers,
  researchSources,
  claims,
  decisionRecords,
} from '../src/lib/db/schema';

describe('Web OS 5.0 Database Schemas', () => {
  it('định nghĩa bảng inboxItems với các trường cần thiết', () => {
    expect(inboxItems).toBeDefined();
    expect(inboxItems.id).toBeDefined();
    expect(inboxItems.title).toBeDefined();
    expect(inboxItems.kind).toBeDefined();
    expect(inboxItems.status).toBeDefined();
  });

  it('định nghĩa bảng customWallpapers cho Live Video & Static Wallpaper', () => {
    expect(customWallpapers).toBeDefined();
    expect(customWallpapers.id).toBeDefined();
    expect(customWallpapers.title).toBeDefined();
    expect(customWallpapers.type).toBeDefined();
    expect(customWallpapers.filtersJson).toBeDefined();
  });

  it('định nghĩa bảng researchSources và claims cho Evidence Library', () => {
    expect(researchSources).toBeDefined();
    expect(researchSources.id).toBeDefined();
    expect(claims).toBeDefined();
    expect(claims.statement).toBeDefined();
    expect(claims.status).toBeDefined();
  });

  it('định nghĩa bảng decisionRecords cho Project Cockpit RFC', () => {
    expect(decisionRecords).toBeDefined();
    expect(decisionRecords.id).toBeDefined();
    expect(decisionRecords.title).toBeDefined();
    expect(decisionRecords.decision).toBeDefined();
  });
});
