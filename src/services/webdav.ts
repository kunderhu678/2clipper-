import { VaultConfig, WebDAVItem } from "../types";
import { logger } from "./logger";

const VIDEO_EXTENSIONS = new Set(["mp4", "mkv", "mov", "ts", "webm", "avi", "m4v", "flv", "wmv", "3gp"]);

export class WebDAVClient {
  private config: VaultConfig;

  constructor(config: VaultConfig) {
    this.config = config;
  }

  public updateConfig(config: VaultConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const { koofrUsername, koofrAppPassword } = this.config;
    if (!koofrUsername || !koofrAppPassword) return "";
    return `Basic ${btoa(`${koofrUsername.trim()}:${koofrAppPassword.trim()}`)}`;
  }

  private getCleanBaseUrl(): string {
    let base = (this.config.koofrBaseUrl || "https://app.koofr.net/dav/Koofr").trim();
    if (base.endsWith("/")) base = base.slice(0, -1);
    return base;
  }

  private buildUrl(pathStr: string): string {
    const base = this.getCleanBaseUrl();
    let p = pathStr.trim();
    if (!p.startsWith("/")) p = `/${p}`;
    return `${base}${p}`;
  }

  /**
   * Performs an HTTP request either directly or through the server proxy if CORS fails or proxy is enabled
   */
  private async executeRequest(
    url: string,
    options: {
      method: string;
      depth?: string;
      headers?: Record<string, string>;
      body?: string | Blob;
    }
  ): Promise<{ text: string; status: number; headers: Headers }> {
    const startTime = performance.now();
    const authHeader = this.getAuthHeader();
    const directHeaders: Record<string, string> = {
      ...(options.headers || {}),
    };
    if (authHeader) {
      directHeaders["Authorization"] = authHeader;
    }
    if (options.depth) {
      directHeaders["Depth"] = options.depth;
    }

    // Try direct first if proxy is disabled, or go straight to proxy if proxy is requested
    const useProxy = this.config.useServerProxy;

    if (!useProxy) {
      try {
        const res = await fetch(url, {
          method: options.method,
          headers: directHeaders,
          body: options.body,
        });

        const text = await res.text();
        const duration = Math.round(performance.now() - startTime);

        logger.log({
          service: "WebDAV",
          method: options.method,
          url,
          status: res.status,
          durationMs: duration,
          requestHeaders: { Authorization: authHeader ? "Basic [REDACTED]" : "None", Depth: options.depth || "1" },
          responseBody: text.length > 500 ? `${text.slice(0, 500)}... (${text.length} chars)` : text,
        });

        return { text, status: res.status, headers: res.headers };
      } catch (directErr: any) {
        // Fallback to proxy
        console.warn("Direct WebDAV failed (possibly CORS). Trying proxy fallback...", directErr);
      }
    }

    // Proxy request
    const proxyUrl = `/api/webdav-proxy?target=${encodeURIComponent(url)}&_method=${options.method}`;
    const proxyHeaders: Record<string, string> = {
      "x-target-url": url,
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(options.depth ? { Depth: options.depth } : {}),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: proxyHeaders,
        body: options.body,
      });

      const text = await res.text();
      const duration = Math.round(performance.now() - startTime);

      logger.log({
        service: "WebDAV",
        method: `${options.method} (Proxy)`,
        url,
        status: res.status,
        durationMs: duration,
        requestHeaders: { Authorization: authHeader ? "Basic [REDACTED]" : "None", Depth: options.depth || "1" },
        responseBody: text.length > 500 ? `${text.slice(0, 500)}... (${text.length} chars)` : text,
      });

      return { text, status: res.status, headers: res.headers };
    } catch (proxyErr: any) {
      const duration = Math.round(performance.now() - startTime);
      logger.log({
        service: "WebDAV",
        method: `${options.method} (Failed)`,
        url,
        status: 0,
        durationMs: duration,
        error: proxyErr.message,
      });
      throw proxyErr;
    }
  }

  /**
   * Lists contents of a directory using PROPFIND
   */
  public async listDirectory(directoryPath = "/input"): Promise<WebDAVItem[]> {
    const url = this.buildUrl(directoryPath);

    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:resourcetype/>
    <D:getcontenttype/>
  </D:prop>
</D:propfind>`;

    const response = await this.executeRequest(url, {
      method: "PROPFIND",
      depth: "1",
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
      body: propfindBody,
    });

    if (response.status !== 207 && response.status !== 200) {
      if (response.status === 404) {
        throw new Error(`Directory "${directoryPath}" was not found (404). Please create it in your Koofr WebDAV.`);
      } else if (response.status === 401 || response.status === 403) {
        throw new Error(`WebDAV Authentication failed (${response.status}). Check your Koofr Username and App Password in Settings.`);
      }
      throw new Error(`WebDAV PROPFIND failed with status ${response.status}: ${response.text.slice(0, 200)}`);
    }

    return this.parsePropfindXml(response.text, directoryPath);
  }

  /**
   * Tests WebDAV connection with credentials
   */
  public async testConnection(): Promise<{ success: boolean; message: string; itemCount?: number }> {
    try {
      const items = await this.listDirectory("/");
      return {
        success: true,
        message: `Connected successfully! Found ${items.length} root items.`,
        itemCount: items.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Failed to connect to WebDAV server.",
      };
    }
  }

  /**
   * Creates a directory using MKCOL
   */
  public async createDirectory(directoryPath: string): Promise<boolean> {
    const url = this.buildUrl(directoryPath);
    const response = await this.executeRequest(url, {
      method: "MKCOL",
    });
    return response.status === 201 || response.status === 200 || response.status === 405; // 405 means already exists
  }

  /**
   * Downloads or streams a file as a Blob
   */
  public async getFileBlob(filePath: string): Promise<Blob> {
    const url = this.buildUrl(filePath);
    const authHeader = this.getAuthHeader();

    // Use proxy to get blob cleanly with auth
    const proxyUrl = `/api/webdav-proxy?target=${encodeURIComponent(url)}&_method=GET`;
    const res = await fetch(this.config.useServerProxy ? proxyUrl : url, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!res.ok) {
      // Retry via proxy
      const retryRes = await fetch(proxyUrl, {
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
      if (!retryRes.ok) throw new Error(`Failed to fetch file: ${retryRes.statusText}`);
      return await retryRes.blob();
    }

    return await res.blob();
  }

  /**
   * Parses WebDAV multistatus XML response
   */
  private parsePropfindXml(xmlText: string, currentPath: string): WebDAVItem[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const responses = xmlDoc.getElementsByTagNameNS("*", "response");
    const items: WebDAVItem[] = [];

    const cleanBaseUrl = this.getCleanBaseUrl();
    const baseUriPath = new URL(cleanBaseUrl).pathname.replace(/\/$/, "");

    for (let i = 0; i < responses.length; i++) {
      const resp = responses[i];
      const hrefEl = resp.getElementsByTagNameNS("*", "href")[0];
      if (!hrefEl) continue;

      const rawHref = hrefEl.textContent?.trim() || "";
      const decodedHref = decodeURIComponent(rawHref);

      // Extract path relative to Koofr base
      let itemPath = decodedHref;
      if (itemPath.startsWith(baseUriPath)) {
        itemPath = itemPath.slice(baseUriPath.length);
      }
      if (!itemPath.startsWith("/")) itemPath = `/${itemPath}`;
      itemPath = itemPath.replace(/\/+$/, ""); // remove trailing slash for comparison

      // Normalize currentPath for comparison
      const normalizedCurrent = currentPath.replace(/\/+$/, "");

      // Skip the container itself (the requested directory itself)
      if (itemPath === normalizedCurrent || itemPath === "" || itemPath === "/") {
        // If length is 1 and it's the root query, don't skip unless there are other items
        if (responses.length > 1) {
          continue;
        }
      }

      // Extract display name or fallback to last segment of href
      const displayNameEl = resp.getElementsByTagNameNS("*", "displayname")[0];
      let name = displayNameEl?.textContent?.trim() || "";
      if (!name) {
        const segments = decodedHref.replace(/\/+$/, "").split("/");
        name = segments[segments.length - 1] || "Unnamed";
      }

      // Check if directory (<D:collection/> or resourcetype)
      const resourceTypeEl = resp.getElementsByTagNameNS("*", "resourcetype")[0];
      const isCollection = resourceTypeEl && resourceTypeEl.getElementsByTagNameNS("*", "collection").length > 0;
      const type: "file" | "directory" = isCollection ? "directory" : "file";

      // File size
      const contentLengthEl = resp.getElementsByTagNameNS("*", "getcontentlength")[0];
      const size = contentLengthEl ? parseInt(contentLengthEl.textContent || "0", 10) : 0;

      // Last modified
      const lastModEl = resp.getElementsByTagNameNS("*", "getlastmodified")[0];
      const lastModified = lastModEl?.textContent || "";

      // Content Type
      const contentTypeEl = resp.getElementsByTagNameNS("*", "getcontenttype")[0];
      const mimeType = contentTypeEl?.textContent || "";

      const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() || "" : "";
      const isVideo = type === "file" && (VIDEO_EXTENSIONS.has(ext) || mimeType.startsWith("video/"));

      items.push({
        name,
        href: rawHref,
        path: itemPath || `/${name}`,
        type,
        size,
        lastModified,
        mimeType,
        isVideo,
        extension: ext,
      });
    }

    // Sort: directories first, then files alphabetically
    return items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}
