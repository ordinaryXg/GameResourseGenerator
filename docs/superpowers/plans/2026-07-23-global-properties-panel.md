# 全局属性窗口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将主视图右侧栏升级为全局「属性」面板——选中层级节点时编辑发射器/组，选中资产时编辑贴图/材质/Shader/模型等，并为各资产类型预留可扩展的编辑区。

**Architecture:** 引入统一的 `InspectorTarget` 选中模型（末次点击优先），右侧 `PropertiesPanel` 作为路由壳：`asset` → `AssetInspectorPanel`，`node` → `NodeInspectorPanel`（现有 Inspector 逻辑拆分）。资产浏览器移除内嵌详情栏，选中态写入全局 store；资产编辑通过 `project-store.updateProjectAsset` 写回 `assetRegistry` 并接入 Undo。

**Tech Stack:** React 18、Zustand、TypeScript、Three.js（模型预览）、CodeMirror（Shader 编辑，已有 `@codemirror/*`）、Electron shell API

## Global Constraints

- 项目版本：`FX_PROJECT_VERSION = '2.0.0'`
- 内置资产（`source: 'builtin'`）默认只读；编辑需「复制到项目」生成为 `source: 'project'`
- 导入贴图当前为 data URL；编辑以 meta + 替换文件为主，后续可改为落盘 `assets/textures/`
- 右侧面板宽度沿用 `panelSizes.right`（默认 280px，材质/Shader 编辑阶段建议扩至 320px）
- 所有资产/节点属性变更需接入现有 Undo/Redo（`nextHistoryStacks`）
- UI 文案使用中文

---

## 现状与目标对比

| 区域 | 现状 | 目标 |
|------|------|------|
| 右侧面板 | 仅 `InspectorPanel`，只响应 `selectedNodeId` | 全局属性窗口，节点/资产二选一展示 |
| 资产浏览器 | 右侧内嵌 `AssetDetailPanel`（240px） | 仅网格列表；选中同步到全局属性窗口 |
| 资产编辑 | 材质/Shader 只读预览；贴图无编辑 | 分类型可编辑（见 Phase 2–4） |
| 选中逻辑 | 节点与资产各自 local state | 统一 `InspectorTarget`，末次点击生效 |

---

## 文件结构（目标）

```
src/
  stores/
    app-store.ts                    # + inspectorTarget, setInspectorTarget*
    project-store.ts                # + updateProjectAsset, duplicateAssetToProject
  components/
    properties/
      PropertiesPanel.tsx           # 路由壳 + 面板标题
      NodeInspectorPanel.tsx        # 自 InspectorPanel 拆分
      AssetInspectorPanel.tsx       # 按 asset.type 分发
      editors/
        TextureAssetEditor.tsx
        SpriteFrameAssetEditor.tsx
        MaterialAssetEditor.tsx
        ShaderAssetEditor.tsx
        MeshAssetEditor.tsx
        AssetEditorActions.tsx      # 通用：应用、复制、打开文件夹、删除
    assets/
      AssetBrowserPanel.tsx         # 移除 AssetDetailPanel，改用全局选中
  types/
    inspector.ts                    # InspectorTarget 类型
```

---

## Phase 1：全局属性窗口骨架

**交付物：** 选中资产时右侧显示资产属性；选中节点时行为与现 Inspector 一致；资产浏览器不再重复详情栏。

### Task 1: InspectorTarget 类型与 store

**Files:**
- Create: `src/types/inspector.ts`
- Modify: `src/stores/app-store.ts`

**Interfaces:**
- Produces:
```typescript
export type InspectorTarget =
  | { kind: 'asset'; assetId: string }
  | { kind: 'node'; nodeId: string };

// app-store
inspectorTarget: InspectorTarget | null;
setInspectorTarget: (t: InspectorTarget | null) => void;
selectAssetForInspector: (assetId: string) => void;
selectNodeForInspector: (nodeId: string) => void;
clearInspectorTarget: () => void;
```

- [ ] **Step 1:** 创建 `inspector.ts` 定义 `InspectorTarget`
- [ ] **Step 2:** 在 `app-store` 增加 state 与 action；`selectNodeForInspector` 供层级树调用，`selectAssetForInspector` 供资产浏览器调用
- [ ] **Step 3:** `project-store.selectNode` 内部或 HierarchyPanel 点击时调用 `selectNodeForInspector`
- [ ] **Step 4:** 运行 `npm run build` 确认类型通过

### Task 2: PropertiesPanel 路由壳

**Files:**
- Create: `src/components/properties/PropertiesPanel.tsx`
- Create: `src/components/properties/NodeInspectorPanel.tsx`（从 `InspectorPanel.tsx` 原样迁移）
- Create: `src/components/properties/AssetInspectorPanel.tsx`（初期复用 `AssetDetailPanel` 内容）
- Modify: `src/App.tsx`（`InspectorPanel` → `PropertiesPanel`）
- Modify: `src/components/index.ts`

- [ ] **Step 1:** 将 `InspectorPanel.tsx` 重命名/复制为 `NodeInspectorPanel.tsx`，导出不变
- [ ] **Step 2:** `PropertiesPanel` 读取 `inspectorTarget`：
  - `kind === 'asset'` → `AssetInspectorPanel`
  - `kind === 'node'` 或 fallback `selectedNodeId` → `NodeInspectorPanel`
  - 无选中 → 空状态「选中节点或资产以查看属性」
- [ ] **Step 3:** 面板顶栏显示上下文标题：`属性 · 发射器名称` / `属性 · 资产名称`
- [ ] **Step 4:** 更新 `App.tsx` 引用

### Task 3: 资产浏览器接入全局选中

**Files:**
- Modify: `src/components/assets/AssetBrowserPanel.tsx`

- [ ] **Step 1:** 移除内嵌 `AssetDetailPanel` 与 240px 右侧栏，网格占满宽度
- [ ] **Step 2:** `handleSelect` 调用 `selectAssetForInspector(asset.id)`
- [ ] **Step 3:** 右键选中资产时同样写入全局 target
- [ ] **Step 4:** 单击层级节点时（已有 `selectNode`）确保 `inspectorTarget` 切到 node
- [ ] **Step 5:** 状态栏增加「属性：xxx」显示当前 inspector 对象

### Task 4: Phase 1 验证与提交

- [ ] **Step 1:** 手动验证：点资产 → 右侧详情；点节点 → 右侧模块属性；切换无残留
- [ ] **Step 2:** `npm run build && npx vitest run`
- [ ] **Step 3:** Commit `feat: 全局属性窗口骨架（节点/资产路由）`

---

## Phase 2：资产 Store 与通用操作条

**交付物：** 项目资产可改名、可删除、可复制；内置资产可「复制到项目」。

### Task 5: project-store 资产 CRUD

**Files:**
- Modify: `src/stores/project-store.ts`
- Create: `src/utils/asset-registry.ts`（纯函数：update/duplicate）

**Interfaces:**
- Produces:
```typescript
updateProjectAsset: (assetId: string, patch: Partial<AssetEntry> | ((a: AssetEntry) => AssetEntry)) => void;
duplicateAssetToProject: (sourceAssetId: string) => string; // 返回新 id
renameProjectAsset: (assetId: string, name: string) => void;
```

- [ ] **Step 1:** `updateProjectAsset` 仅允许 `source !== 'builtin'`，写 registry + syncAssetStore + Undo
- [ ] **Step 2:** `duplicateAssetToProject`：深拷贝 builtin/imported，`id` 新 UUID，`source: 'project'`，`name + ' (副本)'`
- [ ] **Step 3:** 单元测试 `asset-registry.test.ts`：duplicate、update meta

### Task 6: AssetEditorActions 通用工具条

**Files:**
- Create: `src/components/properties/editors/AssetEditorActions.tsx`
- Modify: `src/components/properties/AssetInspectorPanel.tsx`

**功能按钮：**
- 应用到当前发射器（已有 `onApplyAsset` 逻辑上移 App 或通过 store callback）
- 在文件夹中显示（复用 `openAssetInFolder`）
- 复制到项目（builtin → duplicate）
- 删除（imported/project only）
- 复制 ID / 名称

- [ ] **Step 1:** 实现 `AssetEditorActions` 组件
- [ ] **Step 2:** 嵌入 `AssetInspectorPanel` 顶部
- [ ] **Step 3:** Commit `feat: 资产属性通用操作与 store CRUD`

---

## Phase 3：分类型资产编辑器

### Task 7: TextureAssetEditor（贴图）

**Files:**
- Create: `src/components/properties/editors/TextureAssetEditor.tsx`

**只读（builtin）：** 大图预览、形状 meta、说明

**可编辑（imported/project）：**
- 名称 input → `renameProjectAsset`
- 「替换贴图」→ 复用 `useAssetImport` 单文件，更新 `uri` data URL + 清 thumbnail cache
- 尺寸显示（读取 Image 加载后写 meta.width/height）

- [ ] **Step 1:** 预览区（max 200px）+ 属性字段
- [ ] **Step 2:** 替换贴图流程
- [ ] **Step 3:** 替换后若被发射器引用，预览自动刷新（已有 assetRefs 机制）

### Task 8: SpriteFrameAssetEditor（精灵帧）

**Files:**
- Create: `src/components/properties/editors/SpriteFrameAssetEditor.tsx`

**v1 范围：**
- 显示关联贴图 + 跳转选中该贴图（`selectAssetForInspector(textureId)`）
- 只读：shape、导出说明
- builtin 复制到项目后可编辑 `name`

**v2（可选）：** rect/pivot 编辑（需扩展 `AssetEntry.meta`：`rect: [x,y,w,h]`）

### Task 9: MaterialAssetEditor（材质）

**Files:**
- Create: `src/components/properties/editors/MaterialAssetEditor.tsx`
- Modify: `src/utils/builtin-asset-content.ts`

**可编辑字段（project 副本）：**
- 混合模式：`additive | alpha` select → `meta.blend`
- 名称、描述（`meta.description`）
- 混合预览条（复用 `MaterialAssetView` 的 BlendSwatch）
- .mtl 预览只读（随 blend 实时更新 `generateBuiltinMaterialSource`）

**builtin：** 只读预览 + 「复制到项目后编辑」提示

- [ ] **Step 1:** 表单 + 混合模式切换写 store
- [ ] **Step 2:** 切换 blend 时，引用该材质的发射器预览立即更新（`resolveParticleBlending` 已支持）

### Task 10: ShaderAssetEditor（Shader）

**Files:**
- Create: `src/components/properties/editors/ShaderAssetEditor.tsx`

**builtin：**
- CodeMirror 只读展示 `generateBuiltinShaderSource`
- 按钮：复制代码、复制到项目

**project：**
- CodeMirror 可编辑，`uri` 或新增 `meta.source: string` 存 Effect 源码
- 「在 Shader 工作区打开」→ `setEffectType('shader')` 并注入源码到 ShaderEditor（需 ShaderEditor 支持 `initialCode` prop 或 store）

- [ ] **Step 1:** 只读 CodeMirror 集成
- [ ] **Step 2:** 可编辑 + 保存到 `updateProjectAsset`
- [ ] **Step 3:** 与中心 Shader 工作区联动（最小：复制粘贴；理想：共享 `shaderDraft` store）

### Task 11: MeshAssetEditor（模型）

**Files:**
- Create: `src/components/properties/editors/MeshAssetEditor.tsx`

**v1：**
- 复用 `MeshPreviewView` 3D 预览（高度 180px）
- 显示 category、description、网格类型
- builtin 只读；复制到项目后可改 name

**v2（后续）：** 导入 `.fbx/.glb`、预览真实 mesh 文件

### Task 12: AssetInspectorPanel 分发

**Files:**
- Modify: `src/components/properties/AssetInspectorPanel.tsx`

```typescript
switch (asset.type) {
  case 'texture': return <TextureAssetEditor asset={asset} />;
  case 'spriteFrame': return <SpriteFrameAssetEditor asset={asset} />;
  case 'material': return <MaterialAssetEditor asset={asset} />;
  case 'shader': return <ShaderAssetEditor asset={asset} />;
  case 'mesh': return <MeshAssetEditor asset={asset} />;
}
```

- [ ] **Step 1:** 完成分发 wiring
- [ ] **Step 2:** 删除或 deprecate 独立 `AssetDetailPanel`（逻辑已迁移）
- [ ] **Step 3:** Commit `feat: 分类型资产属性编辑器`

---

## Phase 4：体验 polish

### Task 13: 选中态与布局

- [ ] 资产浏览器选中高亮与 `inspectorTarget.assetId` 双向同步
- [ ] 按 Esc 清空 inspector 选中（可选）
- [ ] 右侧面板默认宽度 320px；Shader 编辑时记住用户拖拽宽度
- [ ] 空状态插图 + 快捷键提示（双击应用贴图等）

### Task 14: 测试与文档

- [ ] `asset-registry.test.ts`：CRUD + duplicate
- [ ] 手动测试矩阵：

| 操作 | 节点选中 | 资产选中 |
|------|----------|----------|
| 点层级节点 | 显示 NodeInspector | 切到 NodeInspector |
| 点资产 | 切到 AssetInspector | 显示对应 Editor |
| Undo 改名 | - | registry 回滚 |
| 删除导入贴图 | - | 清 emitter refs |

- [ ] 更新 `docs/DEVELOPMENT-PLAN-v2.md` Phase 3.5 条目

---

## 选中优先级规则（实现约定）

```
末次点击 wins：
  点资产 → inspectorTarget = { kind: 'asset', assetId }
  点节点 → inspectorTarget = { kind: 'node', nodeId }
  点空白（层级/资产）→ 不清空，保持上次（或 Phase 4 可选清空）

fallback：
  inspectorTarget 为 null 且有 selectedNodeId → 显示 NodeInspector
```

---

## 风险与决策

| 项 | 决策 |
|----|------|
| 内置资产能否直接改 | 否；走「复制到项目」 |
| 贴图 data URL 体积 | v1 保持；v2 导入时落盘 `assets/textures/` |
| Shader 双编辑器 | v1 属性面板 CodeMirror；中心 Shader 工作区做深度编辑，共享 draft store |
| 模型真实文件 | v1 仅 builtin 几何预览；导入 mesh 单列 Phase 5 |

---

## 建议实施顺序与工期（估算）

| Phase | 内容 | 估时 |
|-------|------|------|
| 1 | 全局属性路由 + 浏览器去重 | 0.5–1 天 |
| 2 | Store CRUD + 通用操作条 | 0.5 天 |
| 3 | 五类 AssetEditor | 1.5–2 天 |
| 4 | Polish + 测试 | 0.5 天 |

**合计：约 3–4 天**

---

## 执行选项

Plan 已保存至 `docs/superpowers/plans/2026-07-23-global-properties-panel.md`。

**1. Subagent-Driven（推荐）** — 按 Task 分派子 agent，每 Task 完成后 review  
**2. Inline Execution** — 本会话按 Phase 连续实现，Phase 1 完成后 checkpoint

请告知从 **Phase 1** 开始 inline 实现，或指定先做某一 Phase。
