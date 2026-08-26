import { useState, useEffect } from "react";
import { HttpLogEntry, ServiceType } from "../types";
import { logger } from "../services/logger";
import {
  Terminal,
  X,
  Trash2,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface DebuggerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebuggerDrawer({ isOpen, onClose }: DebuggerDrawerProps) {
  const [logs, setLogs] = useState<HttpLogEntry[]>([]);
  const [selectedService, setSelectedService] = useState<string>("All");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (selectedService === "All") return true;
    return log.service === selectedService;
  });

  const handleCopyCurl = (log: HttpLogEntry) => {
    const curl = `curl -X ${log.method.split(" ")[0]} "${log.url}"`;
    navigator.clipboard.writeText(curl);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(logger.exportLogsJson());
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `clipforge-debug-logs-${Date.now()}.json`;
    a.click();
  };

  const services = ["All", "WebDAV", "Groq", "Gemini", "GitHub", "System"];

  return (
    <div
      className={`fixed bottom-0 right-0 z-40 bg-[#0a0a0a] border-t border-l border-[#1f1f1f] shadow-2xl flex flex-col transition-all duration-200 ${
        isMaximized ? "w-full h-full" : "w-full md:w-3/5 lg:w-1/2 h-[450px]"
      }`}
    >
      {/* Drawer Header */}
      <div className="px-4 py-3 bg-[#0f0f0f] border-b border-[#1f1f1f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white text-xs uppercase tracking-tight">Live HTTP &amp; WebDAV XML Debugger</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] text-blue-400 border border-[#222]">
            {logs.length} events
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#141414] transition-colors"
            title={isMaximized ? "Restore Size" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownloadLogs}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#141414] transition-colors"
            title="Download Logs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => logger.clear()}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-[#141414] transition-colors"
            title="Clear Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#141414] transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <Filter className="w-3 h-3 text-zinc-500 mr-1 shrink-0" />
        {services.map((svc) => (
          <button
            key={svc}
            onClick={() => setSelectedService(svc)}
            className={`px-2.5 py-0.5 rounded-lg font-mono text-[10px] font-semibold transition-colors ${
              selectedService === svc
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/40"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#141414]"
            }`}
          >
            {svc}
          </button>
        ))}
      </div>

      {/* Logs Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#141414] p-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">No HTTP events recorded for this service.</div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isSuccess = log.status >= 200 && log.status < 300;
            const isMultiStatus = log.status === 207;

            return (
              <div key={log.id} className="py-2 px-2 hover:bg-[#141414] rounded transition-colors">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}

                    <span className="text-[10px] text-zinc-500 shrink-0 font-mono">{log.timestamp}</span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold shrink-0 ${
                        log.service === "WebDAV"
                          ? "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                          : log.service === "Groq"
                          ? "bg-orange-950/80 text-orange-300 border border-orange-800/60"
                          : log.service === "Gemini"
                          ? "bg-purple-950/80 text-purple-300 border border-purple-800/60"
                          : log.service === "GitHub"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                          : "bg-[#141414] text-zinc-400 border border-[#222]"
                      }`}
                    >
                      {log.service}
                    </span>

                    <span className="font-bold text-white shrink-0 font-mono">{log.method}</span>

                    <span className="text-zinc-400 truncate text-[11px] font-mono">{log.url}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isMultiStatus
                          ? "bg-blue-950 text-blue-300 border border-blue-800"
                          : isSuccess
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-rose-950 text-rose-300 border border-rose-800"
                      }`}
                    >
                      {log.status || "ERR"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{log.durationMs}ms</span>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div className="mt-2 pl-6 pr-2 space-y-2 text-[11px] border-l border-[#222] ml-1">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-zinc-500 font-bold font-mono">URL:</span>
                      <button
                        onClick={() => handleCopyCurl(log)}
                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline font-mono"
                      >
                        {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === log.id ? "Copied cURL" : "Copy cURL"}</span>
                      </button>
                    </div>
                    <div className="text-zinc-300 break-all select-all font-mono">{log.url}</div>

                    {log.requestHeaders && (
                      <div>
                        <span className="text-zinc-500 font-bold font-mono block mb-0.5">Request Headers:</span>
                        <pre className="p-2 bg-[#141414] rounded border border-[#222] text-zinc-400 overflow-x-auto text-[10px]">
                          {JSON.stringify(log.requestHeaders, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.requestBody && (
                      <div>
                        <span className="text-zinc-500 font-bold font-mono block mb-0.5">Request Payload:</span>
                        <pre className="p-2 bg-[#141414] rounded border border-[#222] text-zinc-400 overflow-x-auto text-[10px]">
                          {typeof log.requestBody === "string"
                            ? log.requestBody
                            : JSON.stringify(log.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.responseBody && (
                      <div>
                        <span className="text-zinc-500 font-bold font-mono block mb-0.5">Response Data / XML:</span>
                        <pre className="p-2 bg-[#141414] rounded border border-[#222] text-zinc-300 overflow-x-auto text-[10px] max-h-40">
                          {typeof log.responseBody === "string"
                            ? log.responseBody
                            : JSON.stringify(log.responseBody, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.error && (
                      <div>
                        <span className="text-rose-400 font-bold font-mono block mb-0.5">Error Trace:</span>
                        <pre className="p-2 bg-rose-950/40 rounded border border-rose-900 text-rose-300 overflow-x-auto text-[10px]">
                          {log.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
