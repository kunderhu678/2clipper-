export interface VaultConfig {
  koofrBaseUrl: string;
  koofrUsername: string;
  koofrAppPassword: string;
  groqApiKey: string;
  geminiApiKey: string;
  githubPat: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  workflowEventName: string;
  useServerProxy: boolean;
}

export interface WebDAVItem {
  name: string;
  href: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: string;
  mimeType: string;
  isVideo: boolean;
  extension: string;
}

export interface SubtitleSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  confidence?: number;
}

export type ClipVibe = 'Viral Potential' | 'Funny' | 'Insightful' | 'Dramatic / Emotional' | 'Action / Highlights' | 'Custom';

export interface MomentClip {
  id: string;
  title: string;
  start: number; // in seconds
  end: number;   // in seconds
  startFormatted: string; // "00:01:23.000"
  endFormatted: string;   // "00:02:10.500"
  duration: number;       // in seconds
  reasoning: string;
  hookText?: string;
  score: number;          // 1-100
  tags: string[];
  status?: 'pending' | 'ready' | 'processing' | 'done';
}

export interface MomentAnalysisOptions {
  count: number;
  vibe: ClipVibe;
  minDuration: number;
  maxDuration: number;
  customPrompt: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  event: string;
  run_number: number;
  head_branch: string;
}

export type ServiceType = 'WebDAV' | 'Groq' | 'Gemini' | 'GitHub' | 'System';

export interface HttpLogEntry {
  id: string;
  timestamp: string;
  service: ServiceType;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
}

export interface QuotaMetrics {
  groqCalls: number;
  groqAudioSeconds: number;
  geminiInputTokens: number;
  geminiOutputTokens: number;
  githubDispatches: number;
  webdavRequests: number;
}

export type ActiveTab = 'vault' | 'webdav' | 'subtitles' | 'moments' | 'chopper' | 'workflow-code' | 'quotas';
