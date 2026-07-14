import { Scanner } from './scanner.js';
import type { ScanEvent } from './scanner.js';

interface ScanSession {
  id: string;
  scanner: Scanner;
  isScanning: boolean;
  currentResult: any;
  currentProgress: {
    isScanning: boolean;
    currentChecker: string;
    progress: number;
    message: string;
  };
  events: ScanEvent[];
  abortController: AbortController | null;
  scanMode?: string;
  pagesScanned?: number;
  lastActive: number;
}

let scanCounter = 0;

function generateScanId(): string {
  scanCounter++;
  return `scan_${Date.now()}_${scanCounter}`;
}

const api = {
  port: 4000,
  sessions: new Map<string, ScanSession>(),
  maxConcurrentScans: 2,
  maxEventsPerSession: 500,

  async scan(url: string, maxPages: number = 1, timeout: number = 60000, maxDepth: number = 5, scanMode?: string) {
    const scanId = generateScanId();
    const modeLabel = scanMode === 'deep' ? 'Deep Scan' : scanMode === 'custom' ? 'Custom Scan' : 'Quick Scan';
    const scanner = new Scanner({ scanMode: modeLabel } as any);
    const abortController = new AbortController();

    const session: ScanSession = {
      id: scanId,
      scanner,
      isScanning: true,
      currentResult: null,
      currentProgress: {
        isScanning: true,
        currentChecker: '',
        progress: 0,
        message: 'Starting scan...'
      },
      events: [],
      abortController,
      scanMode,
      lastActive: Date.now()
    };

    this.sessions.set(scanId, session);

    scanner.onProgress((progress: number, message: string) => {
      if (this.sessions.has(scanId)) {
        this.sessions.get(scanId)!.currentProgress = {
          isScanning: true,
          currentChecker: message,
          progress: progress,
          message: message
        };
      }
    });

    scanner.onEvent((event: ScanEvent) => {
      if (this.sessions.has(scanId)) {
        const session = this.sessions.get(scanId)!;
        session.events.push(event);
        if (session.events.length > this.maxEventsPerSession) {
          session.events = session.events.slice(-this.maxEventsPerSession);
        }
      }
    });

    // Run scan in background, don't await here
    (async () => {
      try {
        const result = await scanner.scan(url, { maxPages, timeout, maxDepth });
        if (this.sessions.has(scanId)) {
          this.sessions.get(scanId)!.currentResult = result;
          this.sessions.get(scanId)!.pagesScanned = result.pagesScanned || 0;
          this.sessions.get(scanId)!.currentProgress = {
            isScanning: false,
            currentChecker: '',
            progress: 100,
            message: 'Complete!'
          };
        }
      } catch (err: any) {
        if (this.sessions.has(scanId)) {
          this.sessions.get(scanId)!.currentProgress = {
            isScanning: false,
            currentChecker: '',
            progress: 100,
            message: 'Scan failed'
          };
          this.sessions.get(scanId)!.currentResult = { error: err.message || 'Scan failed' };
          console.log('[API] Scan failed for', scanId, ':', err.message);
        }
      } finally {
        if (this.sessions.has(scanId)) {
          this.sessions.get(scanId)!.isScanning = false;
        }
      }
    })();

    return { scanId };
  },

  getSession(scanId: string) {
    return this.sessions.get(scanId) || null;
  },

  getResult(scanId: string) {
    const session = this.sessions.get(scanId);
    return session ? session.currentResult : null;
  },

  getProgress(scanId: string) {
    const session = this.sessions.get(scanId);
    if (!session) {
      return { isScanning: false, currentChecker: '', progress: 0, message: '', scanId };
    }
    session.lastActive = Date.now();
    return { ...session.currentProgress, scanId };
  },

  isBusy() {
    return this.sessions.size >= this.maxConcurrentScans;
  },

  getActiveScans() {
    const active: { id: string; progress: number; message: string }[] = [];
    for (const [id, session] of this.sessions) {
      if (session.isScanning) {
        active.push({
          id,
          progress: session.currentProgress.progress,
          message: session.currentProgress.message
        });
      }
    }
    return active;
  },

  getEvents(scanId: string, since: number = 0) {
    const session = this.sessions.get(scanId);
    if (!session) {
      return [];
    }
    session.lastActive = Date.now();
    return session.events.slice(since);
  },

  async stop(scanId: string) {
    const session = this.sessions.get(scanId);
    if (!session || !session.isScanning) {
      return { error: 'No scan in progress' };
    }
    session.isScanning = false;
    session.currentProgress = {
      isScanning: false,
      currentChecker: '',
      progress: 0,
      message: ''
    };
    try {
      session.abortController?.abort();
      await session.scanner.stop();
    } catch (err) {
      // Scanner may not support stop, that's ok
    }
    return { stopped: true, scanId };
  },

  cleanupCompleted() {
    const completed: string[] = [];
    for (const [id, session] of this.sessions) {
      if (!session.isScanning) {
        completed.push(id);
      }
    }
    for (const id of completed) {
      this.sessions.delete(id);
    }
    return completed;
  }
};

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of api.sessions) {
    if (!session.isScanning && (now - session.lastActive) > IDLE_TIMEOUT_MS) {
      session.abortController?.abort();
      session.scanner?.stop();
      api.sessions.delete(id);
      console.log(`[API] Cleaned up idle scan: ${id}`);
    }
  }
  api.cleanupCompleted();
}, 60000);

export default api;
