import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppMessage, MessageLevel, MessageService } from '../../services/message.service';

@Component({
  selector: 'app-message-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, DatePipe],
  templateUrl: './message-panel.component.html',
  styleUrl: './message-panel.component.scss'
})
export class MessagePanelComponent {
  readonly messages$ = this.messageService.messages$;
  collapsed = false;
  private readonly levelLabels: Record<MessageLevel, string> = {
    info: '动态',
    success: '完成',
    warning: '提醒',
    error: '异常'
  };

  constructor(private messageService: MessageService) {}

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  clear(): void {
    this.messageService.clear();
  }

  dismiss(messageId: number): void {
    this.messageService.remove(messageId);
  }

  getLevelLabel(level: MessageLevel): string {
    return this.levelLabels[level] ?? '动态';
  }

  trackByMessageId(_: number, message: AppMessage): number {
    return message.id;
  }
}