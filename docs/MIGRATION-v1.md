# v1 Session → v2 项目迁移说明

| 字段 | 内容 |
|------|------|
| 适用版本 | FX Studio v1.x → v2.0 |
| 最后更新 | 2026-07-23 |

---

## 背景

v1.x 使用浏览器 **localStorage** 存储多个 **Session**（每个 Session 一个粒子系统）。  
v2.0 改为 **`.fxproj` 项目文件**，支持多发射器组合与资产注册表。

---

## 自动迁移（推荐）

1. 启动 FX Studio v2.0
2. 若检测到 v1 Session，启动页显示 **「迁移 N 个 v1 会话」**
3. 点击迁移：
   - **1 个 Session** → 转为单发射器 `.fxproj` 内存项目
   - **多个 Session** → 合并为同一项目的多个发射器
4. 迁移后 v1 数据归档，不再出现在 v1 列表

---

## 迁移内容

| v1 | v2 |
|----|-----|
| Session 名称 | 项目名 / 发射器名 |
| `EffectConfig` | `ParticleEmitterNode.config` |
| 节点布局 | `emitter.nodeLayout` |
| 对话消息 | 保留在 project-store（可选） |
| 版本历史 | **不迁移** — 请用 Undo/Redo |

---

## 手动验证

迁移完成后请检查：

- [ ] 粒子参数与预览一致
- [ ] 保存为 `.fxproj` 后可重新打开
- [ ] 导出 Cocos prefab 可播放

自动化：`tests/migrate-v1.test.ts`

---

## 无法迁移的情况

- 损坏的 localStorage JSON → 启动页不显示迁移按钮
- 自定义 v1 数据结构 → 需手动在新项目中重建

---

## 相关 API

- `src/utils/migrate-v1.ts` — `migrateSessionToProject`, `createCombinedMigrationProject`
- `ProjectWelcome.tsx` — 首次启动检测与引导
