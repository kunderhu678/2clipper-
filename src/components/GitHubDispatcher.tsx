import { useState, useEffect } from "react";
import { GitHubWorkflowRun, MomentClip, VaultConfig, WebDAVItem } from "../types";
import { GitHubService } from "../services/github";
import {
  Scissors,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Loader2,
  FolderCheck,
  Code,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface GitHubDispatcherProps {
  config: VaultConfig;
  selectedVideo: WebDAVItem | null;
  clips: MomentClip[];
  onOpenVault: () => void;
  onNavigateToOutput: () => void;
  onDispatchSuccess?: () => void;
}

export function GitHubDispatcher({
  config,
  selectedVideo,
  clips,
  onOpenVault,
  onNavigateToOutput,
  onDispatchSuccess,
}: GitHubDispatcherProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPayload, setShowPayload] = useState<boolean>(false);
  const [runs, setRuns] = useState<GitHubWorkflowRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState<boolean>(false);

  const isGithubReady = !!(config.githubPat && config.githubOwner && config.githubRepo);
  const videoName = selectedVideo?.name || "sample_video.mp4";
  const cleanBaseName = videoName.replace(/\.[^/.]+$/, "");
  const targetOutputFolder = `/output/${cleanBaseName}`;

  // Fetch recent GitHub Action runs
  const fetchRuns = async () => {
    if (!isGithubReady) return;
    setLoadingRuns(true);
    try {
      const recent = await GitHubService.getRecentWorkflowRuns(config);
      setRuns(recent);
    } catch (err) {
      console.warn("Could not fetch workflow runs:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    if (isGithubReady) {
      fetchRuns();
    }
  }, [config.githubPat, config.githubOwner, config.githubRepo]);

  // Dispatch Action
  const handleDispatch = async () => {
    if (!isGithubReady) {
      setError("Please configure your GitHub Personal Access Token, Owner, and Repo in Settings Vault.");
      return;
    }
    if (clips.length === 0) {
      setError("Please extract or create at least 1 clip moment to chop.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg(null);

    try {
      const res = await GitHubService.dispatchChopAction(config, videoName, clips);
      setStatusMsg(res.message);
      if (onDispatchSuccess) onDispatchSuccess();

      // Poll for new run after a short delay
      setTimeout(() => {
        fetchRuns();
      }, 3000);
    } catch (err: any) {
      console.error("Dispatch Error:", err);
      setError(err.message || "Failed to trigger GitHub Actions dispatch.");
    } finally {
      setLoading(false);
    }
  };

  const samplePayload = {
    event_type: config.workflowEventName || "chop-video",
    client_payload: {
      video_filename: videoName,
      clips: clips.map((c, idx) => ({
        index: idx + 1,
        title: c.title,
        start: c.start,
        end: c.end,
        startFormatted: c.startFormatted,
        endFormatted: c.endFormatted,
        duration: c.duration,
      })),
      koofr_base_url: config.koofrBaseUrl || "https://app.koofr.net/dav/Koofr",
      koofr_username: config.koofrUsername,
      koofr_app_password: config.koofrAppPassword ? "[REDACTED]" : "",
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Automated Video Chopping (GitHub Actions)</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Trigger a 0-RAM FFmpeg stream-copy job on GitHub's cloud runners to download, cut, and upload clips directly back to Koofr.
          </p>
        </div>

        <button
          onClick={fetchRuns}
          disabled={loadingRuns || !isGithubReady}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-semibold text-zinc-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingRuns ? "animate-spin" : ""}`} />
          <span>Refresh Runs</span>
        </button>
      </div>

      {/* GitHub Credentials Alert */}
      {!isGithubReady && (
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-zinc-300">GitHub PAT & Repository details are required to trigger video chopping workflows.</span>
          </div>
          <button
            onClick={onOpenVault}
            className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-sm"
          >
            Configure GitHub
          </button>
        </div>
      )}

      {/* Chopping Plan Summary Card */}
      <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-4">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
          Chopping Execution Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#141414] rounded-lg border border-[#222] space-y-1">
            <span className="text-zinc-500 font-mono text-[10px] uppercase font-bold">SOURCE VIDEO</span>
            <div className="font-semibold text-zinc-200 truncate font-mono">/input/{videoName}</div>
          </div>
          <div className="p-3 bg-[#141414] rounded-lg border border-[#222] space-y-1">
            <span className="text-zinc-500 font-mono text-[10px] uppercase font-bold">DESTINATION WEBDAV FOLDER</span>
            <div className="font-semibold text-blue-400 truncate font-mono">{targetOutputFolder}/</div>
          </div>
          <div className="p-3 bg-[#141414] rounded-lg border border-[#222] space-y-1">
            <span className="text-zinc-500 font-mono text-[10px] uppercase font-bold">CLIPS TO CHOP</span>
            <div className="font-semibold text-zinc-200 font-mono">{clips.length} moment clips ready</div>
          </div>
        </div>

        {/* Dispatch Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleDispatch}
            disabled={loading || clips.length === 0 || !isGithubReady}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>Dispatch Chopping Action to GitHub</span>
          </button>

          <button
            onClick={() => setShowPayload(!showPayload)}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono"
          >
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span>{showPayload ? "Hide" : "Inspect"} Repository Dispatch Payload</span>
            {showPayload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Payload Collapsible JSON */}
        {showPayload && (
          <div className="p-3 bg-[#141414] rounded-lg border border-[#262626] font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-60">
            <pre>{JSON.stringify(samplePayload, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* GitHub Workflow Runs List */}
      <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Recent GitHub Actions Runs</span>
              {isGithubReady && (
                <span className="text-xs text-blue-400 font-mono">
                  ({config.githubOwner}/{config.githubRepo})
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live status of chopping workflows triggered in your GitHub repository.
            </p>
          </div>

          <button
            onClick={onNavigateToOutput}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-zinc-200 border border-[#262626] text-xs font-semibold transition-colors"
          >
            <FolderCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>View /output on WebDAV &rarr;</span>
          </button>
        </div>

        <div className="divide-y divide-[#181818] max-h-72 overflow-y-auto">
          {loadingRuns && runs.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span>Fetching recent workflow runs...</span>
            </div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs space-y-1">
              <p className="font-semibold text-zinc-300">No workflow runs recorded yet</p>
              <p>Trigger your first chopping dispatch above or ensure your GitHub PAT has Actions permissions.</p>
            </div>
          ) : (
            runs.map((run) => {
              const isRunning = run.status === "in_progress" || run.status === "queued";
              const isSuccess = run.conclusion === "success";
              const isFailed = run.conclusion === "failure";

              return (
                <div key={run.id} className="py-3 px-2 flex items-center justify-between text-xs hover:bg-[#141414] rounded transition-colors">
                  <div className="flex items-center gap-3 min-w-0 mr-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isRunning ? "bg-blue-400 animate-ping" : isSuccess ? "bg-emerald-400" : isFailed ? "bg-rose-500" : "bg-zinc-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 truncate">
                          Run #{run.run_number}: {run.name || "Video Chopper"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                            isRunning
                              ? "bg-blue-950 text-blue-300 border border-blue-800"
                              : isSuccess
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : isFailed
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-[#181818] text-zinc-400"
                          }`}
                        >
                          {run.status === "completed" ? run.conclusion || "done" : run.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-3 mt-0.5 font-mono">
                        <span>Event: {run.event}</span>
                        <span>Branch: {run.head_branch}</span>
                        <span>{new Date(run.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={run.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-zinc-300 border border-[#262626] text-xs font-semibold transition-colors shrink-0"
                  >
                    <span>Logs</span>
                    <ExternalLink className="w-3 h-3 text-blue-400" />
                  </a>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
