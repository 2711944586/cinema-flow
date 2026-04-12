import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { DataPortService } from '../../services/data-port.service';
import { MessageService } from '../../services/message.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './data-management.component.html',
  styleUrl: './data-management.component.scss'
})
export class DataManagementComponent {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;
  readonly summary$ = this.dataPortService.summary$;

  constructor(
    private dataPortService: DataPortService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private messageService: MessageService
  ) {}

  exportJson(): void {
    this.dataPortService.downloadBackup();
    this.messageService.success('已导出当前片库、影评、计划、日志与智能选片预设的 JSON 备份。', 'Data Management');
    this.snackBar.open('已导出当前片库与用户状态 JSON', '关闭', { duration: 2600 });
  }

  openImportPicker(): void {
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const result = this.dataPortService.parseBackup(content);

      if (!result.ok) {
        this.messageService.error(result.error, 'Data Management');
        this.snackBar.open(result.error, '关闭', { duration: 3200 });
        input.value = '';
        return;
      }

      const confirmed = await firstValueFrom(this.dialog.open(ConfirmDialogComponent, {
        data: {
          icon: 'restore',
          title: '确认恢复片库数据',
          message: `将导入 ${result.payload.meta.movieCount} 部电影、${result.payload.meta.reviewCount} 条影评、${result.payload.meta.recentHistoryCount} 条最近浏览、${result.payload.meta.watchPlanCount} 条待看片单、${result.payload.meta.watchLogCount} 条观影日志以及 ${result.payload.meta.viewingPresetCount} 个智能选片预设。当前本地状态会被覆盖。`,
          confirmLabel: '开始恢复',
          cancelLabel: '取消',
          tone: 'danger'
        },
        panelClass: 'cf-dialog-panel'
      }).afterClosed());

      if (confirmed) {
        this.dataPortService.restoreBackup(result.payload);
        this.messageService.success('数据恢复完成，片库、计划、日志与推荐预设都已同步刷新。', 'Data Management');
        this.snackBar.open('数据恢复完成，页面状态已更新', '关闭', { duration: 3200 });
      }
    } catch {
      this.messageService.error('读取导入文件失败，请检查文件编码或 JSON 内容。', 'Data Management');
      this.snackBar.open('读取导入文件失败，请重试。', '关闭', { duration: 3200 });
    } finally {
      input.value = '';
    }
  }
}
