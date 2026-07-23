import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { writeFile, mkdir, access, readFile } from 'fs/promises';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

let mainWindow: BrowserWindow | null = null;
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getIconPath() {
  const candidates = process.env.VITE_DEV_SERVER_URL
    ? [join(__dirname, '../public/icon.png'), join(__dirname, '../public/icon.svg')]
    : [join(__dirname, '../dist/icon.png'), join(__dirname, '../dist/icon.svg')];
  return candidates.find(p => existsSync(p)) || candidates[0];
}

function createWindow() {
  const iconPath = getIconPath();
  const isWin = process.platform === 'win32';
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    title: 'FX Studio',
    icon: nativeImage.createFromPath(iconPath),
    backgroundColor: '#161b22',
    ...(isWin ? {
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#161b22',
        symbolColor: '#e6edf3',
        height: 44
      }
    } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

// --- AI Service ---
function getOpenAIClient(apiKey: string): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function getAnthropicClient(apiKey: string): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// --- IPC Handlers ---
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openProjectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'FX Studio Project', extensions: ['fxproj'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:saveProjectFile', async (_event, defaultName?: string) => {
  const safe = (defaultName || 'project').replace(/[<>:"/\\|?*]/g, '_');
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'FX Studio Project', extensions: ['fxproj'] }],
    defaultPath: `${safe}.fxproj`
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  return readFile(filePath, 'utf-8');
});

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  await writeFile(filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
  await mkdir(dirPath, { recursive: true });
  return true;
});

ipcMain.handle('fs:exists', async (_event, filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('export:writeFiles', async (_event, files: { path: string; content: string; encoding?: 'utf8' | 'base64' }[]) => {
  const results: { path: string; success: boolean; error?: string }[] = [];
  for (const file of files) {
    try {
      const dir = file.path.substring(0, Math.max(file.path.lastIndexOf('/'), file.path.lastIndexOf('\\')));
      await mkdir(dir, { recursive: true });
      const payload = file.encoding === 'base64'
        ? Buffer.from(file.content, 'base64')
        : file.content;
      await writeFile(file.path, payload);
      results.push({ path: file.path, success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ path: file.path, success: false, error: msg });
    }
  }
  return results;
});

ipcMain.handle('ai:chatStream', async (_event, payload: {
  provider: 'openai' | 'anthropic';
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  maxTokens: number;
}) => {
  const { provider, model, messages, temperature, maxTokens } = payload;

  try {
    if (provider === 'openai') {
      const key = getStoredKey('openai');
      if (!key) throw new Error('OpenAI API Key not configured');
      const client = getOpenAIClient(key);
      const stream = await client.chat.completions.create({
        model,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content && mainWindow) {
          mainWindow.webContents.send('ai:streamChunk', content);
        }
      }
      if (mainWindow) mainWindow.webContents.send('ai:streamDone');
    } else if (provider === 'anthropic') {
      const key = getStoredKey('anthropic');
      if (!key) throw new Error('Anthropic API Key not configured');
      const client = getAnthropicClient(key);
      const stream = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: messages.find(m => m.role === 'system')?.content || '',
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
          const content = chunk.delta.text;
          if (content && mainWindow) {
            mainWindow.webContents.send('ai:streamChunk', content);
          }
        }
      }
      if (mainWindow) mainWindow.webContents.send('ai:streamDone');
    }
  } catch (err: any) {
    if (mainWindow) {
      mainWindow.webContents.send('ai:streamError', err.message || 'Unknown error');
    }
  }
});

// --- Secure Key Storage ---
let storedKeys: Record<string, string> = {};

function getStoredKey(provider: string): string | null {
  return storedKeys[provider] || null;
}

ipcMain.handle('secure:setApiKey', async (_event, provider: string, key: string) => {
  storedKeys[provider] = key;
  // In production, use safeStorage.encryptString(key) and store encrypted
  return true;
});

ipcMain.handle('secure:getApiKey', async (_event, provider: string) => {
  return storedKeys[provider] || null;
});

ipcMain.handle('app:getPath', async (_event, name: string) => {
  return app.getPath(name as any);
});

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

// --- App Lifecycle ---
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
