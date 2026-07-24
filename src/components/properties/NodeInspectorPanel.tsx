import React, { useState, useCallback, useEffect, useRef } from 'react';
import { coerceRangeValue } from '@/utils/particle-size';
import { useProjectStore } from '@/stores/project-store';
import { useAppStore } from '@/stores/app-store';
import type { Particle3DConfig, RangeValue, ShapeType, RenderMode, BurstConfig, Vector3Range } from '@/types/effect';
import { GradientEditor } from '../inspector/GradientEditor';
import { CurveEditor } from '../inspector/CurveEditor';
import { TransformSection } from '../inspector/TransformSection';
import { AssetSlot } from '../inspector/AssetSlot';
import { findNodeById } from '@/utils/project-tree';
import { isEmitterNode, isGroupNode } from '@/types/project';
import { DEFAULT_TEXTURE_ASSET_ID, DEFAULT_MATERIAL_ASSET_ID } from '@/data/builtin-assets';

interface SectionProps {
  id?: string;
  title: string;
  enabled?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
  highlighted?: boolean;
}

const Section: React.FC<SectionProps> = ({
  id, title, enabled, onToggle, children, defaultOpen = true, highlighted = false
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) {
      setOpen(true);
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlighted]);

  return (
    <div
      ref={ref}
      id={id}
      style={{
        borderBottom: '1px solid var(--border-color)',
        background: highlighted ? 'rgba(88,166,255,0.08)' : enabled === false ? 'var(--bg-secondary)' : 'transparent',
        opacity: enabled === false ? 0.6 : 1
      }}
    >
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

const Vector3RangeInput: React.FC<{
  label: string;
  value: Vector3Range | undefined;
  onChange: (v: Vector3Range) => void;
  min?: number;
  max?: number;
  step?: number;
  fallback?: [number, number, number];
}> = ({ label, value, onChange, min = 0, max = 100, step = 0.1, fallback = [0, 0, 0] }) => {
  const axes = ['x', 'y', 'z'] as const;
  const current: Vector3Range = value ?? {
    x: { mode: 'constant', constant: fallback[0] },
    y: { mode: 'constant', constant: fallback[1] },
    z: { mode: 'constant', constant: fallback[2] }
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {axes.map((axis, i) => (
          <div key={axis}>
            <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
              {axis.toUpperCase()}
            </label>
            <input
              type="number"
              value={coerceRangeValue(current[axis], fallback[i]).constant ?? 0}
              onChange={(e) => onChange({
                ...current,
                [axis]: { ...coerceRangeValue(current[axis], fallback[i]), constant: parseFloat(e.target.value) || 0 }
              })}
              min={min}
              max={max}
              step={step}
              style={{ width: '100%', padding: '4px 6px', fontSize: 12 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const NodeInspectorPanel: React.FC = () => {
  const {
    project, selectedNodeId, currentEffect, updateEffectConfig,
    updateNodeTransform, setNodeEnabled, updateEmitterAssetRefs
  } = useProjectStore();
  const { selectedModuleKey } = useAppStore();
  const config = currentEffect?.config as Particle3DConfig | undefined;
  const selectedNode = project && selectedNodeId ? findNodeById(project.root, selectedNodeId) : null;

  const updateMain = useCallback((updates: Partial<Particle3DConfig['mainModule']>) => {
    updateEffectConfig((prev) => ({
      ...prev,
      config: {
        ...prev.config as Particle3DConfig,
        mainModule: { ...(prev.config as Particle3DConfig).mainModule, ...updates }
      }
    }));
  }, [updateEffectConfig]);

  const updateBursts = useCallback((bursts: BurstConfig[]) => {
    updateEffectConfig((prev) => ({
      ...prev,
      config: {
        ...prev.config as Particle3DConfig,
        mainModule: { ...(prev.config as Particle3DConfig).mainModule, bursts }
      }
    }));
  }, [updateEffectConfig]);

  const updateBurstAt = useCallback((index: number, patch: Partial<BurstConfig>) => {
    if (!config) return;
    const bursts = config.mainModule.bursts.map((b, i) => i === index ? { ...b, ...patch } : b);
    updateBursts(bursts);
  }, [config, updateBursts]);

  const removeBurstAt = useCallback((index: number) => {
    if (!config) return;
    updateBursts(config.mainModule.bursts.filter((_, i) => i !== index));
  }, [config, updateBursts]);

  const toggleModule = useCallback((moduleKey: string) => {
    updateEffectConfig((prev) => {
      const cfg = prev.config as Particle3DConfig;
      const module = cfg[moduleKey as keyof Particle3DConfig] as { enabled?: boolean };
      return {
        ...prev,
        config: {
          ...cfg,
          [moduleKey]: { ...module, enabled: !module.enabled }
        }
      };
    });
  }, [updateEffectConfig]);

  const updateModule = useCallback((moduleKey: string, updates: Record<string, unknown>) => {
    updateEffectConfig((prev) => {
      const cfg = prev.config as Particle3DConfig;
      const module = cfg[moduleKey as keyof Particle3DConfig] as unknown as Record<string, unknown> & { enabled?: boolean };
      return {
        ...prev,
        config: {
          ...cfg,
          [moduleKey]: { ...module, ...updates }
        }
      };
    });
  }, [updateEffectConfig]);

  if (!project || !selectedNode) {
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
        在层级树中选择一个节点
      </div>
    );
  }

  const isEmitter = isEmitterNode(selectedNode);

  if (!isEmitter || !currentEffect || !config) {
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        <Section title="变换 (Transform)" defaultOpen>
          <TransformSection
            transform={selectedNode.transform}
            onChange={(patch) => selectedNodeId && updateNodeTransform(selectedNodeId, patch)}
          />
        </Section>
        {isGroupNode(selectedNode) && (
          <Section title="组" defaultOpen={false}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedNode.enabled}
                onChange={(e) => selectedNodeId && setNodeEnabled(selectedNodeId, e.target.checked)}
              />
              启用组及其子节点
            </label>
          </Section>
        )}
      </div>
    );
  }

  const isHighlighted = (key: string) => selectedModuleKey === key;

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>

      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
          background: selectedNode.enabled ? 'transparent' : 'var(--bg-secondary)',
          opacity: selectedNode.enabled ? 1 : 0.8
        }}
      >
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedNode.enabled}
            onChange={(e) => selectedNodeId && setNodeEnabled(selectedNodeId, e.target.checked)}
          />
          节点激活 (Node Active)
        </label>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45, paddingLeft: 22 }}>
          控制整颗 ParticleSystem 是否参与预览与导出（对应 Cocos Node.active）。
          关闭等同层级树「隐藏」；与各粒子模块标题栏 ON/OFF 无关。
        </div>
      </div>

      <Section title="变换 (Transform)" defaultOpen>
        <TransformSection
          transform={selectedNode.transform}
          onChange={(patch) => selectedNodeId && updateNodeTransform(selectedNodeId, patch)}
        />
      </Section>

      <Section id="section-mainModule" title="主模块" highlighted={isHighlighted('mainModule')}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8 }}>
          与 Cocos 主模块对齐；当前 UI 编辑常数值，曲线/随机区间可通过导入保留。
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>系统时长 (Duration)</label>
          <input type="number" value={config.mainModule.duration}
            onChange={(e) => updateMain({ duration: parseFloat(e.target.value) || 1 })}
            min={0.1} max={120} step={0.1} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>最大粒子数 (Capacity)</label>
          <input type="number" value={config.mainModule.capacity}
            onChange={(e) => updateMain({ capacity: parseInt(e.target.value) || 1 })}
            min={1} max={10000} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={config.mainModule.loop}
              onChange={(e) => updateMain({ loop: e.target.checked })} />
            循环 (Loop)
          </label>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={config.mainModule.playOnAwake ?? true}
              onChange={(e) => updateMain({ playOnAwake: e.target.checked })} />
            唤醒时播放 (PlayOnAwake)
          </label>
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>模拟速度 (SimulationSpeed)</label>
          <input type="number" value={config.mainModule.simulationSpeed ?? 1}
            onChange={(e) => updateMain({ simulationSpeed: parseFloat(e.target.value) || 0 })}
            min={0} max={10} step={0.1} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>开始延迟 (StartDelay, 秒)</label>
          <input type="number" value={config.mainModule.startDelay ?? 0}
            onChange={(e) => updateMain({ startDelay: parseFloat(e.target.value) || 0 })}
            min={0} max={120} step={0.01} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <RangeInput label="粒子寿命 (StartLifetime, 秒)" value={config.mainModule.startLifetime}
          onChange={(v) => updateMain({ startLifetime: v })} min={0.01} max={60} />
        <RangeInput label="初始速度 (StartSpeed)" value={config.mainModule.startSpeed}
          onChange={(v) => updateMain({ startSpeed: v })} min={0} max={100} />
        <Vector3RangeInput
          label="初始大小 (StartSize3D)"
          value={config.mainModule.startSize3D}
          onChange={(v) => updateMain({ startSize3D: v })}
          min={0}
          max={100}
          step={0.1}
          fallback={[1, 1, 1]}
        />
        <Vector3RangeInput
          label="初始旋转 (StartRotation3D, 度)"
          value={config.mainModule.startRotation3D}
          onChange={(v) => updateMain({ startRotation3D: v })}
          min={-360}
          max={360}
          step={1}
          fallback={[0, 0, 0]}
        />
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>每秒发射数 (RateOverTime)</label>
          <input type="number" value={config.mainModule.rateOverTime}
            onChange={(e) => updateMain({ rateOverTime: parseInt(e.target.value) || 0 })}
            min={0} max={1000} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>每单位距离发射数 (RateOverDistance)</label>
          <input type="number" value={config.mainModule.rateOverDistance ?? 0}
            onChange={(e) => updateMain({ rateOverDistance: parseFloat(e.target.value) || 0 })}
            min={0} max={1000} step={0.1} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>重力系数 (GravityModifier)</label>
          <input type="number" value={config.mainModule.gravityModifier}
            onChange={(e) => updateMain({ gravityModifier: parseFloat(e.target.value) || 0 })}
            min={-10} max={10} step={0.1} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>初始颜色 (StartColor)</label>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
            与「颜色随生命周期」相乘；通常保持白色，仅在生命周期模块中编辑渐变。
          </div>
          <GradientEditor
            value={config.mainModule.startColor}
            onChange={(v) => updateMain({ startColor: v })}
          />
        </div>
      </Section>

      <Section
        id="section-shapeModule"
        title="发射器形状"
        enabled={config.shapeModule.enabled}
        onToggle={() => toggleModule('shapeModule')}
        highlighted={isHighlighted('shapeModule')}
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
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>发射位置 (Emit From)</label>
          <select
            value={config.shapeModule.emitFrom}
            onChange={(e) => updateModule('shapeModule', { emitFrom: e.target.value })}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
          >
            <option value="base">底面 (Base)</option>
            <option value="edge">边缘 (Edge)</option>
            <option value="shell">外壳 (Shell)</option>
            <option value="volume">体积 (Volume)</option>
          </select>
        </div>
        <RangeInput label="半径 (Radius)" value={{ mode: 'constant', constant: config.shapeModule.radius }}
          onChange={(v) => updateModule('shapeModule', { radius: v.constant ?? 1 })} min={0.01} max={100} />
        <RangeInput label="半径厚度 (Radius Thickness)" value={{ mode: 'constant', constant: config.shapeModule.radiusThickness ?? 1 }}
          onChange={(v) => updateModule('shapeModule', { radiusThickness: v.constant ?? 1 })} min={0} max={1} step={0.01} />
        {(config.shapeModule.shapeType === 'cone') && (
          <>
            <RangeInput label="张角 (Angle)" value={{ mode: 'constant', constant: config.shapeModule.angle }}
              onChange={(v) => updateModule('shapeModule', { angle: v.constant ?? 25 })} min={0} max={90} />
            <RangeInput label="长度 (Length)" value={{ mode: 'constant', constant: config.shapeModule.length ?? 0 }}
              onChange={(v) => updateModule('shapeModule', { length: v.constant ?? 0 })} min={0} max={100} step={0.01} />
          </>
        )}
        {(config.shapeModule.shapeType === 'circle' || config.shapeModule.shapeType === 'cone') && (
          <>
            <RangeInput label="扇形角度 (Arc)" value={{ mode: 'constant', constant: config.shapeModule.arc }}
              onChange={(v) => updateModule('shapeModule', { arc: v.constant ?? 360 })} min={0} max={360} />
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>扇形模式 (Arc Mode)</label>
              <select
                value={config.shapeModule.arcMode ?? 0}
                onChange={(e) => updateModule('shapeModule', { arcMode: parseInt(e.target.value, 10) as 0 | 1 | 2 })}
                style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
              >
                <option value={0}>随机 (Random)</option>
                <option value={1}>循环 (Loop)</option>
                <option value={2}>往返 (PingPong)</option>
              </select>
            </div>
            <RangeInput label="扇形间隔 (Arc Spread)" value={{ mode: 'constant', constant: config.shapeModule.arcSpread ?? 0 }}
              onChange={(v) => updateModule('shapeModule', { arcSpread: v.constant ?? 0 })} min={0} max={1} step={0.01} />
            <RangeInput label="扇形速度 (Arc Speed)" value={coerceRangeValue(config.shapeModule.arcSpeed)}
              onChange={(v) => updateModule('shapeModule', { arcSpeed: v })} min={0} max={10} />
          </>
        )}
        {config.shapeModule.shapeType === 'box' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
              <div key={axis}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>盒厚度 {axis}</label>
                <input type="number" value={config.shapeModule.boxThickness?.[i] ?? 0}
                  onChange={(e) => {
                    const next = [...(config.shapeModule.boxThickness ?? [0, 0, 0])] as [number, number, number];
                    next[i] = parseFloat(e.target.value) || 0;
                    updateModule('shapeModule', { boxThickness: next });
                  }}
                  min={0} step={0.01} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
              </div>
            ))}
          </div>
        )}
        <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={config.shapeModule.alignToDirection ?? false}
            onChange={(e) => updateModule('shapeModule', { alignToDirection: e.target.checked })} />
          对齐方向 (Align To Direction)
        </label>
        <RangeInput label="随机方向量 (Random Direction)" value={{ mode: 'constant', constant: config.shapeModule.randomDirectionAmount ?? 0 }}
          onChange={(v) => updateModule('shapeModule', { randomDirectionAmount: v.constant ?? 0 })} min={0} max={1} step={0.01} />
        <RangeInput label="球形方向量 (Spherical Direction)" value={{ mode: 'constant', constant: config.shapeModule.sphericalDirectionAmount ?? 0 }}
          onChange={(v) => updateModule('shapeModule', { sphericalDirectionAmount: v.constant ?? 0 })} min={0} max={1} step={0.01} />
        <RangeInput label="随机位置量 (Random Position)" value={{ mode: 'constant', constant: config.shapeModule.randomPositionAmount ?? 0 }}
          onChange={(v) => updateModule('shapeModule', { randomPositionAmount: v.constant ?? 0 })} min={0} max={10} step={0.01} />
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '8px 0 4px' }}>形状变换 (Position / Rotation / Scale)</div>
        {(['position', 'rotation', 'scale'] as const).map((field) => (
          <div key={field} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
              <div key={`${field}-${axis}`}>
                <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                  {field === 'position' ? '位置' : field === 'rotation' ? '旋转' : '缩放'} {axis}
                </label>
                <input type="number" value={config.shapeModule[field]?.[i] ?? (field === 'scale' ? 1 : 0)}
                  onChange={(e) => {
                    const next = [...(config.shapeModule[field] ?? (field === 'scale' ? [1, 1, 1] : [0, 0, 0]))] as [number, number, number];
                    next[i] = parseFloat(e.target.value) || 0;
                    updateModule('shapeModule', { [field]: next });
                  }}
                  step={field === 'rotation' ? 1 : 0.01}
                  style={{ width: '100%', padding: '4px 6px', fontSize: 12 }} />
              </div>
            ))}
          </div>
        ))}
      </Section>

      <Section
        id="section-colorOverLifetime"
        title="颜色随生命周期"
        enabled={config.colorOverLifetime.enabled}
        onToggle={() => toggleModule('colorOverLifetime')}
        highlighted={isHighlighted('colorOverLifetime')}
      >
        <GradientEditor
          value={config.colorOverLifetime.color}
          onChange={(v) => updateModule('colorOverLifetime', { color: v })}
        />
      </Section>

      <Section
        id="section-sizeOverLifetime"
        title="大小随生命周期"
        enabled={config.sizeOverLifetime.enabled}
        onToggle={() => toggleModule('sizeOverLifetime')}
        highlighted={isHighlighted('sizeOverLifetime')}
      >
        <CurveEditor
          value={config.sizeOverLifetime.size}
          onChange={(v) => updateModule('sizeOverLifetime', { size: v })}
          min={0}
          max={10}
        />
      </Section>

      <Section
        id="section-rotationOverLifetime"
        title="旋转随生命周期"
        enabled={config.rotationOverLifetime.enabled}
        onToggle={() => toggleModule('rotationOverLifetime')}
        highlighted={isHighlighted('rotationOverLifetime')}
      >
        <CurveEditor
          value={config.rotationOverLifetime.rotation}
          onChange={(v) => updateModule('rotationOverLifetime', { rotation: v })}
          min={-360}
          max={360}
        />
      </Section>

      <Section
        id="section-velocityOverLifetime"
        title="速度随生命周期"
        enabled={config.velocityOverLifetime.enabled}
        onToggle={() => toggleModule('velocityOverLifetime')}
        defaultOpen={false}
        highlighted={isHighlighted('velocityOverLifetime')}
      >
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>X 轴</div>
        <CurveEditor value={config.velocityOverLifetime.velocityX}
          onChange={(v) => updateModule('velocityOverLifetime', { velocityX: v })} min={-50} max={50} />
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 6 }}>Y 轴</div>
        <CurveEditor value={config.velocityOverLifetime.velocityY}
          onChange={(v) => updateModule('velocityOverLifetime', { velocityY: v })} min={-50} max={50} />
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 6 }}>Z 轴</div>
        <CurveEditor value={config.velocityOverLifetime.velocityZ}
          onChange={(v) => updateModule('velocityOverLifetime', { velocityZ: v })} min={-50} max={50} />
      </Section>

      <Section
        id="section-noiseModule"
        title="噪声模块"
        enabled={config.noiseModule.enabled}
        onToggle={() => toggleModule('noiseModule')}
        defaultOpen={false}
        highlighted={isHighlighted('noiseModule')}
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

      <Section
        id="section-trailModule"
        title="拖尾模块"
        enabled={config.trailModule.enabled}
        onToggle={() => toggleModule('trailModule')}
        defaultOpen={false}
        highlighted={isHighlighted('trailModule')}
      >
        <RangeInput label="比率" value={{ mode: 'constant', constant: config.trailModule.ratio }}
          onChange={(v) => updateModule('trailModule', { ratio: v.constant ?? 1 })} min={0} max={1} />
        <RangeInput label="生命周期" value={config.trailModule.lifetime}
          onChange={(v) => updateModule('trailModule', { lifetime: v })} min={0.01} max={10} />
      </Section>

      <Section
        id="section-textureAnimation"
        title="纹理动画"
        enabled={config.textureAnimation.enabled}
        onToggle={() => toggleModule('textureAnimation')}
        defaultOpen={false}
        highlighted={isHighlighted('textureAnimation')}
      >
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>动画模式</label>
          <select
            value={config.textureAnimation.animation}
            onChange={(e) => updateModule('textureAnimation', { animation: parseInt(e.target.value, 10) || 0 })}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
          >
            <option value={0}>整图 (Grid / Whole Sheet)</option>
            <option value={1}>单行 (Single Row)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>横向分块 (Tiles X)</label>
            <input type="number" value={config.textureAnimation.numTilesX}
              onChange={(e) => updateModule('textureAnimation', { numTilesX: parseInt(e.target.value, 10) || 1 })}
              min={1} max={64} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>纵向分块 (Tiles Y)</label>
            <input type="number" value={config.textureAnimation.numTilesY}
              onChange={(e) => updateModule('textureAnimation', { numTilesY: parseInt(e.target.value, 10) || 1 })}
              min={1} max={64} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>帧随生命周期 (Frame Over Time)</div>
        <CurveEditor
          value={config.textureAnimation.frameOverTime}
          onChange={(v) => updateModule('textureAnimation', { frameOverTime: v })}
          min={0}
          max={1}
        />
        <RangeInput
          label="起始帧 (Start Frame)"
          value={coerceRangeValue(config.textureAnimation.startFrame)}
          onChange={(v) => updateModule('textureAnimation', { startFrame: v })}
          min={0}
          max={config.textureAnimation.numTilesX * config.textureAnimation.numTilesY}
        />
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>循环次数 (Cycle Count)</label>
          <input type="number" value={config.textureAnimation.cycleCount}
            onChange={(e) => updateModule('textureAnimation', { cycleCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            min={1} max={64} style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
        </div>
        {config.textureAnimation.animation === 1 && (
          <>
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.textureAnimation.randomRow}
                onChange={(e) => updateModule('textureAnimation', { randomRow: e.target.checked })}
              />
              随机行 (Random Row)
            </label>
            {!config.textureAnimation.randomRow && (
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>行索引 (Row Index)</label>
                <input type="number" value={config.textureAnimation.rowIndex}
                  onChange={(e) => updateModule('textureAnimation', { rowIndex: parseInt(e.target.value, 10) || 0 })}
                  min={0} max={Math.max(0, config.textureAnimation.numTilesY - 1)}
                  style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.textureAnimation.flipU}
              onChange={(e) => updateModule('textureAnimation', { flipU: e.target.checked })}
            />
            翻转 U
          </label>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.textureAnimation.flipV}
              onChange={(e) => updateModule('textureAnimation', { flipV: e.target.checked })}
            />
            翻转 V
          </label>
        </div>
      </Section>

      <Section
        id="section-burstModule"
        title="爆发喷射"
        defaultOpen={config.mainModule.bursts.length > 0}
        highlighted={isHighlighted('burstModule')}
      >
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {config.mainModule.bursts.length === 0 ? '暂无爆发事件，点击下方添加' : `共 ${config.mainModule.bursts.length} 个爆发事件`}
        </div>
        {config.mainModule.bursts.map((burst, i) => (
          <div key={i} style={{
            border: '1px solid var(--border-color)', borderRadius: 6,
            padding: 8, marginBottom: 8, background: 'var(--bg-secondary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>爆发 #{i + 1}</span>
              <button className="btn-sm" onClick={() => removeBurstAt(i)} style={{ color: 'var(--error)', fontSize: 11 }}>
                删除
              </button>
            </div>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>触发时间 (秒)</label>
              <input type="number" value={burst.time} min={0} step={0.01}
                onChange={(e) => updateBurstAt(i, { time: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
            </div>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>粒子数量</label>
              <input type="number" value={burst.count} min={1} max={10000}
                onChange={(e) => updateBurstAt(i, { count: parseInt(e.target.value) || 1 })}
                style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>重复次数</label>
                <input type="number" value={burst.cycles ?? 1} min={1} max={100}
                  onChange={(e) => updateBurstAt(i, { cycles: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>间隔 (秒)</label>
                <input type="number" value={burst.interval ?? 1} min={0} step={0.1}
                  onChange={(e) => updateBurstAt(i, { interval: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
              </div>
            </div>
          </div>
        ))}
        <button
          className="btn-sm"
          onClick={() => updateBursts([...config.mainModule.bursts, { time: 0, count: 50, cycles: 1, interval: 1 }])}
          style={{ fontSize: 11, marginTop: 4 }}
        >+ 添加爆发</button>
      </Section>

      <Section
        id="section-rendererModule"
        title="渲染器"
        highlighted={isHighlighted('rendererModule')}
      >
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>渲染模式</label>
          <select value={config.rendererModule.renderMode}
            onChange={(e) => updateModule('rendererModule', { renderMode: e.target.value as RenderMode })}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
          >
            <option value="billboard">公告板 (Billboard) — 0</option>
            <option value="stretchedBillboard">拉伸公告板 (Stretched Billboard) — 1</option>
            <option value="horizontalBillboard">水平公告板 (Horizontal Billboard) — 2</option>
            <option value="verticalBillboard">垂直公告板 (Vertical Billboard) — 3</option>
            <option value="mesh">网格 (Mesh) — 4</option>
          </select>
        </div>
        {config.rendererModule.renderMode === 'stretchedBillboard' && (
          <>
            <RangeInput label="速度缩放 (Velocity Scale)" value={{ mode: 'constant', constant: config.rendererModule.velocityScale ?? 1 }}
              onChange={(v) => updateModule('rendererModule', { velocityScale: v.constant ?? 1 })} min={0} max={10} step={0.1} />
            <RangeInput label="长度缩放 (Length Scale)" value={{ mode: 'constant', constant: config.rendererModule.lengthScale ?? 1 }}
              onChange={(v) => updateModule('rendererModule', { lengthScale: v.constant ?? 1 })} min={0} max={10} step={0.1} />
          </>
        )}
        {isEmitterNode(selectedNode) && selectedNodeId && (
          <>
            <AssetSlot
              slot="mainTexture"
              label="主贴图 (Texture)"
              assetId={selectedNode.assetRefs.mainTexture}
              defaultAssetId={DEFAULT_TEXTURE_ASSET_ID}
              onChange={(id) => updateEmitterAssetRefs(selectedNodeId, { mainTexture: id })}
            />
            <AssetSlot
              slot="material"
              label="材质 (Material)"
              assetId={selectedNode.assetRefs.material}
              defaultAssetId={DEFAULT_MATERIAL_ASSET_ID}
              onChange={(id) => updateEmitterAssetRefs(selectedNodeId, { material: id })}
            />
            {config.rendererModule.renderMode === 'mesh' && (
              <AssetSlot
                slot="mesh"
                label="网格 (Mesh)"
                assetId={selectedNode.assetRefs.mesh}
                defaultAssetId="builtin-mesh-quad"
                onChange={(id) => updateEmitterAssetRefs(selectedNodeId, { mesh: id })}
              />
            )}
          </>
        )}
      </Section>
    </div>
  );
};
