import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MessageService } from '../../services/message.service';

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
}