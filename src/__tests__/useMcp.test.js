import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the MCP SDK so we can control callTool / listTools responses
const mockCallTool = vi.fn();
const mockListTools = vi.fn();
const mockClose = vi.fn();
const mockConnect = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    callTool: mockCallTool,
    listTools: mockListTools,
    close: mockClose,
    getServerVersion: () => ({ name: 'ai-superpower', version: '1.27.2' }),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation((url, opts) => ({ url, opts })),
}));

import { useMcp } from '../hooks/useMcp.js';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockConnect.mockResolvedValue(undefined);
  mockClose.mockResolvedValue(undefined);
});

describe('useMcp — basic state', () => {
  it('returns default state', () => {
    const { result } = renderHook(() => useMcp());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.serverUrl).toBe('http://127.0.0.1:8000');
    expect(result.current.apiKey).toBe('');
  });

  it('persists serverUrl and apiKey to localStorage', () => {
    const { result } = renderHook(() => useMcp());
    act(() => {
      result.current.setServerUrl('http://example.com:9000');
      result.current.setApiKey('test-key-abc');
    });
    expect(localStorage.getItem('mcp_server_url')).toBe('http://example.com:9000');
    expect(localStorage.getItem('mcp_api_key')).toBe('test-key-abc');
  });
});

describe('useMcp — auth gate', () => {
  it('throws when apiKey is empty', async () => {
    const { result } = renderHook(() => useMcp());
    await expect(result.current.loadData()).rejects.toThrow(/API Key/);
  });
});

describe('useMcp — loadData', () => {
  beforeEach(() => {
    localStorage.setItem('mcp_api_key', 'k1');
  });

  it('calls list_projects and list_proposals, returns {projects, proposals}', async () => {
    mockCallTool.mockImplementation(async ({ name }) => {
      if (name === 'list_projects') return { content: [{ type: 'text', text: JSON.stringify({ items: [{ id: 'P1', name: 'X' }] }) }] };
      if (name === 'list_proposals') return { content: [{ type: 'text', text: JSON.stringify({ items: [{ id: 'PR1', title: 'T' }] }) }] };
    });

    const { result } = renderHook(() => useMcp());
    let data;
    await act(async () => {
      data = await result.current.loadData();
    });
    expect(data).toEqual({ projects: [{ id: 'P1', name: 'X' }], proposals: [{ id: 'PR1', title: 'T' }] });
    expect(mockCallTool).toHaveBeenCalledWith({ name: 'list_projects', arguments: { page: 1, page_size: 500 } });
    expect(mockCallTool).toHaveBeenCalledWith({ name: 'list_proposals', arguments: { page: 1, page_size: 500 } });
  });

  it('returns empty arrays when tool returns empty items', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });
    const { result } = renderHook(() => useMcp());
    let data;
    await act(async () => {
      data = await result.current.loadData();
    });
    expect(data).toEqual({ projects: [], proposals: [] });
  });
});

describe('useMcp — addProject', () => {
  beforeEach(() => localStorage.setItem('mcp_api_key', 'k1'));

  it('calls create_project with mapped args', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{"id":"P1"}' }] });
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      await result.current.addProject({ name: 'New', description: 'd', gitRepo: 'https://g/x' });
    });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'create_project',
      arguments: { name: 'New', description: 'd', git_repo: 'https://g/x', prj_url: '', local_path: '' },
    });
  });
});

describe('useMcp — updateProject', () => {
  beforeEach(() => localStorage.setItem('mcp_api_key', 'k1'));

  it('sends partial fields to update_project', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      await result.current.updateProject('PRJ-X', { name: 'Renamed', milestones: [{ id: 'm1' }] });
    });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'update_project',
      arguments: { project_id: 'PRJ-X', name: 'Renamed', milestones: [{ id: 'm1' }] },
    });
  });
});

describe('useMcp — updateProposal', () => {
  beforeEach(() => localStorage.setItem('mcp_api_key', 'k1'));

  it('uses update_proposal_status when only status changes', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      await result.current.updateProposal('P-X', { status: 'accepted' });
    });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'update_proposal_status',
      arguments: { proposal_id: 'P-X', status: 'accepted' },
    });
  });

  it('uses update_proposal_fields when multiple fields change', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      await result.current.updateProposal('P-X', { title: 'New', status: 'in_dev' });
    });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'update_proposal_fields',
      arguments: { proposal_id: 'P-X', title: 'New' },
    });
  });
});

describe('useMcp — addProposal', () => {
  beforeEach(() => localStorage.setItem('mcp_api_key', 'k1'));

  it('maps to create_proposal with required fields', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{"id":"P-1"}' }] });
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      await result.current.addProposal({ title: 'X', projectId: 'PRJ-1', tags: 'a,b' });
    });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'create_proposal',
      arguments: { title: 'X', owner: 'unknown', project_id: 'PRJ-1', stage: 'ideation', notes: 'a,b' },
    });
  });
});

describe('useMcp — deleteProject / deleteProposal', () => {
  beforeEach(() => localStorage.setItem('mcp_api_key', 'k1'));

  it('deleteProject calls delete_project', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      await result.current.deleteProject('PRJ-1');
    });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'delete_project',
      arguments: { project_id: 'PRJ-1' },
    });
  });

  it('deleteProposal calls delete_proposal', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      await result.current.deleteProposal('P-1');
    });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'delete_proposal',
      arguments: { proposal_id: 'P-1' },
    });
  });
});

describe('useMcp — testConnection', () => {
  beforeEach(() => localStorage.setItem('mcp_api_key', 'k1'));

  it('returns tool count and server info', async () => {
    mockListTools.mockResolvedValue({ tools: [{ name: 'a' }, { name: 'b' }] });
    const { result } = renderHook(() => useMcp());
    let r;
    await act(async () => {
      r = await result.current.testConnection();
    });
    expect(r.ok).toBe(true);
    expect(r.toolCount).toBe(2);
    expect(r.tools).toEqual(['a', 'b']);
    expect(r.serverInfo).toEqual({ name: 'ai-superpower', version: '1.27.2' });
  });
});

describe('useMcp — error path', () => {
  beforeEach(() => localStorage.setItem('mcp_api_key', 'k1'));

  it('sets error state when callTool throws', async () => {
    mockCallTool.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMcp());
    await act(async () => {
      try { await result.current.loadData(); } catch (_) { /* expected */ }
    });
    await waitFor(() => expect(result.current.error).toBe('boom'));
  });
});
