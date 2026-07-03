import { Scanner } from './scanner.js';

const server = {
  port: 4000,
  scanner: new Scanner(),
  isScanning: false,
  currentResult: null as any,
  currentProgress: {
    isScanning: false,
    currentChecker: '',
    progress: 0,
    message: ''
  },

  async scan(url: string, maxPages: number = 1, timeout: number = 60000) {
    if (this.isScanning) {
      return { error: 'A scan is already in progress' };
    }

    this.isScanning = true;
    this.currentResult = null;
    this.currentProgress = {
      isScanning: true,
      currentChecker: '',
      progress: 0,
      message: 'Starting scan...'
    };

    // Set up progress callback
    this.scanner.onProgress((progress: number, message: string) => {
      this.currentProgress = {
        isScanning: true,
        currentChecker: message,
        progress: progress,
        message: message
      };
    });

    try {
      const result = await this.scanner.scan(url, { maxPages, timeout });
      this.currentResult = result;
      this.currentProgress = {
        isScanning: false,
        currentChecker: '',
        progress: 100,
        message: 'Complete!'
      };
      return result;
    } catch (err: any) {
      this.currentProgress = {
        isScanning: false,
        currentChecker: '',
        progress: 100,
        message: 'Scan failed'
      };
      return { error: err.message || 'Scan failed' };
    } finally {
      this.isScanning = false;
    }
  },

  getResult() {
    return this.currentResult;
  },

  isBusy() {
    return this.isScanning;
  },

  getProgress() {
    return this.currentProgress;
  },

  async stop() {
    if (!this.isScanning) {
      return { error: 'No scan in progress' };
    }
    this.isScanning = false;
    this.currentProgress = {
      isScanning: false,
      currentChecker: '',
      progress: 0,
      message: ''
    };
    try {
      await this.scanner.stop();
    } catch (err) {
      // Scanner may not support stop, that's ok
    }
    return { stopped: true };
  }
};

export default server;
