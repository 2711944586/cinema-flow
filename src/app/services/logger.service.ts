import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  level: LogLevel;
  source: string;
  message: string;
  createdAt: Date;
  meta: unknown | null;
}

/**
 * Simple logger service for demonstration purposes
 * Shows how multiple services can work together
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly maxEntries = 120;
  private readonly logsSubject = new BehaviorSubject<LogEntry[]>([]);
  private logSequence = 0;

  readonly logs$ = this.logsSubject.asObservable();

  log(message: string, source = 'CinemaFlow', meta?: unknown): void {
    this.pushEntry('info', source, message, meta);
    console.log(this.formatPrefix('info', source), message, meta ?? '');
  }

  warn(message: string, source = 'CinemaFlow', meta?: unknown): void {
    this.pushEntry('warn', source, message, meta);
    console.warn(this.formatPrefix('warn', source), message, meta ?? '');
  }

  error(message: string, source = 'CinemaFlow', meta?: unknown): void {
    this.pushEntry('error', source, message, meta);
    console.error(this.formatPrefix('error', source), message, meta ?? '');
  }

  getLogs(limit = this.maxEntries): LogEntry[] {
    return this.logsSubject.value.slice(0, limit).map(entry => ({
      ...entry,
      createdAt: new Date(entry.createdAt)
    }));
  }

  getLogCount(): number {
    return this.logsSubject.value.length;
  }

  clear(): void {
    this.logsSubject.next([]);
  }

  private pushEntry(level: LogLevel, source: string, message: string, meta?: unknown): void {
    const nextEntry: LogEntry = {
      id: ++this.logSequence,
      level,
      source,
      message,
      createdAt: new Date(),
      meta: meta ?? null
    };

    const nextLogs = [nextEntry, ...this.logsSubject.value].slice(0, this.maxEntries);
    this.logsSubject.next(nextLogs);
  }

  private formatPrefix(level: LogLevel, source: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const label = level === 'info' ? 'INFO' : level === 'warn' ? 'WARN' : 'ERROR';
    return `[${timestamp}] [${label}] [${source}]`;
  }
}
