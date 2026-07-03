import fs from 'node:fs';
import path from 'node:path';

export interface ScanlyConfig {
  targetUrl: string;
  maxPages: number;
  maxDepth: number;
  timeout: number;
  excludePatterns: string[];
  includePatterns: string[];
  reportFormat: 'text' | 'json' | 'html';
  reportOutput: string;
  checkers: {
    missingAlt: boolean;
    brokenLinks: boolean;
    emptyPictures: boolean;
    emptyButtons: boolean;
    formatCheck: boolean;
    errorRender: boolean;
  };
}

export const DEFAULT_CONFIG: Partial<ScanlyConfig> = {
  maxPages: 50,
  maxDepth: 5,
  timeout: 10000,
  excludePatterns: ['*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx'],
  includePatterns: [],
  reportFormat: 'text',
  reportOutput: '',
  checkers: {
    missingAlt: true,
    brokenLinks: true,
    emptyPictures: true,
    emptyButtons: true,
    formatCheck: true,
    errorRender: true,
  },
};

export function loadConfig(configPath?: string): Partial<ScanlyConfig> {
  if (configPath) {
    const resolved = path.resolve(configPath);
    if (!fs.existsSync(resolved)) {
      console.error(`Config file not found: ${resolved}`);
      return DEFAULT_CONFIG;
    }
    const raw = fs.readFileSync(resolved, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ScanlyConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  }

  const searchDirs = [process.cwd(), path.join(process.cwd(), '.scanly'), path.join(process.cwd(), 'config')];
  for (const dir of searchDirs) {
    const candidate = path.join(dir, 'scanly.config.json');
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ScanlyConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  }

  return DEFAULT_CONFIG;
}
