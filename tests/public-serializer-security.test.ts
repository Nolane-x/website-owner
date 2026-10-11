import { describe, expect, it } from 'vitest';
import {
  toPublicContent,
  toPublicContentSummary,
  toPublicProject,
  toPublicProjectSummary,
  toPublicResource,
  toPublicBlock,
  toPublicSiteSettings,
} from '@/lib/api/public-serializer';

describe('public serializer URL trust boundaries', () => {
  it('keeps safe project links and removes executable or protocol-relative destinations', () => {
    const project = toPublicProject({
      id: 'project-1',
      title: 'Example',
      slug: 'example',
      metadata: {
        repoUrl: 'https://github.com/example/repo',
        demoUrl: 'javascript:alert(1)',
      },
    });

    expect(project?.metadata.repoUrl).toBe('https://github.com/example/repo');
    expect(project?.metadata.demoUrl).toBeUndefined();
    expect(toPublicProject({
      id: 'project-2',
      title: 'Bad',
      slug: 'bad',
      metadata: { repoUrl: '//attacker.example/repo' },
    })?.metadata.repoUrl).toBeUndefined();
  });

  it('sanitizes resource URLs and canonical metadata without exposing active schemes', () => {
    const resource = toPublicResource({
      id: 'resource-1',
      title: 'Resource',
      slug: 'resource',
      metadata: { url: 'data:text/html,<script>alert(1)</script>' },
    });
    expect(resource?.metadata.url).toBe('#');

    const content = toPublicContent({
      id: 'article-1',
      title: 'Article',
      slug: 'article',
      metadata: {
        canonicalUrl: 'javascript:alert(1)',
        summary: 'Summary',
      },
    });
    expect(content?.metadata.canonicalUrl).toBeUndefined();
    expect(content?.metadata.summary).toBe('Summary');
  });

  it('removes heavy fields from content summary DTOs', () => {
    const summary = toPublicContentSummary({
      id: 'article-summary',
      title: 'Article summary',
      slug: 'article-summary',
      description: 'Short preview',
      content: '<p>large article body</p>',
      coverImage: 'data:image/png;base64,AAAA',
      icon: 'large-icon-data',
      metadata: { summary: 'summary text', toc: Array.from({ length: 500 }, (_, index) => index) },
    });

    expect(summary?.description).toBe('Short preview');
    expect(summary?.content).toBeNull();
    expect(summary?.coverImage).toBeNull();
    expect(summary?.icon).toBeNull();
    expect(summary?.metadata).toEqual({});
  });

  it('removes heavy body and cover fields from project summary DTOs but preserves safe links', () => {
    const summary = toPublicProjectSummary({
      id: 'project-summary',
      title: 'Project summary',
      slug: 'project-summary',
      description: 'Short preview',
      content: '<p>large project body</p>',
      coverImage: 'data:image/png;base64,AAAA',
      metadata: { repoUrl: 'https://github.com/example/repo', demoUrl: 'https://demo.example/' },
    });

    expect(summary?.content).toBeNull();
    expect(summary?.coverImage).toBeNull();
    expect(summary?.metadata.repoUrl).toBe('https://github.com/example/repo');
    expect(summary?.metadata.demoUrl).toBe('https://demo.example/');
  });
  it('sanitizes URLs inside nested public block content and settings', () => {
    const block = toPublicBlock({
      id: 'block-1',
      blockType: 'gallery',
      sortOrder: 0,
      contentJson: {
        title: 'Gallery',
        items: [
          { src: 'javascript:alert(1)', alt: 'unsafe' },
          { src: 'https://images.example/photo.webp', alt: 'safe' },
          { href: '//attacker.example/redirect', title: 'unsafe link' },
        ],
      },
      settingsJson: {
        fallback: { url: 'vbscript:msgbox(1)', externalUrl: 'javascript:alert(2)' },
      },
    });

    expect(block?.content.items).toEqual([
      { src: '', alt: 'unsafe' },
      { src: 'https://images.example/photo.webp', alt: 'safe' },
      { href: '', title: 'unsafe link' },
    ]);
    expect(block?.settings.fallback).toEqual({ url: '', externalUrl: '' });
  });

  it('filters unsafe links from public navigation while preserving legitimate local and web paths', () => {
    const settings = toPublicSiteSettings({
      public_navigation: {
        items: [
          { id: 'home', label: 'Home', href: '/', visible: true },
          { id: 'docs', label: 'Docs', href: 'https://docs.example/', visible: true },
          { id: 'bad', label: 'Unsafe', href: 'javascript:alert(1)', visible: true },
          { id: 'proto', label: 'Protocol-relative', href: '//attacker.example/', visible: true },
          { id: 'empty', label: '', href: '/empty', visible: true },
        ],
      },
    });

    expect(settings.navigation.items).toEqual([
      { id: 'home', label: 'Home', href: '/', visible: true },
      { id: 'docs', label: 'Docs', href: 'https://docs.example/', visible: true },
    ]);
  });
});
