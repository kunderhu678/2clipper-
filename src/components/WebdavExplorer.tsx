import { useState, useEffect } from "react";
import { VaultConfig, WebDAVItem } from "../types";
import { WebDAVClient } from "../services/webdav";
import { formatBytes } from "../utils/time";
import {
  Folder,
  FileVideo,
  File,
  RefreshCw,
  ChevronRight,
  FolderPlus,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowUpLeft,
  Search,
  HardDrive,
  Info,
} from "lucide-react";

interface WebdavExplorerProps {
  config: VaultConfig;
  selectedVideo: WebDAVItem | null;
  onSelectVideo: (item: WebDAVItem) => void;
  onProceedToTranscribe: () => void;
  onOpenVault: () => void;
}

export function WebdavExplorer({
  config,
  selectedVideo,
  onSelectVideo,
  onProceedToTranscribe,
  onOpenVault,
}: WebdavExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>("/input");
  const [items, setItems] = useState<WebDAVItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [previewItem, setPreviewItem] = useState<WebDAVItem | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  const isConfigured = !!(config.koofrUsername && config.koofrAppPassword);

  const fetchDirectory = async (path: string) => {
    if (!isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const client = new WebDAVClient(config);
      const list = await client.listDirectory(path);
      setItems(list);
      setCurrentPath(path);
    } catch (err: any) {
      console.error("WebDAV Directory fetch error:", err);
      setError(err.message || "Failed to load directory items.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      fetchDirectory(currentPath);
    }
  }, [config.koofrBaseUrl, config.koofrUsername, config.koofrAppPassword, config.useServerProxy]);

  const handleNavigate = (item: WebDAVItem) => {
    if (item.type === "directory") {
      fetchDirectory(item.path);
    } else if (item.isVideo) {
      onSelectVideo(item);
    }
  };

  const handleGoUp = () => {
    if (currentPath === "/" || currentPath === "") return;
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    const parentPath = "/" + segments.join("/");
    fetchDirectory(parentPath || "/");
  };

  const handlePreviewVideo = async (item: WebDAVItem) => {
    setPreviewItem(item);
    setLoadingPreview(true);
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }

    try {
      const client = new WebDAVClient(config);
      const blob = await client.getFileBlob(item.path);
      const objectUrl = URL.createObjectURL(blob);
      setVideoBlobUrl(objectUrl);
    } catch (err: any) {
      console.error("Preview video load error:", err);
      alert(`Could not load video preview: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }
    setPreviewItem(null);
  };

  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const videoItems = filteredItems.filter((i) => i.isVideo);

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation Card */}
      <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Koofr WebDAV Directory Explorer</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Browse remote videos stored in your Koofr cloud. Select any video from <code className="text-zinc-200 bg-[#161616] border border-[#2a2a2a] px-1 py-0.5 rounded font-mono">/input</code> to extract viral highlights with Groq and Gemini.
          </p>
        </div>

        {/* Quick Path Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDirectory("/input")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              currentPath === "/input"
                ? "bg-blue-600/15 text-blue-300 border-blue-500/50"
                : "bg-[#141414] text-zinc-400 border-[#222] hover:text-zinc-200 hover:border-[#333]"
            }`}
          >
            /input folder
          </button>
          <button
            onClick={() => fetchDirectory("/output")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              currentPath === "/output"
                ? "bg-blue-600/15 text-blue-300 border-blue-500/50"
                : "bg-[#141414] text-zinc-400 border-[#222] hover:text-zinc-200 hover:border-[#333]"
            }`}
          >
            /output folder
          </button>
          <button
            onClick={() => fetchDirectory(currentPath)}
            disabled={loading || !isConfigured}
            className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-zinc-300 disabled:opacity-50 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Vault Not Configured Alert */}
      {!isConfigured && (
        <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-start gap-3 text-xs text-blue-200">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-white">Koofr WebDAV Credentials Missing</h3>
            <p className="text-zinc-300 leading-relaxed">
              To list and stream your video files, please open the Config Vault and provide your Koofr WebDAV Email and App Password.
            </p>
            <button
              onClick={onOpenVault}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              Open Config Vault
            </button>
          </div>
        </div>
      )}

      {/* Explorer Content Container */}
      <div className="rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] overflow-hidden shadow-sm">
        {/* Navigation / Breadcrumbs Toolbar */}
        <div className="p-3 border-b border-[#1f1f1f] bg-[#141414] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {currentPath !== "/" && (
              <button
                onClick={handleGoUp}
                className="p-1 rounded bg-[#1f1f1f] hover:bg-[#282828] text-zinc-300 border border-[#2b2b2b] transition-colors"
                title="Go up to parent folder"
              >
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-zinc-500 font-mono text-[10px] uppercase font-bold tracking-wider">Location:</span>
            <span className="font-mono text-zinc-200 bg-[#1c1c1c] px-2 py-0.5 rounded border border-[#2e2e2e]">
              {currentPath}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[#161616] border border-[#2a2a2a] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500 w-44"
              />
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {videoItems.length} video{videoItems.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Directory Items List */}
        <div className="divide-y divide-[#181818] max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-zinc-400 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" />
              <p className="text-xs font-mono">Querying Koofr WebDAV via PROPFIND...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3 text-xs">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
              <div className="text-rose-300 font-medium">{error}</div>
              {error.includes("404") && (
                <p className="text-zinc-400">
                  Tip: In your Koofr account, make sure a folder named <code className="text-zinc-200">input</code> exists at the root.
                </p>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2 text-xs">
              <Folder className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="font-semibold text-zinc-300">Folder is empty</p>
              <p className="text-zinc-500">
                Upload your videos (.mp4, .mkv, .mov) into Koofr's <code className="text-zinc-300 font-mono">{currentPath}</code> folder.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedVideo?.path === item.path;
              return (
                <div
                  key={item.path}
                  className={`px-4 py-3 flex items-center justify-between hover:bg-[#161616] transition-colors text-xs ${
                    isSelected ? "bg-blue-600/10 border-l-2 border-blue-500" : ""
                  }`}
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 mr-3"
                    onClick={() => handleNavigate(item)}
                  >
                    {item.type === "directory" ? (
                      <Folder className="w-5 h-5 text-blue-400 shrink-0" />
                    ) : item.isVideo ? (
                      <FileVideo className="w-5 h-5 text-blue-400 shrink-0" />
                    ) : (
                      <File className="w-5 h-5 text-zinc-500 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200 truncate">{item.name}</span>
                        {item.isVideo && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                            {item.extension || "VIDEO"}
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono font-bold bg-blue-600 text-white shadow-sm">
                            Active Target
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-3 mt-0.5 font-mono">
                        {item.type === "file" && <span>{formatBytes(item.size)}</span>}
                        {item.lastModified && <span>{new Date(item.lastModified).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Video / Directory */}
                  <div className="flex items-center gap-2">
                    {item.isVideo && (
                      <>
                        <button
                          onClick={() => handlePreviewVideo(item)}
                          className="px-2.5 py-1 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300 border border-[#2b2b2b] font-medium flex items-center gap-1 transition-colors"
                          title="Preview stream in player"
                        >
                          <Play className="w-3 h-3 text-blue-400" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectVideo(item);
                            onProceedToTranscribe();
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Select & Transcribe &rarr;</span>
                        </button>
                      </>
                    )}
                    {item.type === "directory" && (
                      <button
                        onClick={() => fetchDirectory(item.path)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a] transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Video Preview Modal / Drawer */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between bg-[#141414]">
              <div className="flex items-center gap-2 truncate mr-2">
                <FileVideo className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold text-zinc-100 text-sm truncate">{previewItem.name}</span>
              </div>
              <button onClick={closePreview} className="text-zinc-400 hover:text-zinc-100 text-lg">
                &times;
              </button>
            </div>

            <div className="p-4 space-y-4">
              {loadingPreview ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400 space-y-3 bg-[#141414] rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <p className="text-xs font-mono">Streaming video buffer from WebDAV...</p>
                </div>
              ) : videoBlobUrl ? (
                <video
                  src={videoBlobUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[380px] bg-black rounded-lg border border-[#1f1f1f]"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 text-xs bg-[#141414] rounded-lg">
                  Unable to display video preview.
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 font-mono">
                <div>
                  Size: <span className="text-zinc-200">{formatBytes(previewItem.size)}</span>
                </div>
                <button
                  onClick={() => {
                    onSelectVideo(previewItem);
                    closePreview();
                    onProceedToTranscribe();
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Choose This Video for AI Clipping</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
