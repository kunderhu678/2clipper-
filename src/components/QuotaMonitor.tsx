import { QuotaMetrics } from "../types";
import { formatDisplayTime } from "../utils/time";
import { Gauge, Cpu, Zap, HardDrive, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

interface QuotaMonitorProps {
  metrics: QuotaMetrics;
}

export function QuotaMonitor({ metrics }: QuotaMonitorProps) {
  // Estimated GitHub runner duration: ~30s setup + ~2s per clip with -c copy
  const estimatedGithubMins = Math.round(((metrics.githubDispatches * 40) / 60) * 10) / 10;
  const githubMaxMins = 2000; // Free monthly public/private quota
  const githubPercent = Math.min(100, Math.round((estimatedGithubMins / githubMaxMins) * 100));

  const groqMaxAudioSecs = 7200; // 2 hours daily estimate for free tier
  const groqPercent = Math.min(100, Math.round((metrics.groqAudioSeconds / groqMaxAudioSecs) * 100));

  const geminiMaxTokens = 1000000; // 1M tokens/min free tier RPM
  const totalTokens = metrics.geminiInputTokens + metrics.geminiOutputTokens;
  const geminiPercent = Math.min(100, Math.round((totalTokens / geminiMaxTokens) * 100));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Dynamic Free Tier Quota & Usage Monitor</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time tracking of 100% free tier serverless endpoints, tokens, and compute allocations.
          </p>
        </div>
      </div>

      {/* Quota Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Groq Whisper */}
        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Groq Whisper</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
              FREE
            </span>
          </div>

          <div>
            <div className="text-xl font-bold font-mono text-zinc-100">{metrics.groqCalls} calls</div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Audio transcribed: <strong className="text-zinc-200">{formatDisplayTime(metrics.groqAudioSeconds)}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Whisper Usage</span>
              <span>{groqPercent}%</span>
            </div>
            <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#222]">
              <div style={{ width: `${Math.max(4, groqPercent)}%` }} className="h-full bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* 2. Gemini 1.5/2.5/3.7 Flash */}
        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Gemini AI Flash</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
              FREE TIER
            </span>
          </div>

          <div>
            <div className="text-xl font-bold font-mono text-zinc-100">{totalTokens.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-400 font-mono">
              In: {metrics.geminiInputTokens.toLocaleString()} | Out: {metrics.geminiOutputTokens.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Token Quota</span>
              <span>{geminiPercent}% of limit</span>
            </div>
            <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#222]">
              <div style={{ width: `${Math.max(4, geminiPercent)}%` }} className="h-full bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* 3. GitHub Actions Runners */}
        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>GitHub Actions</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              2,000 Mins/mo
            </span>
          </div>

          <div>
            <div className="text-xl font-bold font-mono text-zinc-100">{metrics.githubDispatches} dispatches</div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Estimated usage: <strong className="text-zinc-200">{estimatedGithubMins} mins</strong> / 2,000
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Monthly Minutes</span>
              <span>{githubPercent}%</span>
            </div>
            <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#222]">
              <div style={{ width: `${Math.max(4, githubPercent)}%` }} className="h-full bg-emerald-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* 4. Koofr WebDAV Storage */}
        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Koofr WebDAV</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
              10 GB FREE
            </span>
          </div>

          <div>
            <div className="text-xl font-bold font-mono text-zinc-100">{metrics.webdavRequests} requests</div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Free cloud quota: <strong className="text-zinc-200">10,000 MB</strong>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Zero-RAM Streaming</span>
              <span className="text-emerald-400">Active</span>
            </div>
            <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#222]">
              <div style={{ width: "100%" }} className="h-full bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 0-RAM Serverless Architecture Benefits */}
      <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-3">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Why this architecture is 100% Free &amp; 0-RAM</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
          <div className="p-3 bg-[#141414] rounded-lg border border-[#222] space-y-1">
            <strong className="text-zinc-200 block font-semibold">1. Remote Zero-Reencode FFmpeg</strong>
            <p className="text-[11px] leading-relaxed">
              Using <code className="text-blue-400 font-mono bg-[#181818] px-1 rounded">-c copy</code> avoids expensive CPU/RAM transcoding. Cutting a 1GB file takes under 2 seconds.
            </p>
          </div>
          <div className="p-3 bg-[#141414] rounded-lg border border-[#222] space-y-1">
            <strong className="text-zinc-200 block font-semibold">2. External Free Runners</strong>
            <p className="text-[11px] leading-relaxed">
              GitHub Actions handles the downloading, stream chopping, and re-uploading without running any persistent backend servers.
            </p>
          </div>
          <div className="p-3 bg-[#141414] rounded-lg border border-[#222] space-y-1">
            <strong className="text-zinc-200 block font-semibold">3. Serverless SPA Frontend</strong>
            <p className="text-[11px] leading-relaxed">
              The React frontend can be hosted for $0 on Cloudflare Pages, Vercel, or Netlify, reading all secrets safely from localStorage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
