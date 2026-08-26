import { useState, ChangeEvent } from "react";
import { VaultConfig } from "../types";
import { WebDAVClient } from "../services/webdav";
import { GroqService } from "../services/groq";
import { GeminiService } from "../services/gemini";
import { GitHubService } from "../services/github";
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  RefreshCw,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VaultConfig;
  onSave: (config: VaultConfig) => void;
}

export function VaultModal({ isOpen, onClose, config, onSave }: VaultModalProps) {
  const [formData, setFormData] = useState<VaultConfig>({ ...config });
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [testingStatus, setTestingStatus] = useState<{
    webdav?: { loading: boolean; success?: boolean; message?: string };
    groq?: { loading: boolean; success?: boolean; message?: string };
    gemini?: { loading: boolean; success?: boolean; message?: string };
    github?: { loading: boolean; success?: boolean; message?: string };
  }>({});
  const [activeTab, setActiveTab] = useState<"credentials" | "backup">("credentials");

  if (!isOpen) return null;

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field: keyof VaultConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  // Test individual services
  const testWebDAV = async () => {
    setTestingStatus((prev) => ({ ...prev, webdav: { loading: true } }));
    const client = new WebDAVClient(formData);
    const result = await client.testConnection();
    setTestingStatus((prev) => ({
      ...prev,
      webdav: { loading: false, success: result.success, message: result.message },
    }));
  };

  const testGroq = async () => {
    setTestingStatus((prev) => ({ ...prev, groq: { loading: true } }));
    const result = await GroqService.testKey(formData.groqApiKey);
    setTestingStatus((prev) => ({
      ...prev,
      groq: { loading: false, success: result.success, message: result.message },
    }));
  };

  const testGemini = async () => {
    setTestingStatus((prev) => ({ ...prev, gemini: { loading: true } }));
    const result = await GeminiService.testKey(formData.geminiApiKey);
    setTestingStatus((prev) => ({
      ...prev,
      gemini: { loading: false, success: result.success, message: result.message },
    }));
  };

  const testGitHub = async () => {
    setTestingStatus((prev) => ({ ...prev, github: { loading: true } }));
    const result = await GitHubService.testConnection(formData);
    setTestingStatus((prev) => ({
      ...prev,
      github: { loading: false, success: result.success, message: result.message },
    }));
  };

  const exportConfigJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "clipforge-config.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importConfigJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (err) {
        alert("Invalid JSON configuration file.");
      }
    };
    reader.readAsText(file);
  };

  const fillKoofrPreset = () => {
    setFormData((prev) => ({
      ...prev,
      koofrBaseUrl: "https://app.koofr.net/dav/Koofr",
      workflowEventName: "chop-video",
      githubBranch: "main",
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#141414] border border-[#262626] text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-tight">Credentials &amp; Configuration Vault</h2>
              <p className="text-xs text-zinc-400">
                All credentials stay local in your browser's <code className="text-blue-400 font-mono">localStorage</code>.
              </p>
            </div>
          </div>
          <button
            id="close-vault-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#141414] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-[#1f1f1f] px-6 bg-[#0a0a0a] text-xs">
          <button
            onClick={() => setActiveTab("credentials")}
            className={`py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px] border-b-2 transition-colors ${
              activeTab === "credentials"
                ? "border-blue-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Services &amp; API Keys
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px] border-b-2 transition-colors ${
              activeTab === "backup"
                ? "border-blue-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Backup &amp; Presets
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-300">
          {activeTab === "credentials" ? (
            <>
              {/* 1. Koofr WebDAV Section */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="font-bold text-white text-xs uppercase tracking-tight">1. Koofr WebDAV Storage</h3>
                  </div>
                  <button
                    id="test-webdav-btn"
                    onClick={testWebDAV}
                    disabled={testingStatus.webdav?.loading || !formData.koofrUsername || !formData.koofrAppPassword}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-50 text-zinc-200 text-xs font-semibold border border-[#2a2a2a] transition-colors"
                  >
                    {testingStatus.webdav?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Test WebDAV</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-zinc-400 mb-1 font-mono text-[11px]">WebDAV Base URL</label>
                    <input
                      id="input-koofr-url"
                      type="text"
                      value={formData.koofrBaseUrl}
                      onChange={(e) => handleChange("koofrBaseUrl", e.target.value)}
                      placeholder="https://app.koofr.net/dav/Koofr"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-zinc-400 mb-1 font-mono text-[11px]">Koofr Email / Username</label>
                    <input
                      id="input-koofr-user"
                      type="text"
                      value={formData.koofrUsername}
                      onChange={(e) => handleChange("koofrUsername", e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 font-mono text-[11px]">Koofr App Password</label>
                      <span className="text-[11px] text-zinc-500 font-mono">Settings &gt; Password &gt; App Passwords</span>
                    </div>
                    <div className="relative">
                      <input
                        id="input-koofr-pass"
                        type={showPasswords.koofr ? "text" : "password"}
                        value={formData.koofrAppPassword}
                        onChange={(e) => handleChange("koofrAppPassword", e.target.value)}
                        placeholder="Generated App Password"
                        className="w-full px-3 py-2 pr-10 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("koofr")}
                        className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPasswords.koofr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {testingStatus.webdav && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-2 font-mono ${
                      testingStatus.webdav.success
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                        : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                    }`}
                  >
                    {testingStatus.webdav.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testingStatus.webdav.message}</span>
                  </div>
                )}
              </div>

              {/* 2. Groq Whisper API Section */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="font-bold text-white text-xs uppercase tracking-tight">2. Groq API (Whisper Speech-to-Text)</h3>
                  </div>
                  <button
                    id="test-groq-btn"
                    onClick={testGroq}
                    disabled={testingStatus.groq?.loading || !formData.groqApiKey}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-50 text-zinc-200 text-xs font-semibold border border-[#2a2a2a] transition-colors"
                  >
                    {testingStatus.groq?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Test Groq</span>
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400 font-mono text-[11px]">Groq API Key (gsk_...)</label>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline text-[11px] font-mono"
                    >
                      Get Free Key at console.groq.com &rarr;
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="input-groq-key"
                      type={showPasswords.groq ? "text" : "password"}
                      value={formData.groqApiKey}
                      onChange={(e) => handleChange("groqApiKey", e.target.value)}
                      placeholder="gsk_..."
                      className="w-full px-3 py-2 pr-10 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("groq")}
                      className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPasswords.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {testingStatus.groq && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-2 font-mono ${
                      testingStatus.groq.success
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                        : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                    }`}
                  >
                    {testingStatus.groq.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testingStatus.groq.message}</span>
                  </div>
                )}
              </div>

              {/* 3. Gemini API Section */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="font-bold text-white text-xs uppercase tracking-tight">3. Gemini API (Moment & Highlight AI)</h3>
                  </div>
                  <button
                    id="test-gemini-btn"
                    onClick={testGemini}
                    disabled={testingStatus.gemini?.loading || !formData.geminiApiKey}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-50 text-zinc-200 text-xs font-semibold border border-[#2a2a2a] transition-colors"
                  >
                    {testingStatus.gemini?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Test Gemini</span>
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400 font-mono text-[11px]">Gemini API Key (AIzaSy...)</label>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline text-[11px] font-mono"
                    >
                      Get Key at aistudio.google.com &rarr;
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="input-gemini-key"
                      type={showPasswords.gemini ? "text" : "password"}
                      value={formData.geminiApiKey}
                      onChange={(e) => handleChange("geminiApiKey", e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 pr-10 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("gemini")}
                      className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPasswords.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {testingStatus.gemini && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-2 font-mono ${
                      testingStatus.gemini.success
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                        : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                    }`}
                  >
                    {testingStatus.gemini.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testingStatus.gemini.message}</span>
                  </div>
                )}
              </div>

              {/* 4. GitHub Actions Section */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="font-bold text-white text-xs uppercase tracking-tight">4. GitHub Actions (Video Chopping Runner)</h3>
                  </div>
                  <button
                    id="test-github-btn"
                    onClick={testGitHub}
                    disabled={
                      testingStatus.github?.loading ||
                      !formData.githubPat ||
                      !formData.githubOwner ||
                      !formData.githubRepo
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-50 text-zinc-200 text-xs font-semibold border border-[#2a2a2a] transition-colors"
                  >
                    {testingStatus.github?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Test GitHub</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 font-mono text-[11px]">GitHub Personal Access Token (PAT)</label>
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline text-[11px] font-mono"
                      >
                        Generate PAT (repo / workflow scope) &rarr;
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        id="input-github-pat"
                        type={showPasswords.github ? "text" : "password"}
                        value={formData.githubPat}
                        onChange={(e) => handleChange("githubPat", e.target.value)}
                        placeholder="ghp_..."
                        className="w-full px-3 py-2 pr-10 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("github")}
                        className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPasswords.github ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-mono text-[11px]">Repository Owner</label>
                    <input
                      id="input-github-owner"
                      type="text"
                      value={formData.githubOwner}
                      onChange={(e) => handleChange("githubOwner", e.target.value)}
                      placeholder="e.g. your-username"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1 font-mono text-[11px]">Repository Name</label>
                    <input
                      id="input-github-repo"
                      type="text"
                      value={formData.githubRepo}
                      onChange={(e) => handleChange("githubRepo", e.target.value)}
                      placeholder="e.g. video-chopper"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1 font-mono text-[11px]">Dispatch Event Name</label>
                    <input
                      id="input-github-event"
                      type="text"
                      value={formData.workflowEventName}
                      onChange={(e) => handleChange("workflowEventName", e.target.value)}
                      placeholder="chop-video"
                      className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>

                {testingStatus.github && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-2 font-mono ${
                      testingStatus.github.success
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                        : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                    }`}
                  >
                    {testingStatus.github.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testingStatus.github.message}</span>
                  </div>
                )}
              </div>

              {/* 5. Proxy Configuration */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                <div>
                  <div className="font-bold text-white text-xs uppercase tracking-tight">Server Proxy for WebDAV CORS</div>
                  <div className="text-[11px] text-zinc-400">
                    Routes WebDAV requests via server proxy to bypass strict browser CORS. Keep enabled for best compatibility.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useServerProxy}
                    onChange={(e) => handleChange("useServerProxy", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[#262626] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </>
          ) : (
            /* Backup & Presets Tab */
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-tight">Preset Quick Fill</h3>
                <p className="text-xs text-zinc-400">
                  Pre-populates default Koofr WebDAV endpoints, standard branch names, and repository dispatch event names.
                </p>
                <button
                  type="button"
                  onClick={fillKoofrPreset}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] text-zinc-200 font-semibold text-xs border border-[#2a2a2a] transition-colors"
                >
                  Apply Koofr &amp; GitHub Actions Defaults
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-tight">Import &amp; Export Config</h3>
                <p className="text-xs text-zinc-400">
                  Save your credentials locally in an encrypted or private JSON file so you can easily reload them when opening the app on another browser.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={exportConfigJson}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] text-zinc-200 font-semibold text-xs border border-[#2a2a2a] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export JSON Backup</span>
                  </button>

                  <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] text-zinc-200 font-semibold text-xs border border-[#2a2a2a] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Import JSON Backup</span>
                    <input type="file" accept=".json" onChange={importConfigJson} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            Changes are saved to browser local storage.
          </span>
          <div className="flex items-center gap-2">
            <button
              id="cancel-vault-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-zinc-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-vault-btn"
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
