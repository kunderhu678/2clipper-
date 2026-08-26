import { ActiveTab, VaultConfig } from "../types";
import {
  Layers,
  FolderTree,
  FileAudio,
  Sparkles,
  Scissors,
  FileCode,
  Gauge,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Terminal,
} from "lucide-react";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  vaultConfig: VaultConfig;
  onOpenVault: () => void;
  onOpenDebugger: () => void;
  selectedVideoName: string | null;
  clipsCount: number;
}

export function Header({
  activeTab,
  setActiveTab,
  vaultConfig,
  onOpenVault,
  onOpenDebugger,
  selectedVideoName,
  clipsCount,
}: HeaderProps) {
  // Service status checks
  const isWebdavReady = !!(vaultConfig.koofrUsername && vaultConfig.koofrAppPassword);
  const isGroqReady = !!vaultConfig.groqApiKey;
  const isGeminiReady = !!vaultConfig.geminiApiKey;
  const isGithubReady = !!(vaultConfig.githubPat && vaultConfig.githubOwner && vaultConfig.githubRepo);

  const tabs: { id: ActiveTab; label: string; icon: any; countBadge?: number; disabled?: boolean }[] = [
    { id: "webdav", label: "1. WebDAV Files", icon: FolderTree },
    { id: "subtitles", label: "2. Transcribe", icon: FileAudio },
    { id: "moments", label: "3. AI Moments", icon: Sparkles, countBadge: clipsCount > 0 ? clipsCount : undefined },
    { id: "chopper", label: "4. Action Chopper", icon: Scissors },
    { id: "workflow-code", label: "Workflow YAML", icon: FileCode },
    { id: "quotas", label: "Quotas", icon: Gauge },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#1f1f1f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight uppercase">ClipForge WebDAV</h1>
                <span className="px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded">
                  0-RAM Serverless
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Koofr + Groq Whisper + Gemini + GitHub Actions</p>
            </div>
          </div>

          {/* Service Status Badges */}
          <div className="hidden lg:flex items-center gap-3 bg-[#141414] px-3.5 py-1.5 rounded-lg border border-[#222] text-xs">
            <div className="flex items-center gap-1.5" title="Koofr WebDAV">
              <span className={`w-2 h-2 rounded-full ${isWebdavReady ? "bg-emerald-500 shadow-sm" : "bg-amber-500 animate-pulse"}`} />
              <span className="text-zinc-300 font-mono text-[11px]">WebDAV</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1.5" title="Groq Whisper">
              <span className={`w-2 h-2 rounded-full ${isGroqReady ? "bg-emerald-500 shadow-sm" : "bg-amber-500 animate-pulse"}`} />
              <span className="text-zinc-300 font-mono text-[11px]">Groq</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1.5" title="Gemini AI">
              <span className={`w-2 h-2 rounded-full ${isGeminiReady ? "bg-emerald-500 shadow-sm" : "bg-amber-500 animate-pulse"}`} />
              <span className="text-zinc-300 font-mono text-[11px]">Gemini</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1.5" title="GitHub Actions">
              <span className={`w-2 h-2 rounded-full ${isGithubReady ? "bg-emerald-500 shadow-sm" : "bg-amber-500 animate-pulse"}`} />
              <span className="text-zinc-300 font-mono text-[11px]">GitHub</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              id="open-vault-btn"
              onClick={onOpenVault}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isWebdavReady && isGroqReady && isGithubReady
                  ? "bg-[#181818] hover:bg-[#222] text-zinc-200 border border-[#2b2b2b]"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Config Vault</span>
              {!(isWebdavReady && isGroqReady && isGithubReady) && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 animate-ping" />
              )}
            </button>

            <button
              id="open-debugger-btn"
              onClick={onOpenDebugger}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#1f1f1f] text-zinc-300 border border-[#262626] transition-colors"
              title="Open HTTP / XML Debugger"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Debugger</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-[#1a1a1a]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#1f1f1f] text-white border border-[#333] shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#141414] border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
                {tab.countBadge !== undefined && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded bg-blue-950 text-blue-300 font-bold border border-blue-800/80">
                    {tab.countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Selected video context strip */}
      {selectedVideoName && (
        <div className="bg-[#121212] border-t border-[#1f1f1f] px-4 sm:px-6 py-1.5 text-xs text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider font-semibold">Active Target:</span>
            <span className="font-semibold text-blue-300 truncate font-mono text-xs">{selectedVideoName}</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Source: /input/{selectedVideoName}</span>
        </div>
      )}
    </header>
  );
}
