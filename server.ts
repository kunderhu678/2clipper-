import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded body parser with generous limit
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // CORS middleware for API endpoints
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL, HEAD");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Depth, Destination, Overwrite, x-groq-key, x-gemini-key, x-github-pat");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 1. WebDAV Proxy (Bypasses browser CORS restrictions for Koofr or other WebDAV providers)
  app.all("/api/webdav-proxy", async (req, res) => {
    const targetUrl = req.headers["x-target-url"] as string || (req.query.target as string);
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing x-target-url header or target query parameter" });
    }

    try {
      const headers: Record<string, string> = {};
      if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;
      if (req.headers.depth) headers["Depth"] = req.headers.depth as string;
      if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
      if (req.headers.destination) headers["Destination"] = req.headers.destination as string;
      if (req.headers.overwrite) headers["Overwrite"] = req.headers.overwrite as string;

      const fetchOptions: RequestInit = {
        method: req.method === "POST" && req.query._method ? (req.query._method as string) : req.method,
        headers,
      };

      if (["POST", "PUT", "PROPFIND", "PROPPATCH"].includes(req.method) && req.body) {
        if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
          fetchOptions.body = req.body;
        } else if (Object.keys(req.body).length > 0) {
          fetchOptions.body = JSON.stringify(req.body);
        }
      }

      const response = await fetch(targetUrl, fetchOptions);
      const responseText = await response.text();

      res.status(response.status);
      response.headers.forEach((val, key) => {
        // Exclude hop-by-hop headers
        if (!["transfer-encoding", "content-encoding", "connection"].includes(key.toLowerCase())) {
          res.setHeader(key, val);
        }
      });
      res.send(responseText);
    } catch (err: any) {
      console.error("WebDAV Proxy Error:", err);
      res.status(502).json({ error: err.message || "Failed to proxy WebDAV request" });
    }
  });

  // 2. Gemini Highlight / Moment Detection Endpoint
  app.post("/api/gemini/analyze-moments", async (req, res) => {
    try {
      const userApiKey = (req.headers["x-gemini-key"] as string) || process.env.GEMINI_API_KEY;
      if (!userApiKey) {
        return res.status(400).json({
          error: "Gemini API key is required. Please set it in Settings Vault or GEMINI_API_KEY environment variable.",
        });
      }

      const {
        transcript,
        videoTitle = "Selected Video",
        targetClipCount = 4,
        vibe = "Viral Potential",
        minDuration = 15,
        maxDuration = 60,
        customPrompt = "",
      } = req.body;

      if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
        return res.status(400).json({ error: "Transcript segments array is required." });
      }

      const ai = new GoogleGenAI({
        apiKey: userApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Prepare transcript text with timestamps
      const formattedTranscript = transcript
        .map(
          (seg: { start: number; end: number; text: string }, index: number) =>
            `[${formatTimeSec(seg.start)} -> ${formatTimeSec(seg.end)}] (idx:${index}) ${seg.text}`
        )
        .join("\n");

      const prompt = `You are a master viral video editor, YouTube Shorts / TikTok curator, and content strategist.
Analyze the following timed transcript from the video "${videoTitle}" and extract the TOP ${targetClipCount} best highlights / clips matching the vibe "${vibe}".

Parameters:
- Desired vibe/theme: ${vibe}
- Target number of clips: ${targetClipCount}
- Minimum clip duration: ${minDuration} seconds
- Maximum clip duration: ${maxDuration} seconds
${customPrompt ? `- Specific user instructions: ${customPrompt}` : ""}

Rules:
1. Each clip MUST have a valid continuous start and end timestamp in seconds (float or integer).
2. The duration (end - start) MUST ideally be between ${minDuration} and ${maxDuration} seconds.
3. Every clip must capture a complete thought or punchline with strong context (do NOT cut off halfway through a sentence).
4. Provide a catchy, click-worthy title (max 7 words), a viral hook explanation, a rating score (1-100), and relevant tags.

Transcript:
${formattedTranscript}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert video editor AI that outputs strictly valid JSON matching the requested schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "List of extracted highlight clips",
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Catchy, click-worthy short title for the clip",
                },
                start: {
                  type: Type.NUMBER,
                  description: "Exact start time in seconds (float or integer)",
                },
                end: {
                  type: Type.NUMBER,
                  description: "Exact end time in seconds (float or integer)",
                },
                reasoning: {
                  type: Type.STRING,
                  description: "Why this segment is engaging and matches the vibe",
                },
                hookText: {
                  type: Type.STRING,
                  description: "The opening sentence or visual hook of this clip",
                },
                score: {
                  type: Type.INTEGER,
                  description: "Viral potential / quality score from 1 to 100",
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Tags such as #shorts #funny #insight",
                },
              },
              required: ["title", "start", "end", "reasoning", "score"],
            },
          },
        },
      });

      const rawJson = response.text?.trim() || "[]";
      let clips = [];
      try {
        clips = JSON.parse(rawJson);
      } catch (parseErr) {
        console.error("Failed to parse Gemini JSON:", rawJson);
        return res.status(500).json({ error: "Failed to parse AI output JSON", raw: rawJson });
      }

      // Add unique IDs and formatted strings
      const enrichedClips = clips.map((clip: any, idx: number) => ({
        id: `clip_${Date.now()}_${idx + 1}`,
        title: clip.title || `Clip #${idx + 1}`,
        start: Number(clip.start) || 0,
        end: Number(clip.end) || Number(clip.start) + 30,
        startFormatted: formatTimeSec(Number(clip.start) || 0),
        endFormatted: formatTimeSec(Number(clip.end) || Number(clip.start) + 30),
        duration: Math.max(1, Math.round((Number(clip.end) - Number(clip.start)) * 10) / 10),
        reasoning: clip.reasoning || "High engagement moment",
        hookText: clip.hookText || "",
        score: clip.score || 85,
        tags: clip.tags || ["#viral", "#highlight"],
        status: "ready",
      }));

      res.json({
        clips: enrichedClips,
        totalClips: enrichedClips.length,
        vibe,
        model: "gemini-3.7-flash",
      });
    } catch (err: any) {
      console.error("Gemini Analysis Error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze moments with Gemini" });
    }
  });

  // 3. GitHub Actions Trigger Proxy / Dispatch
  app.post("/api/github/dispatch", async (req, res) => {
    const pat = (req.headers["x-github-pat"] as string) || req.body.pat;
    const { owner, repo, eventType = "chop-video", clientPayload } = req.body;

    if (!pat || !owner || !repo) {
      return res.status(400).json({ error: "GitHub PAT, Owner, and Repo are required." });
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "WebDAV-Video-Chopper",
        },
        body: JSON.stringify({
          event_type: eventType,
          client_payload: clientPayload,
        }),
      });

      if (response.status === 204) {
        res.json({ success: true, message: "GitHub Repository Dispatch triggered successfully!" });
      } else {
        const errText = await response.text();
        res.status(response.status).json({ error: `GitHub API error: ${errText}` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to dispatch GitHub Action" });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

function formatTimeSec(seconds: number): string {
  const s = Math.max(0, seconds || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);

  const hh = hrs.toString().padStart(2, "0");
  const mm = mins.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  const mmm = ms.toString().padStart(3, "0");

  return `${hh}:${mm}:${ss}.${mmm}`;
}

startServer();
