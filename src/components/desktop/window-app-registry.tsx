'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center p-8 text-stone-400">
    <Loader2 className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
    <span className="text-sm">Đang tải ứng dụng Web OS...</span>
  </div>
);

// Lazy load app modules to ensure optimal performance and independent bundles
export const DynamicInboxApp = dynamic(
  () => import('@/components/desktop/apps/inbox-app').then((m) => m.InboxApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicTasksApp = dynamic(
  () => import('@/components/desktop/apps/tasks-app').then((m) => m.TasksApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicWallpapersApp = dynamic(
  () => import('@/components/wallpaper/custom-wallpaper-studio').then((m) => m.CustomWallpaperStudio),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicMusicApp = dynamic(
  () => import('@/components/desktop/apps/music-app').then((m) => m.MusicApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicDevToolsApp = dynamic(
  () => import('@/components/desktop/apps/devtools-app').then((m) => m.DevToolsApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicResearchApp = dynamic(
  () => import('@/components/desktop/apps/research-app').then((m) => m.ResearchApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicAiApp = dynamic(
  () => import('@/components/desktop/apps/ai-app').then((m) => m.AiApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicSnippetsApp = dynamic(
  () => import('@/components/desktop/apps/snippets-app').then((m) => m.SnippetsApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicNotesApp = dynamic(
  () => import('@/components/desktop/apps/notes-app').then((m) => m.NotesApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicVaultApp = dynamic(
  () => import('@/components/desktop/apps/vault-app').then((m) => m.VaultApp),
  { loading: LoadingFallback, ssr: false }
);

export const DynamicSettingsApp = dynamic(
  () => import('@/components/desktop/apps/settings-app').then((m) => m.SettingsApp),
  { loading: LoadingFallback, ssr: false }
);

export function renderAppContent(appId: string) {
  switch (appId) {
    case 'inbox':
      return <DynamicInboxApp />;
    case 'tasks':
      return <DynamicTasksApp />;
    case 'wallpapers':
      return <DynamicWallpapersApp />;
    case 'music':
      return <DynamicMusicApp />;
    case 'devtools':
      return <DynamicDevToolsApp />;
    case 'research':
      return <DynamicResearchApp />;
    case 'ai':
      return <DynamicAiApp />;
    case 'snippets':
      return <DynamicSnippetsApp />;
    case 'notes':
      return <DynamicNotesApp />;
    case 'vault':
      return <DynamicVaultApp />;
    case 'settings':
      return <DynamicSettingsApp />;
    default:
      return (
        <div className="flex h-full flex-col items-center justify-center p-6 text-stone-400">
          <p className="text-sm font-medium">Ứng dụng chưa được định nghĩa: {appId}</p>
        </div>
      );
  }
}
