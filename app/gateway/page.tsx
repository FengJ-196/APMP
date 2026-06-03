'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Model {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  description?: string;
}

interface LogEntry {
  timestamp: string;
  model: string;
  latency: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  status: 'success' | 'error';
}

export default function GatewayPage() {
  // Model management
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState<boolean>(true);

  // Key Info management
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [loadingKeyInfo, setLoadingKeyInfo] = useState<boolean>(true);

  // Chat settings
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hello! I am connected to the secure OpenRouter API Gateway. Select a model on the left, type a prompt, and see how fast I stream back the response!' }
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(1000);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Analytics & Logs
  const [latency, setLatency] = useState<number | null>(null);
  const [firstTokenTime, setFirstTokenTime] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [tokensPerSecond, setTokensPerSecond] = useState<number | null>(null);
  const [requestLogs, setRequestLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'payload'>('chat');

  // UI Refs
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initial loads
  useEffect(() => {
    fetchModels();
    fetchKeyInfo();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchModels = async () => {
    try {
      setLoadingModels(true);
      const res = await fetch('/api/gateway/models');
      if (res.ok) {
        const data = await res.json();
        // OpenRouter returns list in `data` array
        if (data && Array.isArray(data.data)) {
          // Sort popular ones first
          const sorted = data.data.sort((a: Model, b: Model) => {
            const aGem = a.id.includes('gemini') || a.id.includes('deepseek') || a.id.includes('gpt-4');
            const bGem = b.id.includes('gemini') || b.id.includes('deepseek') || b.id.includes('gpt-4');
            if (aGem && !bGem) return -1;
            if (!aGem && bGem) return 1;
            return 0;
          });
          setModels(sorted);
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchKeyInfo = async () => {
    try {
      setLoadingKeyInfo(true);
      const res = await fetch('/api/gateway/key-info');
      if (res.ok) {
        const data = await res.json();
        setKeyInfo(data.data);
      }
    } catch (err) {
      console.error('Failed to load API key telemetry:', err);
    } finally {
      setLoadingKeyInfo(false);
    }
  };

  // Helper pricing formats
  const getSelectedModelData = () => {
    return models.find(m => m.id === selectedModel) || {
      id: selectedModel,
      name: selectedModel.split('/').pop()?.toUpperCase() || selectedModel,
      pricing: { prompt: '0.0000005', completion: '0.0000015' },
      context_length: 128000
    };
  };

  const formatCost = (priceStr: string) => {
    const val = parseFloat(priceStr) * 1000000;
    return val === 0 ? 'Free' : `$${val.toFixed(2)} / 1M tokens`;
  };

  // Chat request handling
  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isSending) return;

    const userMessage = { role: 'user' as const, content: inputPrompt };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsSending(true);

    // Reset analytics
    setLatency(null);
    setFirstTokenTime(null);
    setEstimatedCost(null);
    setTokensPerSecond(null);

    const startTime = performance.now();
    let currentAssistantText = '';
    const currentModelData = getSelectedModelData();

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/gateway/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages,
          temperature,
          max_tokens: maxTokens,
          stream: isStreaming
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Server returned an error');
      }

      if (isStreaming) {
        if (!response.body) throw new Error('Response body is null');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let chunkCount = 0;
        let ttfTime: number | null = null;

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
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  if (chunkCount === 0) {
                    ttfTime = performance.now() - startTime;
                    setFirstTokenTime(ttfTime);
                  }
                  chunkCount++;
                  currentAssistantText += content;

                  // Update assistant message in real-time
                  setMessages(prev => {
                    const newArr = [...prev];
                    if (newArr.length > 0) {
                      newArr[newArr.length - 1] = {
                        role: 'assistant',
                        content: currentAssistantText
                      };
                    }
                    return newArr;
                  });
                }
              } catch (e) {
                // Ignore parsing errors of incomplete buffers
              }
            }
          }
        }

        const endTime = performance.now();
        const totalDuration = endTime - startTime;
        setLatency(totalDuration);

        // Approximate token counting
        const promptTokens = Math.ceil(JSON.stringify(updatedMessages).length / 4);
        const completionTokens = Math.ceil(currentAssistantText.length / 4);
        const cost = (promptTokens * parseFloat(currentModelData.pricing.prompt)) +
                     (completionTokens * parseFloat(currentModelData.pricing.completion));

        setEstimatedCost(cost);
        setTokensPerSecond(Math.round(completionTokens / (totalDuration / 1000)));

        // Log entry
        setRequestLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            model: selectedModel,
            latency: totalDuration,
            promptTokens,
            completionTokens,
            cost,
            status: 'success'
          },
          ...prev
        ]);

      } else {
        // Standard non-streaming completions
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const endTime = performance.now();
        const totalDuration = endTime - startTime;

        setMessages(prev => {
          const newArr = [...prev];
          if (newArr.length > 0) {
            newArr[newArr.length - 1] = {
              role: 'assistant',
              content
            };
          }
          return newArr;
        });

        setLatency(totalDuration);
        setFirstTokenTime(totalDuration);

        const promptTokens = data.usage?.prompt_tokens || Math.ceil(JSON.stringify(updatedMessages).length / 4);
        const completionTokens = data.usage?.completion_tokens || Math.ceil(content.length / 4);
        const cost = (promptTokens * parseFloat(currentModelData.pricing.prompt)) +
                     (completionTokens * parseFloat(currentModelData.pricing.completion));

        setEstimatedCost(cost);
        setTokensPerSecond(Math.round(completionTokens / (totalDuration / 1000)));

        setRequestLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            model: selectedModel,
            latency: totalDuration,
            promptTokens,
            completionTokens,
            cost,
            status: 'success'
          },
          ...prev
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => {
        const newArr = [...prev];
        if (newArr.length > 0) {
          newArr[newArr.length - 1] = {
            role: 'assistant',
            content: `🛑 Gateway Routing Error: ${err.message || 'The request could not be proxied to OpenRouter. Ensure backend variables are fully configured.'}`
          };
        }
        return newArr;
      });

      setRequestLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          model: selectedModel,
          latency: 0,
          promptTokens: 0,
          completionTokens: 0,
          cost: 0,
          status: 'error'
        },
        ...prev
      ]);
    } finally {
      setIsSending(false);
      fetchKeyInfo(); // update credits info asynchronously
    }
  };

  // Filtered models
  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate dynamic code templates
  const getGeneratedCode = () => {
    return `// OpenRouter Secure API Gateway Integration
await fetch("/api/gateway/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "${selectedModel}",
    temperature: ${temperature},
    max_tokens: ${maxTokens},
    stream: ${isStreaming},
    messages: ${JSON.stringify(messages.slice(-2), null, 2).replace(/\n/g, '\n    ')}
  })
});`;
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC] font-sans antialiased p-6 flex flex-col gap-6">
      {/* HEADER BAR */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Neon Backdrop Glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[100px] bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.06),transparent_70%)] pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_12px_#10B981]" />
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              OpenRouter AI Gateway
            </h1>
            <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10B981]">
              Secure Proxy
            </span>
          </div>
          <p className="text-[#94A3B8] text-sm mt-1">
            Enterprise routing layer, telemetry tracking, and streaming completion sandbox
          </p>
        </div>

        {/* Telemetry and Routing Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
          <a
            href="/gateway/routing"
            className="text-xs bg-[#1E293B] hover:bg-[#334155] border border-[rgba(148,163,184,0.15)] text-[#CBD5E1] hover:text-[#F8FAFC] font-bold px-4 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            ⚙️ Task Routing Settings
          </a>

          <div className="bg-[#1E293B] border border-[rgba(148,163,184,0.08)] rounded-xl px-5 py-3 flex gap-6 items-center w-full md:w-auto shadow-inner relative overflow-hidden">
          {loadingKeyInfo ? (
            <div className="flex items-center gap-3 py-1">
              <span className="w-4 h-4 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin" />
              <span className="text-xs text-[#94A3B8]">Telemetry Syncing...</span>
            </div>
          ) : keyInfo ? (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Limit & Usage</span>
                <span className="text-sm font-semibold text-[#CBD5E1]">
                  ${keyInfo.is_free_tier ? 'Unlimited (Free Tier)' : `$${(keyInfo.limit || 0).toFixed(4)}`}
                </span>
              </div>
              <div className="h-8 w-px bg-[rgba(148,163,184,0.1)]" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Usage Balance</span>
                <span className="text-sm font-bold text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  ${(keyInfo.usage || 0).toFixed(4)}
                </span>
              </div>
              <div className="h-8 w-px bg-[rgba(148,163,184,0.1)]" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Key Label</span>
                <span className="text-xs text-[#F8FAFC] font-mono truncate max-w-[120px]" title={keyInfo.label}>
                  {keyInfo.label || 'Default Key'}
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-[#EF4444] font-semibold py-1">
              🔑 Missing or Invalid API Key config
            </div>
          )}
        </div>
      </div>
    </header>

      {/* DASHBOARD BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: CONTROLS & MODELS (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* CONFIGURATION PARAMETERS */}
          <section className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <h2 className="text-lg font-bold text-[#F8FAFC] border-b border-[rgba(148,163,184,0.06)] pb-3 flex items-center gap-2">
              ⚙️ Route Configuration
            </h2>

            {/* Streaming Toggle */}
            <div className="flex items-center justify-between bg-[#1E293B] p-3 rounded-xl border border-[rgba(148,163,184,0.05)]">
              <div>
                <label className="text-sm font-semibold block text-[#CBD5E1]">Stream Completions</label>
                <span className="text-[10px] text-[#94A3B8]">Live tokens visualizer</span>
              </div>
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`w-12 h-6 rounded-full transition-all duration-300 relative ${
                  isStreaming ? 'bg-[#10B981]' : 'bg-[#334155]'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${
                    isStreaming ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Temperature Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[#CBD5E1]">Temperature</span>
                <span className="font-mono text-[#10B981] px-2 py-0.5 rounded bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.1)]">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
              />
              <div className="flex justify-between text-[10px] text-[#94A3B8]">
                <span>Deterministic (0.0)</span>
                <span>Creative (2.0)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[#CBD5E1]">Max Completion Tokens</span>
                <span className="font-mono text-[#3B82F6] px-2 py-0.5 rounded bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.1)]">
                  {maxTokens}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="4096"
                step="50"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
              />
            </div>
          </section>

          {/* MODEL PICKER CARD */}
          <section className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 flex-1 max-h-[500px]">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#F8FAFC]">🧠 Model Catalog</h2>
              <span className="text-[10px] font-semibold font-mono text-[#94A3B8]">
                {filteredModels.length} models
              </span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models (e.g. gemini, deepseek)..."
                className="w-full bg-[#1E293B] border border-[rgba(148,163,184,0.1)] text-xs text-[#F8FAFC] placeholder-[#94A3B8] rounded-xl px-4 py-3 outline-none focus:border-[#10B981] transition-all"
              />
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {loadingModels ? (
                <div className="flex flex-col gap-4 py-8 items-center justify-center text-center">
                  <span className="w-8 h-8 rounded-full border-4 border-[#10B981] border-t-transparent animate-spin" />
                  <span className="text-xs text-[#94A3B8]">Downloading model lists...</span>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#94A3B8]">No matching models found.</div>
              ) : (
                filteredModels.map((m) => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`group cursor-pointer rounded-xl p-3.5 border transition-all duration-200 ${
                        isSelected
                          ? 'bg-[rgba(16,185,129,0.04)] border-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.06)]'
                          : 'bg-[#1E293B] border-[rgba(148,163,184,0.05)] hover:border-[rgba(148,163,184,0.15)]'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-xs font-bold transition-colors ${
                          isSelected ? 'text-[#10B981]' : 'text-[#F8FAFC] group-hover:text-[#10B981]'
                        }`}>
                          {m.name || m.id.split('/').pop()?.toUpperCase()}
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#94A3B8] truncate mt-0.5">{m.id}</div>
                      
                      <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono border-t border-[rgba(148,163,184,0.03)] pt-2 text-[#CBD5E1]">
                        <div>In: {formatCost(m.pricing.prompt)}</div>
                        <div>Out: {formatCost(m.pricing.completion)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE CONSOLE (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* SANDBOX TABS */}
          <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl shadow-2xl flex flex-col min-h-[600px] relative overflow-hidden">
            
            {/* TAB SELECTOR */}
            <div className="flex justify-between items-center border-b border-[rgba(148,163,184,0.08)] bg-[#0F172A] px-6 py-4">
              <div className="flex gap-2">
                {(['chat', 'code', 'payload'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                      activeTab === tab
                        ? 'bg-[#1E293B] text-[#10B981] border border-[rgba(16,185,129,0.2)]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="text-xs text-[#94A3B8] flex items-center gap-2">
                <span className="text-[10px] text-[#CBD5E1] bg-[#1E293B] px-2.5 py-1 rounded-md font-mono">
                  {selectedModel}
                </span>
              </div>
            </div>

            {/* TAB CONTENT: CHAT VIEW */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden min-h-[500px]">
                
                {/* Message Logs */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 max-h-[450px]">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 max-w-[85%] ${
                        msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        msg.role === 'user' ? 'bg-[#3B82F6] text-white' : 'bg-[#10B981] text-[#0B1120]'
                      }`}>
                        {msg.role === 'user' ? 'U' : 'AI'}
                      </div>
                      
                      {/* Bubble */}
                      <div className={`rounded-2xl p-4 border text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-[#1E293B] border-[rgba(59,130,246,0.15)] text-[#F8FAFC]'
                          : 'bg-[#0F172A] border-[rgba(148,163,184,0.08)] text-[#CBD5E1]'
                      }`}>
                        {msg.content || (
                          <div className="flex items-center gap-1.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input Prompt Box */}
                <div className="p-6 border-t border-[rgba(148,163,184,0.06)] bg-[#0F172A] flex gap-3">
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Enter prompt to execute via gateway..."
                    disabled={isSending}
                    className="flex-1 bg-[#1E293B] border border-[rgba(148,163,184,0.1)] text-sm rounded-xl px-4 outline-none focus:border-[#10B981] transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !inputPrompt.trim()}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B1120] flex items-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-[#0B1120] border-t-transparent animate-spin" />
                        Routing...
                      </>
                    ) : (
                      'Execute API'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AUTO CODE GENERATION */}
            {activeTab === 'code' && (
              <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden font-mono text-xs">
                <div className="flex justify-between items-center text-[#94A3B8]">
                  <span>TypeScript / JavaScript Fetch Client Template</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(getGeneratedCode())}
                    className="text-[10px] px-3 py-1 rounded bg-[#1E293B] border border-[rgba(148,163,184,0.1)] hover:text-[#10B981]"
                  >
                    Copy Code
                  </button>
                </div>
                <pre className="flex-1 bg-[#0B1120] border border-[rgba(148,163,184,0.06)] rounded-xl p-5 overflow-auto text-[#CBD5E1] max-h-[400px]">
                  <code>{getGeneratedCode()}</code>
                </pre>
              </div>
            )}

            {/* TAB CONTENT: PAYLOAD INSPECTOR */}
            {activeTab === 'payload' && (
              <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden font-mono text-xs">
                <div className="flex justify-between items-center text-[#94A3B8]">
                  <span>POST Payload structure sent to `/api/gateway/chat`</span>
                </div>
                <pre className="flex-1 bg-[#0B1120] border border-[rgba(148,163,184,0.06)] rounded-xl p-5 overflow-auto text-[#CBD5E1] max-h-[400px]">
                  <code>
                    {JSON.stringify({
                      model: selectedModel,
                      messages: messages,
                      temperature: temperature,
                      max_tokens: maxTokens,
                      stream: isStreaming
                    }, null, 2)}
                  </code>
                </pre>
              </div>
            )}
          </div>

          {/* TELEMETRY & RUNTIME ANALYTICS (REAL-TIME METRICS) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Latency Metric */}
            <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5 shadow-xl flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Total Latency</span>
              <span className="text-xl font-extrabold text-[#F8FAFC] mt-1.5 font-mono">
                {latency !== null ? `${(latency / 1000).toFixed(2)}s` : '--'}
              </span>
              <span className="text-[9px] text-[#94A3B8] mt-1">Network roundtrip delay</span>
            </div>

            {/* Time to First Token Metric */}
            <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5 shadow-xl flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">First Token (TTFT)</span>
              <span className="text-xl font-extrabold text-[#3B82F6] mt-1.5 font-mono">
                {firstTokenTime !== null ? `${Math.round(firstTokenTime)}ms` : '--'}
              </span>
              <span className="text-[9px] text-[#94A3B8] mt-1">Gateway response lag</span>
            </div>

            {/* Generation speed */}
            <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5 shadow-xl flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Speed Rate</span>
              <span className="text-xl font-extrabold text-[#10B981] mt-1.5 font-mono">
                {tokensPerSecond !== null ? `${tokensPerSecond} t/s` : '--'}
              </span>
              <span className="text-[9px] text-[#94A3B8] mt-1">Effective output speed</span>
            </div>

            {/* Latency Cost */}
            <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5 shadow-xl flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Estimated Cost</span>
              <span className="text-xl font-extrabold text-amber-400 mt-1.5 font-mono">
                {estimatedCost !== null ? `$${estimatedCost.toFixed(5)}` : '--'}
              </span>
              <span className="text-[9px] text-[#94A3B8] mt-1">Calculated from key rates</span>
            </div>
          </div>

          {/* SYSTEM logs SECTION */}
          {requestLogs.length > 0 && (
            <section className="bg-[#0F172A] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 shadow-2xl">
              <h2 className="text-sm font-bold text-[#F8FAFC] border-b border-[rgba(148,163,184,0.06)] pb-3 mb-4">
                📋 Gateway Event Log ({requestLogs.length})
              </h2>
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {requestLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs bg-[#1E293B] border border-[rgba(148,163,184,0.04)] px-4 py-2.5 rounded-xl font-mono"
                  >
                    <div className="flex gap-4 items-center">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                      }`} />
                      <span className="text-[#94A3B8] text-[10px]">{log.timestamp}</span>
                      <span className="text-[#CBD5E1] font-semibold">{log.model.split('/').pop()?.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-4 text-[#94A3B8] text-[10px]">
                      <span>Latency: {(log.latency / 1000).toFixed(2)}s</span>
                      <span>Tokens: {log.promptTokens + log.completionTokens}</span>
                      <span className="text-amber-400 font-semibold">${log.cost.toFixed(5)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
