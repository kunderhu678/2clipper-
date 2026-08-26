/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ActiveTab, MomentClip, QuotaMetrics, SubtitleSegment, VaultConfig, WebDAVItem } from "./types";
import { Header } from "./components/Header";
import { VaultModal } from "./components/VaultModal";
import { WebdavExplorer } from "./components/WebdavExplorer";
import { SubtitleExtractor } from "./components/SubtitleExtractor";
import { MomentAnalyzer } from "./components/MomentAnalyzer";
import { GitHubDispatcher } from "./components/GitHubDispatcher";
import { WorkflowTemplateViewer } from "./components/WorkflowTemplateViewer";
import { QuotaMonitor } from "./components/QuotaMonitor";
import { DebuggerDrawer } from "./components/DebuggerDrawer";
import { Terminal, Scissors, Sparkles, FolderTree, FileAudio, FileCode, Gauge } from "lucide-react";

const STORAGE_KEY = "clipforge_vault_config";
const METRICS_KEY = "clipforge_quota_metrics";

const DEFAULT_CONFIG: VaultConfig = {
  koofrBaseUrl: "https://app.koofr.net/dav/Koofr",
  koofrUsername: "",
  koofrAppPassword: "",
  groqApiKey: "",
  geminiApiKey: "",
  githubPat: "",
  githubOwner: "",
  githubRepo: "",
  githubBranch: "main",
  workflowEventName: "chop-video",
  useServerProxy: true,
};

const DEFAULT_METRICS: QuotaMetrics = {
  groqCalls: 0,
  groqAudioSeconds: 0,
  geminiInputTokens: 0,
  geminiOutputTokens: 0,
  githubDispatches: 0,
  webdavRequests: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("webdav");
  const [isVaultOpen, setIsVaultOpen] = useState<boolean>(false);
  const [isDebuggerOpen, setIsDebuggerOpen] = useState<boolean>(false);

  // Vault Config stored in localStorage
  const [vaultConfig, setVaultConfig] = useState<VaultConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.warn("Failed to load vault config from localStorage:", e);
    }
    return DEFAULT_CONFIG;
  });

  // Quota Metrics
  const [quotaMetrics, setQuotaMetrics] = useState<QuotaMetrics>(() => {
    try {
      const saved = localStorage.getItem(METRICS_KEY);
      if (saved) return { ...DEFAULT_METRICS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn("Failed to load metrics from localStorage:", e);
    }
    return DEFAULT_METRICS;
  });

  // Active Workflow State
  const [selectedVideo, setSelectedVideo] = useState<WebDAVItem | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [clips, setClips] = useState<MomentClip[]>([]);

  // Save vault config to localStorage
  const handleSaveVault = (newConfig: VaultConfig) => {
    setVaultConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.warn("Failed to save vault config to localStorage:", e);
    }
  };

  // Save metrics to localStorage
  const updateMetrics = (updater: (prev: QuotaMetrics) => QuotaMetrics) => {
    setQuotaMetrics((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(METRICS_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // When subtitles loaded
  const handleSubtitlesLoaded = (segments: SubtitleSegment[]) => {
    setSubtitles(segments);
    const audioSecs = segments.length > 0 ? segments[segments.length - 1].end : 0;
    updateMetrics((prev) => ({
      ...prev,
      groqCalls: prev.groqCalls + 1,
      groqAudioSeconds: prev.groqAudioSeconds + Math.round(audioSecs),
    }));
  };

  // When Gemini moments extracted
  const handleTokensUsed = (tokens: { input: number; output: number }) => {
    updateMetrics((prev) => ({
      ...prev,
      geminiInputTokens: prev.geminiInputTokens + tokens.input,
      geminiOutputTokens: prev.geminiOutputTokens + tokens.output,
    }));
  };

  // When GitHub dispatch triggered
  const handleDispatchSuccess = () => {
    updateMetrics((prev) => ({
      ...prev,
      githubDispatches: prev.githubDispatches + 1,
    }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-blue-600/30 selection:text-blue-200 flex flex-col justify-between">
      <div>
        {/* Main Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          vaultConfig={vaultConfig}
          onOpenVault={() => setIsVaultOpen(true)}
          onOpenDebugger={() => setIsDebuggerOpen((prev) => !prev)}
          selectedVideoName={selectedVideo?.name || null}
          clipsCount={clips.length}
        />

        {/* Main Content Viewport */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === "webdav" && (
            <WebdavExplorer
              config={vaultConfig}
              selectedVideo={selectedVideo}
              onSelectVideo={(item) => setSelectedVideo(item)}
              onProceedToTranscribe={() => setActiveTab("subtitles")}
              onOpenVault={() => setIsVaultOpen(true)}
            />
          )}

          {activeTab === "subtitles" && (
            <SubtitleExtractor
              config={vaultConfig}
              selectedVideo={selectedVideo}
              subtitles={subtitles}
              onSubtitlesLoaded={handleSubtitlesLoaded}
              onProceedToMoments={() => setActiveTab("moments")}
              onOpenVault={() => setIsVaultOpen(true)}
            />
          )}

          {activeTab === "moments" && (
            <MomentAnalyzer
              config={vaultConfig}
              selectedVideo={selectedVideo}
              subtitles={subtitles}
              clips={clips}
              onClipsChange={setClips}
              onProceedToChopper={() => setActiveTab("chopper")}
              onOpenVault={() => setIsVaultOpen(true)}
              onTokensUsed={handleTokensUsed}
            />
          )}

          {activeTab === "chopper" && (
            <GitHubDispatcher
              config={vaultConfig}
              selectedVideo={selectedVideo}
              clips={clips}
              onOpenVault={() => setIsVaultOpen(true)}
              onNavigateToOutput={() => setActiveTab("webdav")}
              onDispatchSuccess={handleDispatchSuccess}
            />
          )}

          {activeTab === "workflow-code" && <WorkflowTemplateViewer />}

          {activeTab === "quotas" && <QuotaMonitor metrics={quotaMetrics} />}
        </main>
      </div>

      {/* Floating Bottom Debugger Button */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          id="floating-debugger-toggle"
          onClick={() => setIsDebuggerOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#141414]/95 hover:bg-[#1f1f1f] border border-[#262626] text-xs font-semibold text-zinc-200 shadow-xl backdrop-blur transition-all hover:scale-105 active:scale-95"
        >
          <Terminal className="w-4 h-4 text-blue-400" />
          <span>HTTP Debugger</span>
        </button>
      </div>

      {/* Vault Settings Modal */}
      <VaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        config={vaultConfig}
        onSave={handleSaveVault}
      />

      {/* Debugger Drawer */}
      <DebuggerDrawer
        isOpen={isDebuggerOpen}
        onClose={() => setIsDebuggerOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] bg-[#0f0f0f] py-3.5 px-4 sm:px-6 text-center text-[11px] text-zinc-500 font-mono">
        <p>
          ClipForge WebDAV &bull; 0-RAM Serverless Orchestration &bull; Koofr WebDAV + Groq Whisper + Gemini AI + GitHub Actions FFmpeg
        </p>
      </footer>
    </div>
  );
}
