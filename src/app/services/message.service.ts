import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoggerService } from './logger.service';

export type MessageLevel = 'info' | 'success' | 'warning' | 'error';

export interface AppMessage {
  id: number;
  level: MessageLevel;
  source: string;
  text: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly maxMessages = 20;
  private readonly messagesSubject = new BehaviorSubject<AppMessage[]>([]);
  private messageSequence = 0;

  readonly messages$ = this.messagesSubject.asObservable();

  constructor(private logger: LoggerService) {}

  get messages(): AppMessage[] {
    return this.messagesSubject.value.map(message => ({
      ...message,
      createdAt: new Date(message.createdAt)
    }));
  }

  info(text: string, source = 'CinemaFlow'): AppMessage {
    return this.pushMessage('info', text, source);
  }

  success(text: string, source = 'CinemaFlow'): AppMessage {
    return this.pushMessage('success', text, source);
  }

  warning(text: string, source = 'CinemaFlow'): AppMessage {
    return this.pushMessage('warning', text, source);
  }

  error(text: string, source = 'CinemaFlow'): AppMessage {
    return this.pushMessage('error', text, source);
  }

  remove(messageId: number): void {
    this.messagesSubject.next(this.messagesSubject.value.filter(message => message.id !== messageId));
  }

  clear(): void {
    this.messagesSubject.next([]);
  }

  private pushMessage(level: MessageLevel, text: string, source: string): AppMessage {
    const nextMessage: AppMessage = {
      id: ++this.messageSequence,
      level,
      source,
      text,
      createdAt: new Date()
    };

    const nextMessages = [nextMessage, ...this.messagesSubject.value]
      .slice(0, this.maxMessages)
      .map(message => ({
        ...message,
        createdAt: new Date(message.createdAt)
      }));

    this.messagesSubject.next(nextMessages);
    this.writeToLogger(nextMessage);
    return { ...nextMessage, createdAt: new Date(nextMessage.createdAt) };
  }

  private writeToLogger(message: AppMessage): void {
    const label = `MessagePanel: ${message.text}`;
    if (message.level === 'error') {
      this.logger.error(label, message.source);
      return;
    }

    if (message.level === 'warning') {
      this.logger.warn(label, message.source);
      return;
    }

    this.logger.log(label, message.source);
  }
}