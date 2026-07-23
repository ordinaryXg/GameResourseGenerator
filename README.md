# FX Studio

**最好用的游戏特效制作软件** — 在独立编辑器中创作、预览、组合粒子特效，并导出为可在 **Cocos Creator / Unity / Unreal** 中直接使用的资源。

## 愿景

- 编辑体验对标 Unity Particle System，做业内最好用的特效工具
- 一次制作，多引擎导出：Cocos（已支持）、Unity、Unreal（路线图）
- AI 作为可选辅助，加速从创意到可用资源的链路

## 功能

- 🤖 **AI 自然语言生成** — 输入描述即可生成粒子特效（支持 Demo 模式 + LLM 模式）
- 🎬 **3D 实时预览** — Three.js WebGL 粒子渲染，支持播放/暂停/重置
- 📋 **属性检查器** — 9 个模块完整参数编辑
- 📐 **节点编辑器** — React Flow 可视化模块节点
- 📁 **模板库** — 15 个内置模板，4 个分类
- 📤 **多引擎导出** — Cocos Creator 3.8 `.prefab`（已支持）；Unity / Unreal（规划中）
- 📥 **.prefab 导入** — 支持工具栏导入 + 拖拽导入
- 🎨 **Shader 编辑器** — CodeMirror 6 + GLSL 语法高亮
- 🖼 **2D 粒子系统** — 正交投影预览
- 💬 **多会话管理** — 新建/切换/复制/删除会话

## 技术栈

- Electron 32 + React 18 + TypeScript 5
- Three.js 0.169 (WebGL 粒子渲染)
- Zustand 5 (状态管理)
- @xyflow/react 12 (节点编辑器)
- CodeMirror 6 (Shader 编辑器)
- Vite 5 (构建工具)

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（Web 预览）
npm run dev

# 生产构建
npm run build

# 预览
npm run preview
```

## 项目结构

```
src/
├── components/
│   ├── chat/ChatPanel.tsx         # AI 对话面板
│   ├── editor/NodeEditor.tsx      # React Flow 节点编辑器
│   ├── editor/ShaderEditor.tsx    # Shader 编辑器
│   ├── inspector/InspectorPanel.tsx # 属性检查器
│   ├── preview/PreviewPanel.tsx   # 3D/2D 预览面板
│   ├── templates/TemplateLibrary.tsx # 模板库
│   ├── layout/SessionsPanel.tsx   # 多会话管理
│   ├── layout/SettingsModal.tsx   # 设置弹窗
│   └── layout/ExportModal.tsx     # 导出弹窗
├── stores/app-store.ts            # Zustand 状态管理
├── types/effect.ts                # 完整类型定义
├── utils/
│   ├── ai-engine.ts               # AI 引擎 + 模板数据
│   ├── particle-preview.ts        # 3D 粒子预览引擎
│   ├── particle2d-preview.ts      # 2D 粒子预览引擎
│   ├── export-pipeline.ts         # .prefab 导出管线
│   ├── prefab-importer.ts         # .prefab 导入解析器
│   └── effect-defaults.ts         # 默认配置生成器
└── styles/global.css              # 全局样式
```
