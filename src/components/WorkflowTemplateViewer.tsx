import { useState } from "react";
import { WORKFLOW_YML_TEMPLATE, SETUP_STEPS } from "../utils/workflowTemplate";
import {
  FileCode,
  Copy,
  Check,
  Download,
  Key,
  Terminal,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export function WorkflowTemplateViewer() {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(WORKFLOW_YML_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadYaml = () => {
    const dataStr = "data:text/yaml;charset=utf-8," + encodeURIComponent(WORKFLOW_YML_TEMPLATE);
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = "chop_video.yml";
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">GitHub Actions Workflow YAML Template</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Copy and commit this workflow file to your GitHub repository at <code className="text-zinc-200 bg-[#161616] border border-[#2a2a2a] px-1 py-0.5 rounded font-mono">.github/workflows/chop_video.yml</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadYaml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-zinc-200 border border-[#262626] text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .yml</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Workflow YAML"}</span>
          </button>
        </div>
      </div>

      {/* Step-by-Step Setup Guide */}
      <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-4">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
          Quick 5-Step Integration Walkthrough
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SETUP_STEPS.map((step) => (
            <div key={step.step} className="p-3.5 bg-[#141414] rounded-lg border border-[#222] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold font-mono border border-blue-500/40">
                  {step.step}
                </span>
                <h4 className="font-semibold text-white text-xs">{step.title}</h4>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Repository Secrets Checklist */}
      <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-white uppercase tracking-tight">Recommended GitHub Repository Secrets</h3>
        </div>
        <p className="text-zinc-400">
          In GitHub &rarr; Repo &rarr; Settings &rarr; Secrets and variables &rarr; Actions, add these secrets to keep your credentials masked:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
          <div className="p-2.5 bg-[#141414] rounded border border-[#222]">
            <div className="text-blue-400 font-bold">KOOFR_BASE_URL</div>
            <div className="text-zinc-500 text-[10px] mt-1 font-mono">https://app.koofr.net/dav/Koofr</div>
          </div>
          <div className="p-2.5 bg-[#141414] rounded border border-[#222]">
            <div className="text-blue-400 font-bold">KOOFR_USERNAME</div>
            <div className="text-zinc-500 text-[10px] mt-1 font-mono">your Koofr account email</div>
          </div>
          <div className="p-2.5 bg-[#141414] rounded border border-[#222]">
            <div className="text-blue-400 font-bold">KOOFR_APP_PASSWORD</div>
            <div className="text-zinc-500 text-[10px] mt-1 font-mono">generated in Koofr Password settings</div>
          </div>
        </div>
      </div>

      {/* Interactive YAML Viewer */}
      <div className="rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-[#141414] border-b border-[#1f1f1f] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">.github/workflows/chop_video.yml</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-400 transition-colors font-mono"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[500px] leading-relaxed select-all bg-[#0a0a0a]">
          {WORKFLOW_YML_TEMPLATE}
        </pre>
      </div>
    </div>
  );
}
