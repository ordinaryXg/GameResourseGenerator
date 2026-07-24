# FX Studio

**面向游戏引擎的粒子特效编辑器** — 在独立环境中组合、预览、管理资产，并导出可在目标引擎中直接使用的特效资源。

| | |
|---|---|
| 版本 | **2.0.0** |
| 包名 | `cocos-effect-generator` |
| 当前一等公民 | **Cocos Creator 3.8.x** |
| 测试 | 140 项单元测试 |

> 终极目标：做一款**最好用的特效制作软件** — 在此完成创作与预览后，将特效导出到 Cocos / Unity / Unreal 开箱即用。

---

## 产品定位

FX Studio v2 以 **`.fxproj` 项目 + 多发射器层级树** 为核心，对标 Unity Particle System 的编辑工作流；AI 为可选辅助（须选中发射器后生效），无 API Key 时仍可完整手动编辑。

| 原则 | 说明 |
|------|------|
| 组合而非扁平 | 项目 → 组 → 发射器 → 粒子模块 |
| 引用可追溯 | 贴图 / 材质 / Shader 以 AssetRef 绑定，Inspector 可替换 |
| 引擎 round-trip | Cocos Prefab 导入 ↔ 编辑 ↔ 导出，尽量保留模块与材质数据 |
| AI 可关闭 | 对话面板可隐藏，不影响主流程 |

---

## 当前能力一览

### 编辑与预览

- **层级树**：组 / 发射器；拖拽 reparent；节点激活（Node Active）；Solo / 隐藏
- **粒子模块**：主模块 + 形状 / 颜色 / 大小 / 旋转 / 速度 / 噪声 / 拖尾 / 纹理动画 / 渲染器 / 爆发
- **主模块**：对齐 Cocos 主模块字段（Duration、Capacity、Loop、SimulationSpeed、StartDelay、StartSize3D 等）
- **节点图**：模块 ON/OFF 与属性面板联动
- **实时预览**：多发射器 WebGL 合成；循环语义对齐 Cocos（发射时钟续播，不清场粒子）
- **Undo/Redo**：覆盖树操作、参数、资产替换

### 资产系统

- **内置库**：贴图、精灵帧、材质、Shader、Mesh
- **项目资产**：导入 PNG/JPG/WebP；复制内置资产到项目后可编辑
- **属性面板**：按资产类型分编辑器（贴图 / 材质 / Shader / Mesh / 精灵帧）
- **材质编辑器（Plan B 完整）**：
  - Technique / Defines / Props（Schema 驱动 + KV 兜底）
  - 多 Pass + Stencil + 高级 Blend
  - 导出项目 Shader 为 `.effect` + `.meta`（稳定 UUID），`.mtl` 引用同一 Effect

### Cocos Creator 3.8 互通

| 方向 | 内容 |
|------|------|
| **导出** | 多 `ParticleSystem` Prefab + 贴图 + 材质 `.mtl` + 自定义 `.effect` + meta |
| **导入** | 解析 `.prefab`，绑定同目录 PNG/MTL/Effect，恢复 `materialDoc` 与 Shader 链接 |
| **迁移** | v1 localStorage Session 自动转为 v2 项目 |

### 路线图（未完整支持）

| 引擎 | 状态 |
|------|------|
| Unity 2022+ | 导出草案 / 模块映射表 |
| Unreal 5 | 导出草案 / Niagara 映射表 |

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装与运行

```bash
npm install

# Web 开发（浏览器预览）
npm run dev

# 类型检查 + 前端/Electron 生产构建
npm run build

# 单元测试
npm test

# Windows 便携版（Electron）
npm run electron:build
```

### 典型工作流

1. 启动 → **新建项目** 或 **组合预设**（爆炸 / 魔法 / 环境）
2. 层级树组织多个发射器 → 右侧编辑 **Transform** 与粒子模块
3. 资产浏览器选贴图 / 材质 → 拖到发射器引用槽或全局属性面板
4. 预览验证 → **Ctrl+E** 导出到 Cocos 项目 `assets/effects/{projectId}/`
5. 在 Cocos Creator 3.8 中拖入 Prefab 验证

更多细节见 [用户指南](docs/USER-GUIDE.md)。

---

## 界面概览

```
┌─────────────────────────────────────────────────────────────────┐
│ 菜单 / 工具栏：新建 · 保存 · 撤销 · 导入 · 导出 · AI（可选）      │
├──────────┬──────────────────────────────────────┬───────────────┤
│ 层级树    │  中央：3D 预览 / 模块节点图            │  属性检查器    │
│          │                                      │  节点 / 资产   │
├──────────┴──────────────────────────────────────┴───────────────┤
│ 资产浏览器（贴图 · 材质 · Shader · Mesh）                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 项目结构

```
src/
├── components/
│   ├── hierarchy/          # 层级树
│   ├── preview/            # WebGL 预览
│   ├── editor/             # 模块节点图、Shader 工作区
│   ├── assets/             # 资产浏览器
│   ├── properties/         # 节点 / 资产属性（含 MaterialPassStatesEditor 等）
│   └── layout/             # 导出、预设、欢迎页
├── stores/
│   ├── project-store.ts    # .fxproj 项目状态
│   └── asset-store.ts      # 资产注册表
├── utils/
│   ├── export-pipeline.ts  # Cocos 导出管线
│   ├── prefab-importer.ts  # Prefab 导入
│   ├── material-document.ts / mtl-io.ts / effect-io.ts  # 材质 & Effect round-trip
│   ├── effect-schema.ts    # CCEffect 子集解析
│   ├── particle-loop.ts    # 循环发射时钟（Cocos 语义）
│   └── project-io.ts       # 项目序列化
├── data/
│   ├── builtin-assets.ts
│   └── preset-projects/    # 组合预设
└── types/                  # effect / project / asset / material

docs/                       # 产品文档（见下方索引）
tests/                      # Vitest（140 项）
electron/                   # 主进程
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | **用户指南**（上手、工作流、导出） |
| [docs/PRD-v2.md](docs/PRD-v2.md) | v2.0 产品需求 |
| [docs/DEVELOPMENT-PLAN-v2.md](docs/DEVELOPMENT-PLAN-v2.md) | 开发步骤表与里程碑 |
| [docs/MIGRATION-v1.md](docs/MIGRATION-v1.md) | v1 Session → v2 项目迁移 |
| [docs/E2E-SMOKE.md](docs/E2E-SMOKE.md) | E2E 冒烟清单 |
| [docs/RELEASE-GATE.md](docs/RELEASE-GATE.md) | v2.0 发布门禁 |
| [docs/PROJECT-PLAN.md](docs/PROJECT-PLAN.md) | 项目计划书 |
| [docs/superpowers/specs/2026-07-24-material-editor-b-design.md](docs/superpowers/specs/2026-07-24-material-editor-b-design.md) | 材质编辑器设计（Plan B） |

完整文档索引：[docs/README.md](docs/README.md)

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` / `Ctrl+Y` | 撤销 / 重做 |
| `Ctrl+S` | 保存项目（Electron） |
| `Ctrl+E` | 导出 |
| `Ctrl+T` | 组合预设 |
| `Space` | 播放 / 暂停预览 |

---

## 技术栈

Electron 32 · React 18 · TypeScript 5 · Vite 5 · Three.js 0.169 · Zustand 5 · @xyflow/react 12 · CodeMirror 6 · Vitest 4

---

## 许可证

ISC
