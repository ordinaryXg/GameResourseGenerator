import { describe, it, expect } from 'vitest';
import {
  resolveProjectLocation,
  sanitizeProjectFolderName,
  pickFxprojInFolder,
  getProjectRootDir
} from '../src/utils/project-paths';

describe('project-paths', () => {
  it('sanitizes folder names', () => {
    expect(sanitizeProjectFolderName('My/Effect')).toBe('My_Effect');
    expect(sanitizeProjectFolderName('   ')).toBe('untitled');
  });

  it('uses picked folder directly as project root', () => {
    const r = resolveProjectLocation('D:/Work/Explosion');
    expect(r.projectDir).toBe('D:/Work/Explosion');
    expect(r.projectPath).toBe('D:/Work/Explosion/Explosion.fxproj');
    expect(r.projectName).toBe('Explosion');
  });

  it('names fxproj after folder even when internal project name differs', () => {
    const r = resolveProjectLocation('D:/Desktop/testEffect');
    expect(r.projectDir).toBe('D:/Desktop/testEffect');
    expect(r.projectPath).toBe('D:/Desktop/testEffect/testEffect.fxproj');
    expect(r.projectName).toBe('testEffect');
  });

  it('supports Windows paths', () => {
    const r = resolveProjectLocation('D:\\Projects\\Smoke');
    expect(r.projectDir).toBe('D:\\Projects\\Smoke');
    expect(r.projectPath).toBe('D:\\Projects\\Smoke\\Smoke.fxproj');
    expect(r.projectName).toBe('Smoke');
  });

  it('prefers fxproj matching folder name', () => {
    expect(pickFxprojInFolder('Smoke', ['other.fxproj', 'Smoke.fxproj'])).toBe('Smoke.fxproj');
    expect(pickFxprojInFolder('Smoke', ['only.fxproj'])).toBe('only.fxproj');
    expect(pickFxprojInFolder('Smoke', [])).toBeNull();
  });

  it('derives project root from fxproj path', () => {
    expect(getProjectRootDir('D:/Work/Smoke/Smoke.fxproj')).toBe('D:/Work/Smoke');
  });
});
