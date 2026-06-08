import { useState, useEffect, useCallback } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const DEFAULT_SERVER_URL = 'http://127.0.0.1:8000';
const STORAGE_KEY_URL = 'mcp_server_url';
const STORAGE_KEY_API = 'mcp_api_key';

/**
 * useMcp — React hook for the ai-superpower MCP server.
 *
 * Replaces useGitHub: instead of reading/writing proposals.json on GitHub,
 * we call MCP tools (list_projects, list_proposals, create_project, ...)
 * on the ai-superpower server at <serverUrl>/mcp.
 *
 * localStorage keys (set via Settings UI):
 *   mcp_server_url  — base URL like http://127.0.0.1:8000 (no /mcp suffix)
 *   mcp_api_key     — X-API-Key (same key as ai-superpower's [api].key)
 */
export function useMcp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SERVER_URL);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API) || '');

  // Persist on change
  useEffect(() => { localStorage.setItem(STORAGE_KEY_URL, serverUrl); }, [serverUrl]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_API, apiKey); }, [apiKey]);

  // Build a Client + Transport, run a function, then close. Each call
  // creates a fresh session — MCP Streamable HTTP supports this trivially
  // and avoids any long-lived-connection complexity in the React app.
  const withClient = useCallback(async (fn) => {
    if (!apiKey) throw new Error('请先在 Settings 设置 ai-superpower API Key');
    const url = (serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
    const client = new Client(
      { name: 'prj-proposals-manager', version: '1.0.0' },
      { capabilities: {} }
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(`${url}/mcp/`),
      { requestInit: { headers: { 'X-API-Key': apiKey } } }
    );
    setLoading(true);
    setError(null);
    try {
      await client.connect(transport);
      return await fn(client);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      try { await client.close(); } catch (_) { /* ignore */ }
      setLoading(false);
    }
  }, [apiKey, serverUrl]);

  // Helper: extract text from MCP callTool result and JSON.parse it.
  // ai-superpower's tools return JSON-serialized strings in the text content.
  const parseToolResult = (result) => {
    if (!result || !Array.isArray(result.content)) return result;
    for (const item of result.content) {
      if (item && item.type === 'text' && typeof item.text === 'string') {
        try { return JSON.parse(item.text); } catch (_) { return item.text; }
      }
    }
    return result;
  };

  // Load all projects + proposals (paginated, cap at 500 each for the SPA).
  const loadData = useCallback(async () => {
    return withClient(async (client) => {
      const [projRes, propRes] = await Promise.all([
        client.callTool({ name: 'list_projects', arguments: { page: 1, page_size: 500 } }),
        client.callTool({ name: 'list_proposals', arguments: { page: 1, page_size: 500 } }),
      ]);
      const projects = parseToolResult(projRes) || { items: [] };
      const proposals = parseToolResult(propRes) || { items: [] };
      return { projects: projects.items || [], proposals: proposals.items || [] };
    });
  }, [withClient]);

  // Backward-compat alias for fetchData (same shape as old useGitHub).
  const fetchData = loadData;

  const addProject = useCallback(async (project) => {
    return withClient(async (client) => {
      const res = await client.callTool({
        name: 'create_project',
        arguments: {
          name: project.name,
          description: project.description || '',
          git_repo: project.gitRepo || project.git_repo || '',
          prj_url: project.prjUrl || project.prj_url || '',
          local_path: project.localPath || project.local_path || '',
        },
      });
      return parseToolResult(res);
    });
  }, [withClient]);

  const updateProject = useCallback(async (id, updates) => {
    return withClient(async (client) => {
      const args = { project_id: id };
      if (updates.name !== undefined) args.name = updates.name;
      if (updates.description !== undefined) args.description = updates.description;
      if (updates.gitRepo !== undefined || updates.git_repo !== undefined) {
        args.git_repo = updates.git_repo || updates.gitRepo;
      }
      if (updates.milestones !== undefined) args.milestones = updates.milestones;
      const res = await client.callTool({ name: 'update_project', arguments: args });
      return parseToolResult(res);
    });
  }, [withClient]);

  const deleteProject = useCallback(async (id) => {
    return withClient(async (client) => {
      const res = await client.callTool({
        name: 'delete_project',
        arguments: { project_id: id },
      });
      return parseToolResult(res);
    });
  }, [withClient]);

  const addProposal = useCallback(async (proposal) => {
    return withClient(async (client) => {
      const args = {
        title: proposal.title,
        owner: proposal.owner || 'unknown',
        project_id: proposal.projectId || proposal.project_id,
        stage: proposal.stage || 'ideation',
      };
      if (proposal.description) args.description = proposal.description;
      if (proposal.type) args.engine = proposal.type;
      if (proposal.tags) args.notes = Array.isArray(proposal.tags) ? proposal.tags.join(', ') : proposal.tags;
      if (proposal.gitRepo || proposal.git_repo) args.git_repo = proposal.git_repo || proposal.gitRepo;
      if (proposal.url) args.deployment_url = proposal.url;
      const res = await client.callTool({ name: 'create_proposal', arguments: args });
      return parseToolResult(res);
    });
  }, [withClient]);

  const updateProposal = useCallback(async (id, updates) => {
    return withClient(async (client) => {
      const args = { proposal_id: id };
      if (updates.status !== undefined) args.status = updates.status;
      if (updates.title !== undefined) args.title = updates.title;
      if (updates.description !== undefined) args.description = updates.description;
      if (updates.projectId !== undefined || updates.project_id !== undefined) {
        args.project_id = updates.project_id || updates.projectId;
      }
      // Use the status tool when only status changes; otherwise fields tool
      if (Object.keys(args).filter(k => k !== 'proposal_id').length === 1 && args.status) {
        const res = await client.callTool({ name: 'update_proposal_status', arguments: args });
        return parseToolResult(res);
      } else {
        delete args.status;
        const res = await client.callTool({ name: 'update_proposal_fields', arguments: args });
        return parseToolResult(res);
      }
    });
  }, [withClient]);

  const deleteProposal = useCallback(async (id) => {
    return withClient(async (client) => {
      const res = await client.callTool({
        name: 'delete_proposal',
        arguments: { proposal_id: id },
      });
      return parseToolResult(res);
    });
  }, [withClient]);

  // Test connection by calling list_projects and returning a server info string.
  const testConnection = useCallback(async () => {
    return withClient(async (client) => {
      const toolsRes = await client.listTools();
      const tools = (toolsRes && toolsRes.tools) || [];
      return {
        ok: true,
        toolCount: tools.length,
        tools: tools.map(t => t.name).sort(),
        serverInfo: client.getServerVersion ? client.getServerVersion() : null,
      };
    });
  }, [withClient]);

  return {
    loading,
    error,
    serverUrl,
    apiKey,
    setServerUrl,
    setApiKey,
    // Low-level helpers
    withClient,
    // Domain operations
    loadData,
    fetchData,           // alias of loadData for backward-compat
    addProject,
    updateProject,
    deleteProject,
    addProposal,
    updateProposal,
    deleteProposal,
    testConnection,
  };
}
