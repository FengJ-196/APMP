'use client';

import React, { useState, useEffect } from 'react';

interface TaskRouteConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  fallbackModel?: string;
}

interface TaskRoutingMap {
  [key: string]: TaskRouteConfig;
}

interface Model {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
}

const TASK_LABELS: Record<string, { title: string; desc: string; icon: string }> = {
  diagram_to_mermaid: {
    title: '📷 Diagram to Mermaid',
    desc: 'Extract and convert uploaded workflow/architecture images into code diagrams.',
    icon: '🔮'
  },
  analyze_conflicts: {
    title: '⚖️ SRS Conflict Analyzer',
    desc: 'Compare textual requirements against diagram models to extract logic conflicts.',
    icon: '🔎'
  },
  reformat_markdown: {
    title: '📝 Markdown Reformatter',
    desc: 'Organize, sanitize, and format unstructured text into clean document structures.',
    icon: '✍️'
  },
  generate_wbs: {
    title: '🌳 WBS Decomposer',
    desc: 'Decompose project sources of truth into recursive 4-level Work Breakdown Structures.',
    icon: '🏗️'
  },
  generate_subtasks: {
    title: '💻 Dev Subtask Generator',
    desc: 'Generate granular developer instructions and coding tasks from Level 3 nodes.',
    icon: '🛠️'
  }
};

export default function AIModelRoutingPage() {
  const [routingMap, setRoutingMap] = useState<TaskRoutingMap>({});
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Testing Sandbox
  const [testTask, setTestTask] = useState<string>('reformat_markdown');
  const [testPrompt, setTestPrompt] = useState<string>('Hello! Summarize your architectural instructions in exactly two short sentences.');
  const [executingTest, setExecutingTest] = useState<boolean>(false);
  const [testOutput, setTestOutput] = useState<string>('');
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testModelUsed, setTestModelUsed] = useState<string>('');

  useEffect(() => {
    fetchRoutingMap();
    fetchModels();
  }, []);

  const fetchRoutingMap = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gateway/routes');
      if (res.ok) {
        const data = await res.json();
        setRoutingMap(data.routingMap);
      }
    } catch (err) {
      console.error('Failed to load routing maps:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/gateway/models');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setModels(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load models list:', err);
    }
  };

  const handleConfigChange = (taskKey: string, field: keyof TaskRouteConfig, value: any) => {
    setRoutingMap(prev => ({
      ...prev,
      [taskKey]: {
        ...prev[taskKey],
        [field]: value
      }
    }));
  };

  const saveRoutingSettings = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      
      const res = await fetch('/api/gateway/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routingMap }),
      });

      if (res.ok) {
        setSaveMessage({ text: '🚀 AI Router hot-reload applied successfully!', type: 'success' });
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        const data = await res.json();
        setSaveMessage({ text: `🛑 Error: ${data.error || 'Failed to update configurations'}`, type: 'error' });
      }
    } catch (err: any) {
      setSaveMessage({ text: `🛑 Network Error: ${err.message || 'Failure'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Run a test against the dynamic router
  const executeSandboxTest = async () => {
    if (executingTest) return;
    setExecutingTest(true);
    setTestOutput('');
    setTestLatency(null);

    const activeConfig = routingMap[testTask];
    setTestModelUsed(activeConfig?.model || 'Undefined');
    const startTime = performance.now();

    try {
      // We route the test request through the generic chat completions gateway
      // using the configured model for the selected task
      const response = await fetch('/api/gateway/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeConfig.model,
          temperature: activeConfig.temperature || 0.7,
          max_tokens: activeConfig.maxTokens || 1000,
          stream: true,
          messages: [
            { role: 'user', content: testPrompt }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Execution error: ${response.status}`);
      }

      if (!response.body) throw new Error('Response body is empty');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || cleanLine === 'data: [DONE]') continue;
          if (cleanLine.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(cleanLine.substring(6));
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                streamText += token;
                setTestOutput(streamText);
              }
            } catch (e) {
              // chunk incomplete
            }
          }
        }
      }

      const totalDuration = performance.now() - startTime;
      setTestLatency(totalDuration);
    } catch (err: any) {
      setTestOutput(`🛑 Error executing router config: ${err.message}`);
    } finally {
      setExecutingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC] font-sans antialiased p-6 flex flex-col gap-6">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glowing backdrop */}
        <div className="absolute top-0 right-0 w-[400px] h-[100px] bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.06),transparent_70%)] pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#3B82F6] animate-pulse shadow-[0_0_12px_#3B82F6]" />
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              AI Task Model Router
            </h1>
            <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] text-[#3B82F6]">
              Admin Panel
            </span>
          </div>
          <p className="text-[#94A3B8] text-sm mt-1">
            Map custom models to specific tasks, configure backup failovers, and hot-reload AI providers
          </p>
        </div>

        {/* Action button */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {saveMessage && (
            <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
              saveMessage.type === 'success' 
                ? 'bg-[rgba(16,185,129,0.06)] border-[#10B981] text-[#10B981]' 
                : 'bg-[rgba(239,68,68,0.06)] border-[#EF4444] text-[#EF4444]'
            }`}>
              {saveMessage.text}
            </div>
          )}
          <button
            onClick={saveRoutingSettings}
            disabled={saving || loading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] text-white disabled:opacity-50"
          >
            {saving ? 'Applying Hot-Swap...' : 'Save Configuration'}
          </button>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ROUTING MAP EDITORS (8 COLS) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {loading ? (
            <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-4">
              <span className="w-12 h-12 rounded-full border-4 border-t-transparent border-[#3B82F6] animate-spin" />
              <span className="text-sm text-[#94A3B8]">Loading Router maps...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(routingMap).map(([taskKey, config]) => {
                const label = TASK_LABELS[taskKey] || { title: taskKey, desc: 'Generic AI Service Task', icon: '🤖' };
                return (
                  <section
                    key={taskKey}
                    className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all hover:border-[rgba(59,130,246,0.15)] group"
                  >
                    {/* Visual decor */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-transparent opacity-40" />

                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[rgba(148,163,184,0.06)] pb-3">
                        <div>
                          <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                            {label.title}
                          </h2>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 max-w-xl">{label.desc}</p>
                        </div>
                        <span className="text-[10px] font-semibold font-mono bg-[#1E293B] text-[#CBD5E1] border border-[rgba(148,163,184,0.05)] px-2.5 py-1 rounded-md self-start md:self-center">
                          {taskKey}
                        </span>
                      </div>

                      {/* Controls parameters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Model Dropdown Selection */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-[#CBD5E1]">Primary AI Model</label>
                          <select
                            value={config.model}
                            onChange={(e) => handleConfigChange(taskKey, 'model', e.target.value)}
                            className="bg-[#1E293B] border border-[rgba(148,163,184,0.1)] text-xs text-[#F8FAFC] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] transition-all cursor-pointer"
                          >
                            <option value="">Select a model...</option>
                            {models.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name || m.id.split('/').pop()?.toUpperCase()} ({m.id})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Fallback Backup Model Dropdown */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-[#CBD5E1] flex items-center justify-between">
                            <span>Downtime Fallback Model</span>
                            <span className="text-[9px] text-[#94A3B8]">Automatic Failover</span>
                          </label>
                          <select
                            value={config.fallbackModel || ''}
                            onChange={(e) => handleConfigChange(taskKey, 'fallbackModel', e.target.value || undefined)}
                            className="bg-[#1E293B] border border-[rgba(148,163,184,0.1)] text-xs text-[#F8FAFC] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] transition-all cursor-pointer"
                          >
                            <option value="">None (Throw error)</option>
                            {models.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name || m.id.split('/').pop()?.toUpperCase()} ({m.id})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Temperature Config */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-[#CBD5E1]">Creativity (Temperature)</span>
                            <span className="font-mono text-[#3B82F6] bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] px-2 py-0.5 rounded">
                              {config.temperature !== undefined ? config.temperature.toFixed(2) : '0.20'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={config.temperature !== undefined ? config.temperature : 0.2}
                            onChange={(e) => handleConfigChange(taskKey, 'temperature', parseFloat(e.target.value))}
                            className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
                          />
                        </div>

                        {/* Max Tokens config */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-[#CBD5E1]">Max Output Tokens</span>
                            <span className="font-mono text-emerald-400 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] px-2 py-0.5 rounded">
                              {config.maxTokens || 2048}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="100"
                            max="8192"
                            step="100"
                            value={config.maxTokens || 2048}
                            onChange={(e) => handleConfigChange(taskKey, 'maxTokens', parseInt(e.target.value))}
                            className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
                          />
                        </div>

                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TESTING SANDBOX SIMULATOR (4 COLS) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <section className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 sticky top-6">
            <h2 className="text-lg font-bold text-[#F8FAFC] pb-3 border-b border-[rgba(148,163,184,0.06)] flex items-center gap-2">
              🧪 Live Sandbox Simulator
            </h2>

            {/* Select Task to Test */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#CBD5E1]">Select Task to Simulate</label>
              <select
                value={testTask}
                onChange={(e) => setTestTask(e.target.value)}
                className="bg-[#1E293B] border border-[rgba(148,163,184,0.1)] text-xs text-[#F8FAFC] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] cursor-pointer"
              >
                {Object.keys(routingMap).map((taskKey) => (
                  <option key={taskKey} value={taskKey}>
                    {TASK_LABELS[taskKey]?.title || taskKey}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Prompt Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#CBD5E1]">Sandbox Input Prompt</label>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                rows={4}
                className="bg-[#1E293B] border border-[rgba(148,163,184,0.1)] text-xs text-[#F8FAFC] placeholder-[#94A3B8] rounded-xl p-4 outline-none focus:border-[#3B82F6] resize-none"
                placeholder="Enter sandbox testing prompts..."
              />
            </div>

            {/* Run Button */}
            <button
              onClick={executeSandboxTest}
              disabled={executingTest || loading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] text-[#0B1120] disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {executingTest ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-[#0B1120] border-t-transparent animate-spin" />
                  Streaming Output...
                </>
              ) : (
                'Simulate Route Call'
              )}
            </button>

            {/* Telemetry info */}
            {testModelUsed && (
              <div className="bg-[#0B1120] border border-[rgba(148,163,184,0.04)] rounded-xl p-3.5 flex flex-col gap-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Target Model:</span>
                  <span className="text-[#F8FAFC] truncate max-w-[180px]">{testModelUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Roundtrip Latency:</span>
                  <span className="text-[#3B82F6] font-bold">
                    {testLatency !== null ? `${(testLatency / 1000).toFixed(2)}s` : '--'}
                  </span>
                </div>
              </div>
            )}

            {/* Output terminal */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#CBD5E1]">Simulated Gateway Output</label>
              <div className="bg-[#0B1120] border border-[rgba(148,163,184,0.06)] rounded-xl p-4 min-h-[160px] max-h-[250px] overflow-y-auto font-mono text-[11px] leading-relaxed text-[#CBD5E1] whitespace-pre-wrap select-text shadow-inner">
                {testOutput || (
                  <span className="text-[#94A3B8] italic">Click "Simulate Route Call" to stream mapped output...</span>
                )}
              </div>
            </div>

          </section>
        </div>

      </div>
    </div>
  );
}
