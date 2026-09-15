'use client';

import React, { useState, useEffect } from 'react';
import {
  generateMcpApiKeyAction,
  revokeMcpApiKeyAction,
  getAuthSessionAction,
} from '@/app/actions/auth';
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  X,
  Cpu,
  ShieldCheck,
  ExternalLink,
  Code,
  AlertTriangle,
} from 'lucide-react';

interface McpApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function McpApiKeyModal({ isOpen, onClose }: McpApiKeyModalProps) {
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedClaudeConfig, setCopiedClaudeConfig] = useState(false);
  const [copiedCursorConfig, setCopiedCursorConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'http'>('claude');

  // Load existing key preview
  useEffect(() => {
    if (isOpen) {
      setError(null);
      getAuthSessionAction().then((session) => {
        if (session && session.mcpApiKeyPreview) {
          setKeyPreview(session.mcpApiKeyPreview);
        } else {
          setKeyPreview(null);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateMcpApiKeyAction();
      if (res.success && res.rawKey) {
        setNewRawKey(res.rawKey);
        setKeyPreview(res.keyPreview || null);
      } else {
        setError(res.error || 'Failed to generate API Key');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!confirm('Are you sure you want to revoke your MCP API Key? Connected AI agents will immediately lose access.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await revokeMcpApiKeyAction();
      if (res.success) {
        setNewRawKey(null);
        setKeyPreview(null);
      } else {
        setError(res.error || 'Failed to revoke API Key');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'claude' | 'cursor') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'claude') {
      setCopiedClaudeConfig(true);
      setTimeout(() => setCopiedClaudeConfig(false), 2000);
    } else if (type === 'cursor') {
      setCopiedCursorConfig(true);
      setTimeout(() => setCopiedCursorConfig(false), 2000);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mytask.fossptu.dev';
  const mcpEndpointUrl = `${originUrl}/api/mcp`;
  const activeKeyForSnippets = newRawKey || (keyPreview ? `<YOUR_SECRET_KEY>` : 'tf_live_...');

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        taskflow: {
          command: 'npx',
          args: [
            '-y',
            'mcp-proxy',
            mcpEndpointUrl,
            '--header',
            `x-mcp-api-key=${activeKeyForSnippets}`,
          ],
        },
      },
    },
    null,
    2
  );

  const cursorConfig = {
    url: mcpEndpointUrl,
    headers: {
      'x-mcp-api-key': activeKeyForSnippets,
      'Content-Type': 'application/json',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/10 bg-slate-900/90 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Personal AI API Key
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  MCP v1.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">Connect Claude Desktop, Cursor, or AI agents to your personal workspaces</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto py-5 space-y-5 pr-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Key Management Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active API Key</span>
              </div>
              {keyPreview && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Ready
                </span>
              )}
            </div>

            {/* Display Newly Generated Raw Key */}
            {newRawKey ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                      ✨ Copy Your Key Now (Visible Once)
                    </span>
                    <button
                      onClick={() => copyToClipboard(newRawKey, 'key')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors text-[11px]"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs break-all bg-slate-950/80 p-2 rounded-lg border border-indigo-500/30 text-emerald-300 select-all">
                    {newRawKey}
                  </div>
                </div>
                <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5 pl-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Store this securely. For your security, this key cannot be displayed again.</span>
                </p>
              </div>
            ) : keyPreview ? (
              /* Display Existing Key Preview */
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-mono text-slate-300 text-xs tracking-wider">
                  {keyPreview}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateKey}
                    disabled={loading}
                    className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Regenerate Key"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleRevokeKey}
                    disabled={loading}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Revoke Key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* No Key Generated Yet */
              <div className="p-4 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-2">
                <p className="text-slate-400 text-xs">No active API key generated for this account.</p>
                <button
                  onClick={handleGenerateKey}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Generate Personal MCP Key</span>
                </button>
              </div>
            )}
          </div>

          {/* Client Connection Config Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Quick Integration Config
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('claude')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeTab === 'claude'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Claude Desktop
                </button>
                <button
                  onClick={() => setActiveTab('cursor')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeTab === 'cursor'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cursor IDE
                </button>
                <button
                  onClick={() => setActiveTab('http')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    activeTab === 'http'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  HTTP / JSON-RPC
                </button>
              </div>
            </div>

            {/* Tab: Claude Desktop */}
            {activeTab === 'claude' && (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">
                    Paste into <code className="text-indigo-300 font-mono">claude_desktop_config.json</code>:
                  </span>
                  <button
                    onClick={() => copyToClipboard(claudeDesktopConfig, 'claude')}
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {copiedClaudeConfig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedClaudeConfig ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {claudeDesktopConfig}
                </pre>
              </div>
            )}

            {/* Tab: Cursor IDE */}
            {activeTab === 'cursor' && (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Cursor Settings $\rightarrow$ Features $\rightarrow$ MCP:</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(cursorConfig, null, 2), 'cursor')}
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {copiedCursorConfig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCursorConfig ? 'Copied' : 'Copy Config'}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Server URL:</span>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 select-all">
                      {mcpEndpointUrl}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Header Key & Value:</span>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 select-all">
                      x-mcp-api-key: {activeKeyForSnippets}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Direct HTTP */}
            {activeTab === 'http' && (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Endpoint:</span>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 select-all">
                      POST {mcpEndpointUrl}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Auth Header:</span>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 select-all">
                      Authorization: Bearer {activeKeyForSnippets}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Personal Tenant Isolation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
