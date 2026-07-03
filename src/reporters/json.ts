import type { ScanResult } from '../scanner.js';

export function reportJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
