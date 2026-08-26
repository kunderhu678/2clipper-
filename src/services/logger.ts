import { HttpLogEntry, ServiceType } from "../types";

type LogListener = (logs: HttpLogEntry[]) => void;

class DebugLogger {
  private logs: HttpLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 200;

  constructor() {
    // Initial system log
    this.log({
      service: "System",
      method: "INIT",
      url: "client://applet",
      status: 200,
      durationMs: 0,
      responseBody: { message: "Video Clip Orchestrator Debugger initialized. 0-RAM Serverless mode active." },
    });
  }

  public log(entry: Omit<HttpLogEntry, "id" | "timestamp">): HttpLogEntry {
    const fullEntry: HttpLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      ...entry,
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.notify();
    return fullEntry;
  }

  public getLogs(): HttpLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getLogs();
    this.listeners.forEach((fn) => fn(current));
  }

  public exportLogsJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new DebugLogger();
