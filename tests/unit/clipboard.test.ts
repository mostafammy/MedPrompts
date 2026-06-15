import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard } from '../../src/lib/clipboard';

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should use navigator.clipboard if available and successful', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText: mockWriteText }
    });

    const result = await copyToClipboard('test');
    expect(result).toEqual({ ok: true, method: 'navigator' });
    expect(mockWriteText).toHaveBeenCalledWith('test');
  });

  it('should fallback to execCommand if navigator fails', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Failed')) }
    });

    const mockExecCommand = vi.fn().mockReturnValue(true);
    const mockQueryCommandSupported = vi.fn().mockReturnValue(true);
    
    // We mock document partially. Since we are in a node environment, document might not exist.
    vi.stubGlobal('document', {
      queryCommandSupported: mockQueryCommandSupported,
      createElement: () => ({ style: {}, select: vi.fn() }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      execCommand: mockExecCommand
    });

    const result = await copyToClipboard('test');
    expect(result).toEqual({ ok: true, method: 'execCommand' });
    expect(mockExecCommand).toHaveBeenCalledWith('copy');
  });

  it('should fallback to manual if everything fails', async () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('document', undefined);

    const result = await copyToClipboard('test');
    expect(result).toEqual({ ok: true, method: 'manual' });
  });
});
