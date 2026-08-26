import { MomentAnalysisOptions, MomentClip, SubtitleSegment } from "../types";
import { formatTimeSec } from "../utils/time";
import { logger } from "./logger";

export class GeminiService {
  /**
   * Analyzes transcript segments and extracts high-engagement moments
   */
  public static async analyzeMoments(
    transcript: SubtitleSegment[],
    videoTitle: string,
    options: MomentAnalysisOptions,
    apiKey: string
  ): Promise<{ clips: MomentClip[]; estimatedTokens: { input: number; output: number } }> {
    if (!transcript || transcript.length === 0) {
      throw new Error("Transcript is empty. Please transcribe or upload subtitles first.");
    }

    const startTime = performance.now();

    // Call server endpoint
    try {
      const response = await fetch("/api/gemini/analyze-moments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-key": apiKey.trim() } : {}),
        },
        body: JSON.stringify({
          transcript,
          videoTitle,
          targetClipCount: options.count,
          vibe: options.vibe,
          minDuration: options.minDuration,
          maxDuration: options.maxDuration,
          customPrompt: options.customPrompt,
        }),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        logger.log({
          service: "Gemini",
          method: "POST",
          url: "/api/gemini/analyze-moments",
          status: response.status,
          durationMs,
          error: errorData.error || "Gemini moments analysis failed",
        });
        throw new Error(errorData.error || `Gemini API returned status ${response.status}`);
      }

      const data = await response.json();

      // Estimate tokens
      const transcriptWords = transcript.reduce((acc, s) => acc + s.text.split(" ").length, 0);
      const inputTokens = Math.round(transcriptWords * 1.4 + 400);
      const outputTokens = Math.round((data.clips?.length || 4) * 120);

      logger.log({
        service: "Gemini",
        method: "POST",
        url: "/api/gemini/analyze-moments",
        status: 200,
        durationMs,
        responseBody: {
          clipsFound: data.clips?.length || 0,
          vibe: options.vibe,
          model: data.model,
          estimatedTokens: { input: inputTokens, output: outputTokens },
        },
      });

      return {
        clips: data.clips || [],
        estimatedTokens: { input: inputTokens, output: outputTokens },
      };
    } catch (err: any) {
      // Fallback: If server is unavailable (e.g. pure static Cloudflare Pages mode), do direct client fallback if user provided API key
      if (apiKey && (!err.status || err.message.includes("fetch"))) {
        return await this.directClientAnalyzeMoments(transcript, videoTitle, options, apiKey);
      }
      throw err;
    }
  }

  /**
   * Direct Client Fallback using Google Generative AI REST endpoint for static hostings (Cloudflare Pages)
   */
  private static async directClientAnalyzeMoments(
    transcript: SubtitleSegment[],
    videoTitle: string,
    options: MomentAnalysisOptions,
    apiKey: string
  ): Promise<{ clips: MomentClip[]; estimatedTokens: { input: number; output: number } }> {
    const formattedTranscript = transcript
      .map((seg, idx) => `[${formatTimeSec(seg.start)} -> ${formatTimeSec(seg.end)}] (idx:${idx}) ${seg.text}`)
      .join("\n");

    const prompt = `You are an expert viral video editor. Analyze this transcript for "${videoTitle}" and return TOP ${options.count} highlights matching vibe "${options.vibe}".
Min duration: ${options.minDuration}s, Max duration: ${options.maxDuration}s.
${options.customPrompt ? `Note: ${options.customPrompt}` : ""}

Return strictly JSON array:
[
  {
    "title": "Short catchy title",
    "start": 12.5,
    "end": 45.0,
    "reasoning": "Why this is compelling",
    "hookText": "Opening hook",
    "score": 90,
    "tags": ["#tag1", "#tag2"]
  }
]

Transcript:
${formattedTranscript}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Direct Gemini API failed (${response.status}): ${err}`);
    }

    const resJson = await response.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const parsed = JSON.parse(rawText);

    const clips: MomentClip[] = parsed.map((c: any, idx: number) => ({
      id: `clip_${Date.now()}_${idx + 1}`,
      title: c.title || `Clip #${idx + 1}`,
      start: Number(c.start) || 0,
      end: Number(c.end) || 30,
      startFormatted: formatTimeSec(Number(c.start) || 0),
      endFormatted: formatTimeSec(Number(c.end) || 30),
      duration: Math.max(1, Math.round((Number(c.end) - Number(c.start)) * 10) / 10),
      reasoning: c.reasoning || "Compelling moment",
      hookText: c.hookText || "",
      score: c.score || 85,
      tags: c.tags || ["#viral"],
      status: "ready",
    }));

    return {
      clips,
      estimatedTokens: { input: 1200, output: 400 },
    };
  }

  /**
   * Tests the Gemini API key validity
   */
  public static async testKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) return { success: false, message: "Gemini API Key is empty" };
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
      const res = await fetch(url);
      if (res.ok) {
        return { success: true, message: "Gemini API Key is active and verified!" };
      } else {
        const err = await res.text();
        return { success: false, message: `Invalid Gemini Key (${res.status}): ${err}` };
      }
    } catch (err: any) {
      return { success: false, message: `Gemini test failed: ${err.message}` };
    }
  }
}
