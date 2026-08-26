import { SubtitleSegment } from "../types";
import { parseTimeToSeconds } from "../utils/time";
import { logger } from "./logger";

export interface GroqWhisperResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

export class GroqService {
  /**
   * Transcribes an audio file or blob using Groq Whisper Large v3
   */
  public static async transcribeAudio(
    audioBlob: Blob | File,
    apiKey: string,
    prompt = "",
    language = ""
  ): Promise<{ segments: SubtitleSegment[]; fullText: string; duration: number }> {
    if (!apiKey) {
      throw new Error("Groq API Key is missing. Please add it to your Settings Vault.");
    }

    const startTime = performance.now();
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp4");
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "verbose_json");
    formData.append("temperature", "0.0");
    if (prompt) formData.append("prompt", prompt);
    if (language) formData.append("language", language);

    const url = "https://api.groq.com/openai/v1/audio/transcriptions";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: formData,
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorText = await response.text();
        logger.log({
          service: "Groq",
          method: "POST",
          url,
          status: response.status,
          durationMs,
          error: errorText,
        });
        throw new Error(`Groq Whisper error (${response.status}): ${errorText}`);
      }

      const data: GroqWhisperResponse = await response.json();

      logger.log({
        service: "Groq",
        method: "POST",
        url,
        status: response.status,
        durationMs,
        responseBody: {
          language: data.language,
          duration: data.duration,
          segmentsCount: data.segments?.length || 0,
          sampleText: data.text?.slice(0, 100) + "...",
        },
      });

      const segments: SubtitleSegment[] = (data.segments || []).map((seg, idx) => ({
        id: seg.id ?? idx + 1,
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
        confidence: seg.avg_logprob ? Math.round(Math.exp(seg.avg_logprob) * 100) : undefined,
      }));

      return {
        segments,
        fullText: data.text || "",
        duration: data.duration || 0,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      logger.log({
        service: "Groq",
        method: "POST (Failed)",
        url,
        status: 0,
        durationMs,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Tests the Groq API key validity
   */
  public static async testKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) return { success: false, message: "Groq API Key is empty" };
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const whisperFound = data.data?.some((m: any) => m.id?.includes("whisper"));
        return {
          success: true,
          message: whisperFound ? "Groq API Key valid! Whisper model available." : "Groq API Key valid.",
        };
      } else {
        const err = await res.text();
        return { success: false, message: `Invalid Groq Key (${res.status}): ${err}` };
      }
    } catch (err: any) {
      return { success: false, message: `Groq connection failed: ${err.message}` };
    }
  }

  /**
   * Parses SRT or VTT subtitle text into SubtitleSegments
   */
  public static parseSrtOrVtt(content: string): SubtitleSegment[] {
    const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const segments: SubtitleSegment[] = [];

    let currentId = 1;
    let currentStart = 0;
    let currentEnd = 0;
    let currentText = "";
    let isParsingText = false;

    // Pattern for timestamps: 00:01:20,000 --> 00:01:25,500 or 00:01:20.000 --> 00:01:25.500
    const timecodeRegex = /(\d{1,2}:\d{2}:\d{2}[,\.]\d{3}|\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{3}|\d{2}:\d{2}[,\.]\d{3})/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header
      if (line.startsWith("WEBVTT") || line.startsWith("NOTE")) continue;

      const timeMatch = line.match(timecodeRegex);
      if (timeMatch) {
        // If we had a previous segment, push it
        if (currentText && (currentEnd > currentStart || currentEnd > 0)) {
          segments.push({
            id: currentId++,
            start: currentStart,
            end: currentEnd,
            text: currentText.trim(),
          });
          currentText = "";
        }

        currentStart = parseTimeToSeconds(timeMatch[1]);
        currentEnd = parseTimeToSeconds(timeMatch[2]);
        isParsingText = true;
      } else if (isParsingText && line !== "") {
        // Skip pure numeric index line if right before timecode
        if (/^\d+$/.test(line) && i + 1 < lines.length && timecodeRegex.test(lines[i + 1])) {
          continue;
        }
        currentText += (currentText ? " " : "") + line;
      } else if (line === "" && isParsingText && currentText) {
        segments.push({
          id: currentId++,
          start: currentStart,
          end: currentEnd,
          text: currentText.trim(),
        });
        currentText = "";
        isParsingText = false;
      }
    }

    if (currentText) {
      segments.push({
        id: currentId++,
        start: currentStart,
        end: currentEnd,
        text: currentText.trim(),
      });
    }

    return segments;
  }
}
