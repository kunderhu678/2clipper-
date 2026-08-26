import { useState, ChangeEvent } from "react";
import { SubtitleSegment, VaultConfig, WebDAVItem } from "../types";
import { GroqService } from "../services/groq";
import { WebDAVClient } from "../services/webdav";
import { formatDisplayTime, formatTimeSec } from "../utils/time";
import {
  FileAudio,
  FileText,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Search,
  Download,
  Copy,
  Info,
  Layers,
} from "lucide-react";

interface SubtitleExtractorProps {
  config: VaultConfig;
  selectedVideo: WebDAVItem | null;
  subtitles: SubtitleSegment[];
  onSubtitlesLoaded: (segments: SubtitleSegment[]) => void;
  onProceedToMoments: () => void;
  onOpenVault: () => void;
}

const SAMPLE_TRANSCRIPT = `1
00:00:02,000 --> 00:00:08,500
Welcome back everyone! Today we're revealing the absolute top 3 productivity secrets that changed everything for our team.

2
00:00:08,800 --> 00:00:16,200
Secret number one: Never start your day with checking emails. When you check emails first, you are operating in purely reactive mode.

3
00:00:16,500 --> 00:00:23,800
Instead, block out the first 90 minutes of the morning for deep, uninterrupted creative focus on your highest leverage project.

4
00:00:24,200 --> 00:00:32,000
Now, hilarious story about this: last year, Alex tried turning off all notifications for an entire week, and everyone thought he went off the grid!

5
00:00:32,400 --> 00:00:39,100
He actually finished an entire 30-page research paper in four days just because zero Slack pings interrupted his flow state.

6
00:00:39,500 --> 00:00:46,900
Secret number two is ruthless batching. Group all your meetings into Tuesday and Thursday afternoons. Never scatter 30-minute meetings across the whole week.

7
00:00:47,300 --> 00:00:54,500
Why? Because context switching cost is real. It takes your brain an average of 23 minutes to refocus after a single interruption.

8
00:00:55,000 --> 00:01:03,800
And secret number three: The 2-minute rule with a twist. If a task takes less than 2 minutes, do it immediately, but only during your designated admin block.

9
00:01:04,200 --> 00:01:12,000
If you found these actionable, hit that subscribe button, drop a comment below with your favorite hack, and we'll see you in the next breakdown!`;

export function SubtitleExtractor({
  config,
  selectedVideo,
  subtitles,
  onSubtitlesLoaded,
  onProceedToMoments,
  onOpenVault,
}: SubtitleExtractorProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"transcribe" | "manual">("transcribe");
  const [manualText, setManualText] = useState<string>("");

  const isGroqReady = !!config.groqApiKey;

  // Transcribe selected WebDAV video via Groq Whisper Large v3
  const handleTranscribeWebDAV = async () => {
    if (!selectedVideo) {
      setError("Please select a video file from WebDAV first.");
      return;
    }
    if (!isGroqReady) {
      setError("Groq API Key is required. Please set it in Config Vault.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg(`Downloading audio stream from Koofr (${selectedVideo.name})...`);

    try {
      const client = new WebDAVClient(config);
      const videoBlob = await client.getFileBlob(selectedVideo.path);

      setStatusMsg("Transcribing with Groq Whisper Large-v3 (zero RAM serverless)...");
      const result = await GroqService.transcribeAudio(videoBlob, config.groqApiKey, customPrompt);

      onSubtitlesLoaded(result.segments);
      setStatusMsg(`Successfully extracted ${result.segments.length} timestamped segments!`);
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(err.message || "Failed to transcribe audio.");
    } finally {
      setLoading(false);
    }
  };

  // Upload local file (audio, video, or SRT/VTT)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If subtitle file
    if (file.name.endsWith(".srt") || file.name.endsWith(".vtt") || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = GroqService.parseSrtOrVtt(text);
        if (parsed.length > 0) {
          onSubtitlesLoaded(parsed);
          setStatusMsg(`Loaded ${parsed.length} segments from ${file.name}`);
        } else {
          setError("Could not parse subtitle timestamps from file.");
        }
      };
      reader.readAsText(file);
      return;
    }

    // Audio/video file -> Send to Groq Whisper
    if (!isGroqReady) {
      setError("Groq API Key is required to transcribe audio/video files.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg(`Sending ${file.name} to Groq Whisper Large-v3...`);

    try {
      const result = await GroqService.transcribeAudio(file, config.groqApiKey, customPrompt);
      onSubtitlesLoaded(result.segments);
      setStatusMsg(`Extracted ${result.segments.length} segments from ${file.name}`);
    } catch (err: any) {
      setError(err.message || "Failed to transcribe uploaded file.");
    } finally {
      setLoading(false);
    }
  };

  // Parse manual text or sample
  const handleParseManualText = () => {
    if (!manualText.trim()) return;
    const parsed = GroqService.parseSrtOrVtt(manualText);
    if (parsed.length > 0) {
      onSubtitlesLoaded(parsed);
      setStatusMsg(`Successfully parsed ${parsed.length} timed segments.`);
    } else {
      // Split by lines or sentences with synthetic timestamps
      const sentences = manualText.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 0);
      let t = 0;
      const synthetic: SubtitleSegment[] = sentences.map((st, i) => {
        const dur = Math.max(3, Math.round(st.split(" ").length * 0.45));
        const seg = { id: i + 1, start: t, end: t + dur, text: st.trim() };
        t += dur + 0.5;
        return seg;
      });
      onSubtitlesLoaded(synthetic);
      setStatusMsg(`Generated ${synthetic.length} timed segments from raw text.`);
    }
  };

  const loadSampleTranscript = () => {
    const parsed = GroqService.parseSrtOrVtt(SAMPLE_TRANSCRIPT);
    onSubtitlesLoaded(parsed);
    setManualText(SAMPLE_TRANSCRIPT);
    setStatusMsg("Loaded sample viral productivity transcript!");
  };

  const filteredSegments = subtitles.filter((s) => s.text.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalWords = subtitles.reduce((acc, s) => acc + s.text.split(" ").length, 0);
  const totalDuration = subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Subtitle & Timestamp Extraction (Groq Whisper)</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Transcribe raw video audio using Groq's <code className="text-zinc-200 bg-[#161616] border border-[#2a2a2a] px-1 py-0.5 rounded font-mono">whisper-large-v3</code> to get exact word & segment timestamps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSampleTranscript}
            className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-semibold text-blue-300 transition-colors"
          >
            Load Sample Transcript
          </button>
        </div>
      </div>

      {/* API Key Missing Alert */}
      {!isGroqReady && (
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-zinc-300">Groq API Key is not set. You can transcribe with your free Groq key or paste an SRT manually.</span>
          </div>
          <button
            onClick={onOpenVault}
            className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-sm"
          >
            Set Groq Key
          </button>
        </div>
      )}

      {/* Input Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Remote WebDAV Video / Upload */}
        <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-4">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Method A: Transcribe Remote or Uploaded Video</span>
          </h3>

          {selectedVideo ? (
            <div className="p-3 rounded-lg bg-[#141414] border border-[#222] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Selected Video:</span>
                <span className="text-emerald-400 font-bold font-mono text-[10px] uppercase">Ready</span>
              </div>
              <div className="font-mono text-zinc-100 truncate text-xs font-semibold">{selectedVideo.name}</div>
              <div className="text-zinc-500 text-[11px] font-mono">Path: {selectedVideo.path}</div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#141414]/50 border border-dashed border-[#262626] text-xs text-zinc-400 text-center py-4">
              No WebDAV video selected yet. Go back to <strong className="text-zinc-200">WebDAV Files</strong> or upload a local file below.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium">Optional Whisper Vocabulary Prompt</label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. specialized terms, speaker names, jargon"
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={handleTranscribeWebDAV}
              disabled={loading || !selectedVideo || !isGroqReady}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Transcribe Remote Video</span>
            </button>

            <label className="px-4 py-2.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Upload Video / SRT</span>
              <input
                type="file"
                accept="video/*,audio/*,.srt,.vtt,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {statusMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/60 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Card: Manual SRT / Text Input */}
        <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Method B: Paste Existing SRT / Transcript</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Already have subtitles? Paste your SRT or timestamped transcript below.
            </p>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste SRT subtitles here (e.g. 00:00:10,000 --> 00:00:25,000 Text...)"
              rows={6}
              className="w-full p-3 bg-[#141414] border border-[#262626] rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={loadSampleTranscript}
              className="text-xs text-zinc-400 hover:text-blue-400 underline font-mono"
            >
              Insert demo transcript
            </button>
            <button
              onClick={handleParseManualText}
              disabled={!manualText.trim()}
              className="px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-50 text-zinc-200 font-semibold text-xs border border-[#262626] transition-colors"
            >
              Parse Timestamps
            </button>
          </div>
        </div>
      </div>

      {/* Transcript Results Viewer */}
      {subtitles.length > 0 && (
        <div className="p-5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#1f1f1f]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Extracted Transcript</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#181818] text-blue-300 border border-[#262626]">
                  {subtitles.length} segments
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Total duration: <strong className="text-zinc-200">{formatDisplayTime(totalDuration)}</strong> ({totalWords} words)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search transcript..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-[#141414] border border-[#262626] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500 w-44"
                />
              </div>

              <button
                onClick={onProceedToMoments}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next: AI Moment Analysis &rarr;</span>
              </button>
            </div>
          </div>

          {/* Segment Timeline List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#181818] pr-1">
            {filteredSegments.map((seg) => (
              <div
                key={seg.id}
                className="py-2.5 px-3 flex items-start gap-3 hover:bg-[#141414] rounded transition-colors text-xs"
              >
                <span className="font-mono text-[11px] text-blue-400 bg-[#141414] px-2 py-0.5 rounded border border-[#262626] shrink-0 font-medium">
                  {formatDisplayTime(seg.start)} &rarr; {formatDisplayTime(seg.end)}
                </span>
                <p className="text-zinc-200 leading-relaxed flex-1">{seg.text}</p>
                <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                  {Math.round((seg.end - seg.start) * 10) / 10}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
