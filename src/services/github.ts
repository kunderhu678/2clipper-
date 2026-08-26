import { GitHubWorkflowRun, MomentClip, VaultConfig } from "../types";
import { logger } from "./logger";

export class GitHubService {
  /**
   * Dispatches repository_dispatch event to trigger chop_video.yml
   */
  public static async dispatchChopAction(
    config: VaultConfig,
    videoFilename: string,
    clips: MomentClip[]
  ): Promise<{ success: boolean; message: string }> {
    const { githubPat, githubOwner, githubRepo, workflowEventName = "chop-video" } = config;

    if (!githubPat || !githubOwner || !githubRepo) {
      throw new Error("GitHub PAT, Owner, and Repository name are required in Settings Vault.");
    }

    if (!videoFilename) {
      throw new Error("No video file selected for chopping.");
    }

    if (!clips || clips.length === 0) {
      throw new Error("No highlight clips selected to chop.");
    }

    const payload = {
      video_filename: videoFilename,
      clips: clips.map((c, i) => ({
        index: i + 1,
        title: c.title,
        start: c.start,
        end: c.end,
        startFormatted: c.startFormatted,
        endFormatted: c.endFormatted,
        duration: c.duration,
      })),
      koofr_base_url: config.koofrBaseUrl || "https://app.koofr.net/dav/Koofr",
      koofr_username: config.koofrUsername,
      koofr_app_password: config.koofrAppPassword,
    };

    const startTime = performance.now();
    const url = `https://api.github.com/repos/${githubOwner.trim()}/${githubRepo.trim()}/dispatches`;

    // Dispatch via server proxy or directly
    try {
      const response = await fetch("/api/github/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-pat": githubPat.trim(),
        },
        body: JSON.stringify({
          owner: githubOwner.trim(),
          repo: githubRepo.trim(),
          eventType: workflowEventName.trim() || "chop-video",
          clientPayload: payload,
        }),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        logger.log({
          service: "GitHub",
          method: "POST",
          url,
          status: 204,
          durationMs,
          requestBody: {
            event_type: workflowEventName,
            video_filename: videoFilename,
            clips_count: clips.length,
          },
          responseBody: { message: "Dispatched repository_dispatch event" },
        });

        return {
          success: true,
          message: `Successfully dispatched GitHub Action for "${videoFilename}" with ${clips.length} clips!`,
        };
      }

      // If server route failed, attempt direct GitHub API
      return await this.directGitHubDispatch(config, url, payload, startTime);
    } catch (err: any) {
      return await this.directGitHubDispatch(config, url, payload, startTime);
    }
  }

  private static async directGitHubDispatch(
    config: VaultConfig,
    url: string,
    payload: any,
    startTime: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.githubPat.trim()}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: config.workflowEventName?.trim() || "chop-video",
          client_payload: payload,
        }),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (res.status === 204) {
        logger.log({
          service: "GitHub",
          method: "POST (Direct)",
          url,
          status: 204,
          durationMs,
          requestBody: { video_filename: payload.video_filename, clips_count: payload.clips?.length },
        });
        return {
          success: true,
          message: `GitHub Action dispatched directly to ${config.githubOwner}/${config.githubRepo}!`,
        };
      }

      const errText = await res.text();
      logger.log({
        service: "GitHub",
        method: "POST (Failed)",
        url,
        status: res.status,
        durationMs,
        error: errText,
      });

      throw new Error(`GitHub API returned ${res.status}: ${errText}`);
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Fetches latest workflow runs for the repository
   */
  public static async getRecentWorkflowRuns(config: VaultConfig): Promise<GitHubWorkflowRun[]> {
    const { githubPat, githubOwner, githubRepo } = config;
    if (!githubPat || !githubOwner || !githubRepo) return [];

    const url = `https://api.github.com/repos/${githubOwner.trim()}/${githubRepo.trim()}/actions/runs?per_page=10`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${githubPat.trim()}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return (data.workflow_runs || []).map((run: any) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at,
        event: run.event,
        run_number: run.run_number,
        head_branch: run.head_branch,
      }));
    } catch (err) {
      console.warn("Failed to fetch GitHub workflow runs:", err);
      return [];
    }
  }

  /**
   * Tests GitHub PAT and repository access
   */
  public static async testConnection(config: VaultConfig): Promise<{ success: boolean; message: string }> {
    const { githubPat, githubOwner, githubRepo } = config;
    if (!githubPat) return { success: false, message: "GitHub PAT is empty" };
    if (!githubOwner || !githubRepo) return { success: false, message: "Repository Owner and Name are required" };

    try {
      const url = `https://api.github.com/repos/${githubOwner.trim()}/${githubRepo.trim()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${githubPat.trim()}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: `Connected to repository ${data.full_name} (${data.private ? "Private" : "Public"})!`,
        };
      } else {
        const err = await res.text();
        return { success: false, message: `GitHub Access Error (${res.status}): ${err}` };
      }
    } catch (err: any) {
      return { success: false, message: `GitHub connection failed: ${err.message}` };
    }
  }
}
