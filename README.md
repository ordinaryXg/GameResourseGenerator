# FX Studio

**最好用的游戏特效制作软件** — 在独立编辑器中创作、预览、组合粒子特效，并导出为可在 **Cocos Creator / Unity / Unreal** 中直接使用的资源。

> **v2.0** 以 `.fxproj` 项目为核心：多发射器层级树、资产注册表、Undo/Redo、内置资产库与 Cocos 多节点 Prefab 导出。

## 愿景

- 编辑体验对标 Unity Particle System
- 一次制作，多引擎导出：Cocos Creator 3.8（已支持）、Unity / Unreal（路线图）
- AI 为可选辅助，须选中发射器后才生效

## 核心功能（v2.0）

| 能力 | 说明 |
|------|------|
| 层级树 | 组 / 发射器 / 模块；拖拽 reparent；Solo / Hide |
| 组合预设 | 爆炸、魔法等多发射器项目模板 |
| 资产浏览器 | 内置贴图 / 材质 / Mesh + 项目导入资产 |
| 属性面板 | 节点 Transform + 11 粒子模块 + 资产引用槽 |
| 实时预览 | 多发射器 WebGL 合成预览 |
| 导出 | Cocos Creator 3.8 多 ParticleSystem Prefab + 资产打包 |
| 导入 | `.prefab` 解析 + `.fxproj` 项目文件 |
| v1 迁移 | 自动将 localStorage Session 转为 v2 项目 |
| AI 助手 | Demo / LLM；仅更新当前选中发射器 |

## 技术栈

- Electron 32 + React 18 + TypeScript 5
- Three.js 0.169 · Zustand 5 · @xyflow/react 12 · CodeMirror 6 · Vite 5

## 快速开始

```bash
npm install

# Web 开发
npm run dev

# 类型检查 + 生产构建
npm run build

# 单元测试（88+ 项）
npm test

# Electron 安装包（Windows）
npm run electron:build
```

## 项目结构

```
src/
├── components/
│   ├── hierarchy/HierarchyPanel.tsx    # 层级树
│   ├── assets/AssetBrowserPanel.tsx    # 资产浏览器
│   ├── properties/PropertiesPanel.tsx  # 全局属性面板
│   ├── layout/PresetProjectsModal.tsx  # 组合预设
│   ├── layout/EmitterTemplatesModal.tsx # 单发射器模板
│   └── layout/ProjectWelcome.tsx       # 启动 / 迁移
├── stores/
│   ├── project-store.ts                # .fxproj 项目状态
│   └── asset-store.ts                  # 资产注册表
├── utils/
│   ├── project-io.ts                   # 序列化
│   ├── export-pipeline.ts              # Cocos 导出
│   └── migrate-v1.ts                   # v1 迁移
└── data/preset-projects.ts             # 组合预设数据
```

## 文档

| 文档 | 说明 |
|------|------|
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | 用户指南 |
| [docs/MIGRATION-v1.md](docs/MIGRATION-v1.md) | v1 → v2 迁移 |
| [docs/DEVELOPMENT-PLAN-v2.md](docs/DEVELOPMENT-PLAN-v2.md) | 开发步骤表 |
| [docs/RELEASE-GATE.md](docs/RELEASE-GATE.md) | v2.0 发布门禁 |
| [docs/E2E-SMOKE.md](docs/E2E-SMOKE.md) | E2E 冒烟清单 |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z / Ctrl+Y | 撤销 / 重做 |
| Ctrl+S | 保存（Electron） |
| Ctrl+E | 导出 |
| Ctrl+T | 组合预设 |
| Space | 播放 / 暂停预览 |

## 许可证

ISC
