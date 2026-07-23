export {};

declare global {
  interface Window {
    electronAPI: {
      openDirectory: () => Promise<string | null>;
      openProjectFile: () => Promise<string | null>;
      saveProjectFile: (defaultName?: string) => Promise<string | null>;
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<boolean>;
      mkdir: (path: string) => Promise<boolean>;
      exists: (path: string) => Promise<boolean>;
      writeExportFiles: (files: { path: string; content: string; encoding?: 'utf8' | 'base64' }[]) => Promise<{ path: string; success: boolean; error?: string }[]>;
      chatStream: (payload: {
        provider: 'openai' | 'anthropic';
        model: string;
        messages: { role: string; content: string }[];
        temperature: number;
        maxTokens: number;
      }) => Promise<void>;
      onStreamChunk: (callback: (content: string) => void) => void;
      onStreamDone: (callback: () => void) => void;
      onStreamError: (callback: (error: string) => void) => void;
      setApiKey: (provider: string, key: string) => Promise<boolean>;
      getApiKey: (provider: string) => Promise<string | null>;
      getPath: (name: string) => Promise<string>;
      getVersion: () => Promise<string>;
    };
  }
}
