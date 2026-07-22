import React, { useState, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import type { Particle3DConfig, RangeValue, ShapeType, RenderMode, GradientConfig } from '@/types/effect';

interface SectionProps {
  title: string;
  enabled?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, enabled, onToggle, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      borderBottom: '1px solid var(--border-color)',
      background: enabled === false ? 'var(--bg-secondary)' : 'transparent',
      opacity: enabled === false ? 0.6 : 1
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          userSelect: 'none'
        }}
        onClick={() => setOpen(!open)}
      >
        <span>{open ? '▼' : '▶'} {title}</span>
        {onToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              background: enabled ? 'var(--success)' : 'var(--bg-tertiary)',
              borderColor: enabled ? 'var(--success)' : 'var(--border-color)',
              color: enabled ? '#fff' : 'var(--text-secondary)'
            }}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        )}
      </div>
      {open && <div style={{ padding: '4px 12px 12px' }}>{children}</div>}
    </div>
  );
};

const RangeInput: React.FC<{
  label: string;
  value: RangeValue;
  onChange: (v: RangeValue) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, min = 0, max = 100, step = 0.1 }) => (
  <div style={{ marginBottom: 6 }}>
    <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>{label}</label>
    <input
      type="number"
      value={value.constant ?? 0}
      onChange={(e) => onChange({ ...value, constant: parseFloat(e.target.value) || 0 })}
      min={min}
      max={max}
      step={step}
      style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
    />
  </div>
);

export const InspectorPanel: React.FC = () => {
  const { currentEffect, updateEffectConfig } = useSessionStore();
  const config = currentEffect?.config as Particle3DConfig | undefined;

  const updateMain = useCallback((updates: Partial<Particle3DConfig['mainModule']>) => {
    updateEffectConfig((prev) => ({
      ...prev,
      config: {
        ...prev.config as Particle3DConfig,
        mainModule: { ...(prev.config as Particle3DConfig).mainModule, ...updates }
      }
    }));
  }, [updateEffectConfig]);

  const toggleModule = useCallback((moduleKey: string) => {
    updateEffectConfig((prev) => {
      const cfg = prev.config as Particle3DConfig;
      const module = cfg[moduleKey as keyof Particle3DConfig] as any;
      return {
        ...prev,
        config: {
          ...cfg,
          [moduleKey]: { ...module, enabled: !module.enabled }
        }
      };
    });
  }, [updateEffectConfig]);

  const updateModule = useCallback((moduleKey: string, updates: Record<string, any>) => {
    updateEffectConfig((prev) => {
      const cfg = prev.config as Particle3DConfig;
      const module = cfg[moduleKey as keyof Particle3DConfig] as any;
      return {
        ...prev,
        config: {
          ...cfg,
          [moduleKey]: { ...module, ...updates }
        }
      };
    });
  }, [updateEffectConfig]);

  if (!currentEffect || !config) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)',
        fontSize: 14,
        padding: 16
      }}>
        选择一个特效以查看属性
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        fontWeight: 600,
        fontSize: 14
      }}>
        📋 属性检查器
      </div>

      {/* Main Module */}
      <Section title="主模块" defaultOpen={true}>
        <RangeInput label="运行时长 (秒)" value={config.mainModule.startLifetime}
          onChange={(v) => updateMain({ startLifetime: v })} min={0.01} max={60} />
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>最大粒子数</label>
          <input type="number" value={config.mainModule.capacity}
            onChange={(e) => updateMain({ capacity: parseInt(e.target.value) || 1 })}
            min={1} max={10000} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <RangeInput label="初始速度" value={config.mainModule.startSpeed}
          onChange={(v) => updateMain({ startSpeed: v })} min={0} max={100} />
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>每秒发射数</label>
          <input type="number" value={config.mainModule.rateOverTime}
            onChange={(e) => updateMain({ rateOverTime: parseInt(e.target.value) || 0 })}
            min={0} max={1000} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>重力系数</label>
          <input type="number" value={config.mainModule.gravityModifier}
            onChange={(e) => updateMain({ gravityModifier: parseFloat(e.target.value) || 0 })}
            min={-10} max={10} step={0.1} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12 }}>循环播放</label>
          <input type="checkbox" checked={config.mainModule.loop}
            onChange={(e) => updateMain({ loop: e.target.checked })} />
        </div>
      </Section>

      {/* Shape Module */}
      <Section
        title="发射器形状"
        enabled={config.shapeModule.enabled}
        onToggle={() => toggleModule('shapeModule')}
      >
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>形状类型</label>
          <select value={config.shapeModule.shapeType}
            onChange={(e) => {
              updateEffectConfig((prev) => ({
                ...prev,
                config: {
                  ...prev.config as Particle3DConfig,
                  shapeModule: { ...(prev.config as Particle3DConfig).shapeModule, shapeType: e.target.value as ShapeType }
                }
              }));
            }}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
          >
            <option value="cone">锥形 (Cone)</option>
            <option value="sphere">球形 (Sphere)</option>
            <option value="hemisphere">半球形 (Hemisphere)</option>
            <option value="box">盒形 (Box)</option>
            <option value="circle">圆形 (Circle)</option>
          </select>
        </div>
        <RangeInput label="半径" value={{ mode: 'constant', constant: config.shapeModule.radius }}
          onChange={(v) => {
            updateEffectConfig((prev) => ({
              ...prev,
              config: {
                ...prev.config as Particle3DConfig,
                shapeModule: { ...(prev.config as Particle3DConfig).shapeModule, radius: v.constant ?? 1 }
              }
            }));
          }} min={0.01} max={100} />
        <RangeInput label="角度" value={{ mode: 'constant', constant: config.shapeModule.angle }}
          onChange={(v) => {
            updateEffectConfig((prev) => ({
              ...prev,
              config: {
                ...prev.config as Particle3DConfig,
                shapeModule: { ...(prev.config as Particle3DConfig).shapeModule, angle: v.constant ?? 25 }
              }
            }));
          }} min={0} max={90} />
      </Section>

      {/* Color Over Lifetime */}
      <Section
        title="颜色随生命周期"
        enabled={config.colorOverLifetime.enabled}
        onToggle={() => toggleModule('colorOverLifetime')}
      >
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          颜色渐变：{config.colorOverLifetime.color.keys.length} 个关键帧
        </div>
      </Section>

      {/* Size Over Lifetime */}
      <Section
        title="大小随生命周期"
        enabled={config.sizeOverLifetime.enabled}
        onToggle={() => toggleModule('sizeOverLifetime')}
      >
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          大小曲线：{config.sizeOverLifetime.size.keys.length} 个关键帧
        </div>
      </Section>

      {/* Rotation Over Lifetime */}
      <Section
        title="旋转随生命周期"
        enabled={config.rotationOverLifetime.enabled}
        onToggle={() => toggleModule('rotationOverLifetime')}
      >
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          旋转曲线：{config.rotationOverLifetime.rotation.keys.length} 个关键帧
        </div>
      </Section>

      {/* Velocity Over Lifetime */}
      <Section
        title="速度随生命周期"
        enabled={config.velocityOverLifetime.enabled}
        onToggle={() => toggleModule('velocityOverLifetime')}
        defaultOpen={false}
      >
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          速度曲线 X/Y/Z 各 {config.velocityOverLifetime.velocityX.keys.length} 个关键帧
        </div>
      </Section>

      {/* Noise Module */}
      <Section
        title="噪声模块"
        enabled={config.noiseModule.enabled}
        onToggle={() => toggleModule('noiseModule')}
        defaultOpen={false}
      >
        <RangeInput label="强度" value={{ mode: 'constant', constant: config.noiseModule.strength }}
          onChange={(v) => updateModule('noiseModule', { strength: v.constant ?? 10 })} min={0} max={100} />
        <RangeInput label="频率" value={{ mode: 'constant', constant: config.noiseModule.frequency }}
          onChange={(v) => updateModule('noiseModule', { frequency: v.constant ?? 1 })} min={0} max={10} />
        <RangeInput label="滚动速度" value={{ mode: 'constant', constant: config.noiseModule.scrollSpeed }}
          onChange={(v) => updateModule('noiseModule', { scrollSpeed: v.constant ?? 1 })} min={0} max={10} />
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>八度数</label>
          <input type="number" value={config.noiseModule.octaves}
            onChange={(e) => updateModule('noiseModule', { octaves: parseInt(e.target.value) || 1 })}
            min={1} max={4} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
      </Section>

      {/* Trail Module */}
      <Section
        title="拖尾模块"
        enabled={config.trailModule.enabled}
        onToggle={() => toggleModule('trailModule')}
        defaultOpen={false}
      >
        <RangeInput label="比率" value={{ mode: 'constant', constant: config.trailModule.ratio }}
          onChange={(v) => updateModule('trailModule', { ratio: v.constant ?? 1 })} min={0} max={1} />
        <RangeInput label="生命周期" value={config.trailModule.lifetime}
          onChange={(v) => updateModule('trailModule', { lifetime: v })} min={0.01} max={10} />
      </Section>

      {/* Texture Animation */}
      <Section
        title="纹理动画"
        enabled={config.textureAnimation.enabled}
        onToggle={() => toggleModule('textureAnimation')}
        defaultOpen={false}
      >
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>横向分块数</label>
          <input type="number" value={config.textureAnimation.numTilesX}
            onChange={(e) => updateModule('textureAnimation', { numTilesX: parseInt(e.target.value) || 1 })}
            min={1} max={16} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>纵向分块数</label>
          <input type="number" value={config.textureAnimation.numTilesY}
            onChange={(e) => updateModule('textureAnimation', { numTilesY: parseInt(e.target.value) || 1 })}
            min={1} max={16} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
      </Section>

      {/* Bursts */}
      <Section title="爆发式发射 (Bursts)" defaultOpen={false}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
          爆发数：{config.mainModule.bursts.length} 个
        </div>
        {config.mainModule.bursts.map((burst, i) => (
          <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
            t={burst.time}s, count={burst.count}, cycles={burst.cycles ?? 1}
          </div>
        ))}
        <button
          onClick={() => {
            const newBursts = [...config.mainModule.bursts, { time: 0, count: 50 }];
            updateEffectConfig((prev) => ({
              ...prev,
              config: {
                ...prev.config as Particle3DConfig,
                mainModule: { ...(prev.config as Particle3DConfig).mainModule, bursts: newBursts }
              }
            }));
          }}
          style={{ fontSize: 11, marginTop: 4 }}
        >+ 添加爆发</button>
      </Section>

      {/* Renderer */}
      <Section title="渲染器">
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>渲染模式</label>
          <select value={config.rendererModule.renderMode}
            onChange={(e) => {
              updateEffectConfig((prev) => ({
                ...prev,
                config: {
                  ...prev.config as Particle3DConfig,
                  rendererModule: { ...(prev.config as Particle3DConfig).rendererModule, renderMode: e.target.value as RenderMode }
                }
              }));
            }}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
          >
            <option value="billboard">公告板 (Billboard)</option>
            <option value="stretchedBillboard">拉伸公告板 (Stretched)</option>
            <option value="mesh">网格 (Mesh)</option>
          </select>
        </div>
      </Section>
    </div>
  );
};
