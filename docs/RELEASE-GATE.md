# FX Studio v2.0 发布门禁

| 字段 | 内容 |
|------|------|
| 目标版本 | v2.0 正式版 |
| 最后更新 | 2026-07-23 |
| 自动化 | `npm run build` · `npm test` · CI |

---

## 门禁清单

| # | 验收项 | 验证方式 | 状态 |
|---|--------|----------|------|
| 1 | 可创建含 3+ Emitter 的组合特效 | E2E A2 · `preset-projects.test` | ☐ 手工 E2E |
| 2 | 层级树拖拽 reparent + Undo | E2E A3 · `project-history.test` | ✅ 自动化 |
| 3 | 内置贴图 ≥10 张 | `builtin-assets-files.test` | ✅ |
| 4 | Inspector 换贴图预览 <1s | E2E A4 | ☐ 手工 E2E |
| 5 | 多 ParticleSystem Cocos 导出 | `export-composite.test` · E2E A6 | ✅ 自动化 |
| 6 | 多节点 prefab 导入 | `prefab-importer.test` · E2E C1 | ✅ 自动化 |
| 7 | 无历史 Tab；Ctrl+Z/Y | 手工 · `project-history.test` | ✅ 自动化 |
| 8 | AI 可隐藏且全流程可用 | E2E B1 | ☐ 手工 E2E |
| 9 | v1 Session 迁移 | `migrate-v1.test` · E2E D1 | ✅ 自动化 |
| 10 | build + vitest 全通过 | CI / 本地 | ✅ |

---

## 非功能门禁

| 指标 | 目标 | 验证 | 状态 |
|------|------|------|------|
| 组合爆炸搭建 | <15 分钟 | 内部走查 | ☐ |
| 预览帧率 | ≥30 FPS（5×200） | E2E P1 · `preview-performance.test` | ✅ |
| 内置库体积 | <5MB | 手工 du | ☐ |

---

## 自动化测试覆盖（vitest）

以下项由 CI 自动验证，合并前须全绿：

- `project-io` / `migrate-v1` / `project-history`
- `export-pipeline` / `export-composite` / `export-manifest`
- `prefab-importer` / `asset-*`
- `preview-performance` / `preset-projects`

---

## 签核

| 角色 | 姓名 | 日期 | 签字 |
|------|------|------|------|
| 开发 | | 2026-07-23 | ☐ |
| 产品 | | | ☐ |
