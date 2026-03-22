import { Injectable } from '@angular/core';

/**
 * Simple logger service for demonstration purposes
 * Shows how multiple services can work together
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private logCount = 0;

  log(message: string): void {
    this.logCount++;
    console.log(`[${new Date().toLocaleTimeString()}] [${this.logCount}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${new Date().toLocaleTimeString()}] [WARN] ${message}`);
  }

  error(message: string): void {
    console.error(`[${new Date().toLocaleTimeString()}] [ERROR] ${message}`);
  }

  getLogCount(): number {
    return this.logCount;
  }
}
