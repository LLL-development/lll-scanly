export type IssueSeverity = 'error' | 'warning' | 'info';

export interface Issue {
  type: string;
  severity: IssueSeverity;
  url: string;
  element?: string;
  message: string;
  suggestion?: string;
}

export interface Checker {
  name: string;
  severity: IssueSeverity;
  scan(url: string, maxPages?: number, timeout?: number, options?: { signal?: AbortSignal; page?: import('playwright').Page; context?: import('playwright').BrowserContext; maxDepth?: number; excludePatterns?: string[]; includePatterns?: string[] }): Promise<Issue[]>;
}
