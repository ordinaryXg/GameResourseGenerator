# FX Studio 用户指南（v2.0）

| 字段 | 内容 |
|------|------|
| 版本 | v2.0 |
| 最后更新 | 2026-07-23 |
| 关联 | [README](../README.md) · [MIGRATION-v1.md](./MIGRATION-v1.md) |

---

## 1. 快速上手

### 1.1 启动与新建

1. 启动 FX Studio（Web：`npm run dev` / 桌面：`npm run electron:build` 产物）
2. 在启动页选择：
   - **新建空项目** — 从单个发射器开始
   - **组合预设** — 爆炸 / 魔法 / 环境等多发射器项目
   - **打开 `.fxproj`** — 继续已有工作

### 1.2 界面布局

| 区域 | 作用 |
|------|------|
| 左栏 · 层级树 | 组 / 发射器 / 模块；拖拽 reparent |
| 中央 · 预览 / 节点图 | 实时 WebGL 预览 |
| 右栏 · 属性 | 选中节点或资产的参数 |
| 底栏 · 资产浏览器 | 内置库 + 项目贴图 |
| 工具栏 | 文件、撤销、导入、导出、AI |

---

## 2. 组合特效工作流

1. 在层级树 **+ 发射器** / **+ 组** 组织特效结构
2. 选中发射器 → 右侧编辑 **Transform** 与 **11 个粒子模块**
3. 在资产浏览器选贴图 → 拖到 **Main Texture** 槽位，或右侧属性面板编辑
4. 预览区同屏播放所有可见发射器；**Solo** 可只看单个
5. **Ctrl+Z / Ctrl+Y** 撤销重做（含树操作与参数）

---

## 3. 资产与导入

- **内置库**：只读，可复制到项目后修改
- **导入贴图**：工具栏「导入贴图」→ 已保存项目会落盘到 `assets/textures/`
- **引用槽**：Main Texture / Material / Mesh（Mesh 渲染 v2.2 完整支持）

---

## 4. 导出到 Cocos Creator 3.8

1. 工具栏 **导出**（或 `Ctrl+E`）
2. 选择 Cocos 项目根目录
3. 查看 **导出资产清单**（Prefab + 贴图 + 材质）
4. 点击导出 → 文件写入 `assets/effects/{projectId}/`
5. 在 Cocos 中将 prefab 拖入场景验证

---

## 5. AI 助手（可选）

- 默认隐藏；工具栏 Toggle 打开
- **须先在层级树选中一个发射器**，AI 才会更新该发射器
- Demo 模式关键词：火焰、雪花、下雨、魔法、爆炸等
- 配置 API Key 后可使用 LLM 模式（Electron）

---

## 6. 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z / Ctrl+Y | 撤销 / 重做 |
| Ctrl+S | 保存项目（Electron） |
| Ctrl+E | 导出 |
| Ctrl+T | 组合预设 |
| Ctrl+, | 设置 |
| Space | 播放 / 暂停预览 |
| Esc | 关闭弹窗 / 清空属性选中 |

---

## 7. 项目文件

- 格式：**`.fxproj`**（JSON）
- 内容：层级树 + `assetRegistry` + 设置
- 自动保存：每 30 秒 localStorage 备份（非版本历史）

---

## 8. 常见问题

**Q：导出后在 Cocos 不显示贴图？**  
A：确认导出清单中含 png/mtl；检查 Cocos 是否刷新资源。

**Q：AI 提示先选中发射器？**  
A：在层级树点击 ✨ 发射器节点后再发送。

**Q：v1 Session 数据在哪？**  
A：见 [MIGRATION-v1.md](./MIGRATION-v1.md)。

---

## 9. 相关文档

- [E2E-SMOKE.md](./E2E-SMOKE.md) — 发布前冒烟清单
- [PRD-v2.md](./PRD-v2.md) — 功能需求
- [DEVELOPMENT-PLAN-v2.md](./DEVELOPMENT-PLAN-v2.md) — 开发进度
