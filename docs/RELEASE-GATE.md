# FX Studio v2.0 发布门禁

| 字段 | 内容 |
|------|------|
| 目标版本 | v2.0 正式版 |
| 最后更新 | 2026-07-23 |
| 手工测试 | [MANUAL-TEST-v2.0.md](./MANUAL-TEST-v2.0.md) |
| 自动化 | `npm run build` · `npm test` · CI |

---

## 门禁清单

| # | 验收项 | 验证方式 | 状态 |
|---|--------|----------|------|
| 1 | 可创建含 3+ Emitter 的组合特效 | E2E A2 · `preset-projects.test` | ✅ 手工 2026-07-23 |
| 2 | 层级树拖拽 reparent + Undo | E2E A3 · `project-history.test` | ✅ |
| 3 | 内置贴图 ≥10 张 | `builtin-assets-files.test` | ✅ |
| 4 | Inspector 换贴图预览 <1s | E2E A4 | ✅ 手工 2026-07-23 |
| 5 | 多 ParticleSystem Cocos 导出 | `export-composite.test` · E2E A6 | ✅ 单测 · ⚠️ 朝向见 BUG-003 |
| 6 | 多节点 prefab 导入 | `prefab-importer.test` · E2E C1 | ⚠️ 单测 ✅ · **手工 C1 失败**（BUG-001） |
| 7 | 无历史 Tab；Ctrl+Z/Y | 手工 · `project-history.test` | ✅ 手工 #20 |
| 8 | AI 可隐藏且全流程可用 | E2E B1 | ✅ 手工 2026-07-23 |
| 9 | v1 Session 迁移 | `migrate-v1.test` · E2E D1 | ⏭ 未测 |
| 10 | build + vitest 全通过 | CI / 本地 | ✅ |

---

## 非功能门禁

| 指标 | 目标 | 验证 | 状态 |
|------|------|------|------|
| 组合爆炸搭建 | <15 分钟 | 内部走查 | ✅ 2026-07-23 |
| 预览帧率 | ≥30 FPS（5×200） | E2E P1 · `preview-performance.test` | ⏭ 无 FPS UI，未观测 |
| 内置库体积 | <5MB | 手工 du | ✅ **55 KB** |

---

## 发版判定

| 判定 | 说明 |
|------|------|
| **⚠️ 有条件通过** | 新建→编辑→导出主路径已验收；**Round-trip 导入（#6）阻塞正式签核** |

---

## 签核

| 角色 | 姓名 | 日期 | 签字 |
|------|------|------|------|
| 开发 | | 2026-07-23 | ☐ 待 BUG-001 修复 |
| 产品 | | 2026-07-23 | ☐ |
