export const i18n = {
  zh: {
    app: { title: 'Cocos AI 特效生成器', new: '+ 新建', import: '📥 导入', save: '💾 保存', templates: '📁 模板库', export: '📤 导出', settings: '⚙', preview: '预览', back: '← 返回编辑器' },
    chat: { title: '🤖 AI 对话', demoMode: 'Demo 模式', placeholder: '描述你想要的特效，如「火焰特效」「雪花飘落」...', send: '发送', generating: '正在生成...' },
    inspector: { title: '📋 属性检查器', main: '主模块', shape: '发射器形状', color: '颜色随生命周期', size: '大小随生命周期', rotation: '旋转随生命周期', velocity: '速度随生命周期', noise: '噪声模块', trail: '拖尾模块', texAnim: '纹理动画', bursts: '爆发式发射', renderer: '渲染器' },
    preview: { play: '▶ 播放', pause: '⏸ 暂停', reset: '↺ 重置', webglError: '⚠ WebGL 预览在此环境不可用' },
    export: { title: '📤 导出', engine: '目标引擎', compat: '兼容性报告', path: '项目路径', select: '📁 选择', exportBtn: '导出', success: '导出成功' },
    settings: { title: '⚙ 设置', apiKey: 'API Key', configured: '🟢 已配置', model: 'AI 模型', temperature: 'Temperature', maxTokens: 'Max Tokens', save: '保存', cancel: '取消' },
    status: { ready: '就绪', generating: '生成中...' },
    session: { title: '📁 特效会话', new: '+ 新建', search: '🔍 搜索会话...', rename: '重命名', duplicate: '复制', delete: '删除' },
    animation: { title: '🎯 动画编辑器', play: '▶ 播放', pause: '⏸ 暂停', reset: '↺ 重置', template: '模板...', duration: '时长', easing: '缓动' }
  },
  en: {
    app: { title: 'Cocos AI Effect Generator', new: '+ New', import: '📥 Import', save: '💾 Save', templates: '📁 Templates', export: '📤 Export', settings: '⚙', preview: 'Preview', back: '← Back' },
    chat: { title: '🤖 AI Chat', demoMode: 'Demo Mode', placeholder: 'Describe the effect you want, e.g. "fire effect"', send: 'Send', generating: 'Generating...' },
    inspector: { title: '📋 Inspector', main: 'Main', shape: 'Shape', color: 'Color', size: 'Size', rotation: 'Rotation', velocity: 'Velocity', noise: 'Noise', trail: 'Trail', texAnim: 'Tex Anim', bursts: 'Bursts', renderer: 'Renderer' },
    preview: { play: '▶ Play', pause: '⏸ Pause', reset: '↺ Reset', webglError: '⚠ WebGL preview unavailable' },
    export: { title: '📤 Export', engine: 'Target Engine', compat: 'Compatibility', path: 'Project Path', select: '📁 Select', exportBtn: 'Export', success: 'Export successful' },
    settings: { title: '⚙ Settings', apiKey: 'API Key', configured: '🟢 Configured', model: 'AI Model', temperature: 'Temperature', maxTokens: 'Max Tokens', save: 'Save', cancel: 'Cancel' },
    status: { ready: 'Ready', generating: 'Generating...' },
    session: { title: '📁 Sessions', new: '+ New', search: '🔍 Search...', rename: 'Rename', duplicate: 'Duplicate', delete: 'Delete' },
    animation: { title: '🎯 Animation Editor', play: '▶ Play', pause: '⏸ Pause', reset: '↺ Reset', template: 'Template...', duration: 'Duration', easing: 'Easing' }
  }
};

export type Lang = 'zh' | 'en';
export type I18nDict = typeof i18n.zh;
