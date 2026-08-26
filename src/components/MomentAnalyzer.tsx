import { useState } from "react";
import { ClipVibe, MomentAnalysisOptions, MomentClip, SubtitleSegment, VaultConfig, WebDAVItem } from "../types";
import { GeminiService } from "../services/gemini";
import { formatDisplayTime, formatTimeSec, parseTimeToSeconds } from "../utils/time";
import {
  Sparkles,
  Flame,
  Laugh,
  Lightbulb,
  HeartCrack,
  Zap,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  Scissors,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Clock,
  Tag,
} from "lucide-react";

interface MomentAnalyzerProps {
  config: VaultConfig;
  selectedVideo: WebDAVItem | null;
  subtitles: SubtitleSegment[];
  clips: MomentClip[];
  onClipsChange: (clips: MomentClip[]) => void;
  onProceedToChopper: () => void;
  onOpenVault: () => void;
  onTokensUsed?: (tokens: { input: number; output: number }) => void;
}

const VIBE_OPTIONS: { id: ClipVibe; label: string; icon: any; desc: string }[] = [
  { id: "Viral Potential", label: "🔥 Viral Potential", icon: Flame, desc: "High engagement hooks, punchy moments for TikTok/Shorts/Reels." },
  { id: "Funny", label: "😂 Funny / Comedy", icon: Laugh, desc: "Humorous remarks, witty banter, unexpected reactions." },
  { id: "Insightful", label: "💡 Deep Insights", icon: Lightbulb, desc: "Wisdom, breakthrough advice, quotes, and key lessons." },
  { id: "Dramatic / Emotional", label: "🎭 Dramatic / Sad", icon: HeartCrack, desc: "Tense stories, confessions, emotional breakthroughs." },
  { id: "Action / Highlights", label: "⚡ Action & Energy", icon: Zap, desc: "Fast-paced excitement, key turning points, climax." },
  { id: "Custom", label: "🎯 Custom Prompt", icon: Sliders, desc: "Custom fine-tuned AI instructions." },
];

export function MomentAnalyzer({
  config,
  selectedVideo,
  subtitles,
  clips,
  onClipsChange,
  onProceedToChopper,
  onOpenVault,
  onTokensUsed,
}: MomentAnalyzerProps) {
  const [options, setOptions] = useState<MomentAnalysisOptions>({
    count: 4,
    vibe: "Viral Potential",
    minDuration: 15,
    maxDuration: 60,
    customPrompt: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);

  const isGeminiReady = !!config.geminiApiKey;
  const videoDuration = subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 120;

  // Run AI Moment Detection
  const handleAnalyzeMoments = async () => {
    if (subtitles.length === 0) {
      setError("Please transcribe or upload subtitles in Step 2 first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const videoName = selectedVideo?.name || "Selected Video";
      const result = await GeminiService.analyzeMoments(
        subtitles,
        videoName,
        options,
        config.geminiApiKey
      );

      onClipsChange(result.clips);
      if (onTokensUsed) {
        onTokensUsed(result.estimatedTokens);
      }
    } catch (err: any) {
      console.error("Gemini Moment Analysis Error:", err);
      setError(err.message || "Failed to analyze highlight moments.");
    } finally {
      setLoading(false);
    }
  };

  // Add a manual clip
  const handleAddManualClip = () => {
    const newClip: MomentClip = {
      id: `clip_${Date.now()}`,
      title: `Custom Highlight #${clips.length + 1}`,
      start: 0,
      end: 30,
      startFormatted: formatTimeSec(0),
      endFormatted: formatTimeSec(30),
      duration: 30,
      reasoning: "Manually curated clip",
      hookText: "Opening highlight",
      score: 90,
      tags: ["#custom", "#highlight"],
      status: "ready",
    };
    onClipsChange([...clips, newClip]);
    setEditingClipId(newClip.id);
  };

  // Delete a clip
  const handleDeleteClip = (id: string) => {
    onClipsChange(clips.filter((c) => c.id !== id));
  };

  // Update clip fields
  const handleUpdateClip = (id: string, updates: Partial<MomentClip>) => {
    onClipsChange(
      clips.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          // If start or end updated, sync formatted strings and duration
          if (updates.start !== undefined || updates.end !== undefined) {
            const start = updates.start !== undefined ? updates.start : c.start;
            const end = updates.end !== undefined ? updates.end : c.end;
            updated.startFormatted = formatTimeSec(start);
            updated.endFormatted = formatTimeSec(end);
            updated.duration = Math.max(1, Math.round((end - start) * 10) / 10);
          }
          return updated;
        }
        return c;
      })
    );
  };

  // Export clips to JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clips, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `${selectedVideo?.name || "video"}_clips.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">AI Moment Analysis (Gemini Flash)</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gemini reads the timestamped transcript and extracts the best viral hooks, jokes, insights, and key moments.
          </p>
        </div>

        {clips.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-zinc-300 border border-[#262626] text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onProceedToChopper}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Next: Chop with GitHub &rarr;</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Panel Card */}
      <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-5">
        <div>
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Select Target Clip Vibe / Emotion</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {VIBE_OPTIONS.map((vibe) => {
              const isSelected = options.vibe === vibe.id;
              return (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, vibe: vibe.id }))}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500/80 text-blue-300 shadow-sm"
                      : "bg-[#141414] border-[#222] text-zinc-400 hover:border-[#333] hover:text-zinc-200"
                  }`}
                >
                  <span className="font-semibold text-xs text-zinc-100">{vibe.label}</span>
                  <span className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{vibe.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Target Clip Count */}
          <div className="p-3.5 bg-[#141414] rounded-lg border border-[#222] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Target Clips:</span>
              <span className="font-bold font-mono text-blue-400">{options.count} clips</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={options.count}
              onChange={(e) => setOptions((prev) => ({ ...prev, count: parseInt(e.target.value, 10) }))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Min Duration */}
          <div className="p-3.5 bg-[#141414] rounded-lg border border-[#222] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Min Duration:</span>
              <span className="font-bold font-mono text-blue-400">{options.minDuration}s</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={options.minDuration}
              onChange={(e) => setOptions((prev) => ({ ...prev, minDuration: parseInt(e.target.value, 10) }))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Max Duration */}
          <div className="p-3.5 bg-[#141414] rounded-lg border border-[#222] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Max Duration:</span>
              <span className="font-bold font-mono text-blue-400">{options.maxDuration}s</span>
            </div>
            <input
              type="range"
              min={20}
              max={180}
              step={10}
              value={options.maxDuration}
              onChange={(e) => setOptions((prev) => ({ ...prev, maxDuration: parseInt(e.target.value, 10) }))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Custom Instructions */}
        {options.vibe === "Custom" && (
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">Custom AI Prompt Guidance</label>
            <input
              type="text"
              value={options.customPrompt}
              onChange={(e) => setOptions((prev) => ({ ...prev, customPrompt: e.target.value }))}
              placeholder="e.g. Find all moments where the speaker explains pricing models or shares a personal failure story."
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleAddManualClip}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-semibold text-zinc-300 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Add Manual Clip</span>
          </button>

          <button
            onClick={handleAnalyzeMoments}
            disabled={loading || subtitles.length === 0}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Extract {options.count} Viral Moments with Gemini</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Visual Timeline Bar */}
      {clips.length > 0 && videoDuration > 0 && (
        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="font-bold text-white uppercase text-[10px] tracking-wider">Video Timeline Distribution</span>
            <span>Total Duration: {formatDisplayTime(videoDuration)}</span>
          </div>

          <div className="relative h-6 bg-[#141414] rounded-lg overflow-hidden border border-[#222]">
            {clips.map((clip, i) => {
              const leftPercent = Math.min(100, Math.max(0, (clip.start / videoDuration) * 100));
              const widthPercent = Math.min(100 - leftPercent, Math.max(2, (clip.duration / videoDuration) * 100));

              return (
                <div
                  key={clip.id}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  className="absolute top-0 bottom-0 bg-blue-600/90 hover:bg-blue-500 border-x border-blue-400 cursor-pointer transition-colors flex items-center justify-center text-[10px] font-bold text-white truncate px-1 shadow-sm"
                  title={`#${i + 1}: ${clip.title} (${formatDisplayTime(clip.start)} - ${formatDisplayTime(clip.end)})`}
                >
                  #{i + 1}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extracted Clips Grid / List */}
      {clips.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-tight">
              Extracted Moments ({clips.length} clip{clips.length === 1 ? "" : "s"})
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              Ready for stream-copy FFmpeg chopping on GitHub Actions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clips.map((clip, idx) => {
              const isEditing = editingClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header: Clip index, Score badge, actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-mono font-bold border border-blue-500/40">
                          {idx + 1}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={clip.title}
                            onChange={(e) => handleUpdateClip(clip.id, { title: e.target.value })}
                            className="px-2 py-1 bg-[#141414] border border-[#262626] rounded text-xs text-zinc-100 font-semibold w-56"
                          />
                        ) : (
                          <h4 className="font-semibold text-white text-xs truncate max-w-[220px]">
                            {clip.title}
                          </h4>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                          {clip.score}/100
                        </span>
                        <button
                          onClick={() => setEditingClipId(isEditing ? null : clip.id)}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a] transition-colors"
                          title="Edit Title & Timestamps"
                        >
                          {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteClip(clip.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-[#1a1a1a] transition-colors"
                          title="Remove Clip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Timestamp & Duration Row */}
                    <div className="flex items-center gap-2 text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={clip.startFormatted}
                            onChange={(e) => {
                              const s = parseTimeToSeconds(e.target.value);
                              handleUpdateClip(clip.id, { start: s, startFormatted: e.target.value });
                            }}
                            className="px-2 py-0.5 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-zinc-200 w-24"
                          />
                          <span className="text-zinc-500">&rarr;</span>
                          <input
                            type="text"
                            value={clip.endFormatted}
                            onChange={(e) => {
                              const end = parseTimeToSeconds(e.target.value);
                              handleUpdateClip(clip.id, { end, endFormatted: e.target.value });
                            }}
                            className="px-2 py-0.5 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-zinc-200 w-24"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-300">
                          <span className="px-2 py-0.5 bg-[#141414] rounded border border-[#222] text-blue-300 font-medium">
                            {formatDisplayTime(clip.start)} &rarr; {formatDisplayTime(clip.end)}
                          </span>
                          <span className="text-zinc-500 font-mono">({clip.duration}s)</span>
                        </div>
                      )}
                    </div>

                    {/* Hook Text / Opening */}
                    {clip.hookText && (
                      <p className="text-xs text-zinc-300 italic bg-[#141414] p-2 rounded-lg border border-[#222]">
                        &ldquo;{clip.hookText}&rdquo;
                      </p>
                    )}

                    {/* Reasoning */}
                    <p className="text-xs text-zinc-400 leading-relaxed">{clip.reasoning}</p>
                  </div>

                  {/* Tags */}
                  {clip.tags && clip.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#1a1a1a]">
                      {clip.tags.map((t, ti) => (
                        <span
                          key={ti}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-zinc-400 border border-[#222]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-500 space-y-3 bg-[#0f0f0f] rounded-xl border border-dashed border-[#222] text-xs">
          <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
          <p className="text-zinc-300 font-semibold">No Highlight Moments Extracted Yet</p>
          <p className="text-zinc-500">
            Click &quot;Extract Moments with Gemini&quot; above or &quot;Add Manual Clip&quot; to build your cutting schedule.
          </p>
        </div>
      )}
    </div>
  );
}
