import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openProjectFile: () => ipcRenderer.invoke('dialog:openProjectFile'),
  importPrefabBundle: () => ipcRenderer.invoke('dialog:importPrefabBundle'),
  saveProjectFile: (defaultName?: string) => ipcRenderer.invoke('dialog:saveProjectFile', defaultName),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),

  // File System
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),

  // Export
  writeExportFiles: (files: { path: string; content: string; encoding?: 'utf8' | 'base64' }[]) =>
    ipcRenderer.invoke('export:writeFiles', files),

  // AI
  chatStream: (payload: {
    provider: 'openai' | 'anthropic';
    model: string;
    messages: { role: string; content: string }[];
    temperature: number;
    maxTokens: number;
  }) => ipcRenderer.invoke('ai:chatStream', payload),

  onStreamChunk: (callback: (content: string) => void) => {
    ipcRenderer.on('ai:streamChunk', (_event, content) => callback(content));
  },
  onStreamDone: (callback: () => void) => {
    ipcRenderer.on('ai:streamDone', () => callback());
  },
  onStreamError: (callback: (error: string) => void) => {
    ipcRenderer.on('ai:streamError', (_event, error) => callback(error));
  },

  // Secure Storage
  setApiKey: (provider: string, key: string) => ipcRenderer.invoke('secure:setApiKey', provider, key),
  getApiKey: (provider: string) => ipcRenderer.invoke('secure:getApiKey', provider),

  // App
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path)
});
