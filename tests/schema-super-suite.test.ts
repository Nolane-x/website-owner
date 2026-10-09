import { describe, it, expect } from 'vitest';
import * as schema from '../src/lib/db/schema';

describe('Schema Super Suite - Personal Web OS 3.0', () => {
  it('định nghĩa đầy đủ 5 bảng mới cho Super Suite', () => {
    expect(schema.kanbanTasks).toBeDefined();
    expect(schema.subscriptions).toBeDefined();
    expect(schema.codeSnippets).toBeDefined();
    expect(schema.scratchpads).toBeDefined();
    expect(schema.contentLinks).toBeDefined();
  });

  it('bảng kanbanTasks có các cột chuẩn', () => {
    expect(schema.kanbanTasks.id).toBeDefined();
    expect(schema.kanbanTasks.title).toBeDefined();
    expect(schema.kanbanTasks.status).toBeDefined();
    expect(schema.kanbanTasks.priority).toBeDefined();
  });

  it('bảng subscriptions có các cột chuẩn', () => {
    expect(schema.subscriptions.id).toBeDefined();
    expect(schema.subscriptions.name).toBeDefined();
    expect(schema.subscriptions.cost).toBeDefined();
    expect(schema.subscriptions.currency).toBeDefined();
    expect(schema.subscriptions.nextBillingDate).toBeDefined();
  });

  it('bảng codeSnippets có các cột chuẩn', () => {
    expect(schema.codeSnippets.id).toBeDefined();
    expect(schema.codeSnippets.title).toBeDefined();
    expect(schema.codeSnippets.language).toBeDefined();
    expect(schema.codeSnippets.code).toBeDefined();
  });

  it('bảng scratchpads có các cột chuẩn', () => {
    expect(schema.scratchpads.id).toBeDefined();
    expect(schema.scratchpads.content).toBeDefined();
    expect(schema.scratchpads.color).toBeDefined();
  });

  it('bảng contentLinks có các cột chuẩn cho wiki-links', () => {
    expect(schema.contentLinks.id).toBeDefined();
    expect(schema.contentLinks.sourceId).toBeDefined();
    expect(schema.contentLinks.targetId).toBeDefined();
    expect(schema.contentLinks.linkText).toBeDefined();
  });
});
