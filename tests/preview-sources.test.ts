import { describe, it, expect } from 'vitest';
import { createDefaultProject } from '../src/utils/project-factory';
import { collectEmitterPreviewSources } from '../src/utils/preview-sources';
import { createDefaultEmitter } from '../src/utils/project-factory';

describe('preview-sources', () => {
  it('collects all enabled emitters', () => {
    const project = createDefaultProject('Multi');
    project.root.children.push(createDefaultEmitter('Smoke'));
    const sources = collectEmitterPreviewSources(project.root);
    expect(sources).toHaveLength(2);
  });

  it('filters by solo id', () => {
    const project = createDefaultProject('Solo');
    const second = createDefaultEmitter('B');
    project.root.children.push(second);
    const sources = collectEmitterPreviewSources(project.root, { soloId: second.id });
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe(second.id);
  });
});
