import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { CommandPaletteComponent } from './components/command-palette/command-palette.component';
import { MessagePanelComponent } from './components/message-panel/message-panel.component';
import { PageJumpBarComponent } from './components/page-jump-bar/page-jump-bar.component';
import { CORE_NAV_ITEMS, ENHANCEMENT_NAV_ITEMS } from './config/navigation';
import { AuthService } from './services/auth.service';
import { MessageService } from './services/message.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    BreadcrumbComponent,
    MessagePanelComponent,
    PageJumpBarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly coreNav = CORE_NAV_ITEMS;
  readonly enhancementNav = ENHANCEMENT_NAV_ITEMS;
  readonly isAuthenticated$ = this.authService.isAuthenticated$;

  constructor(
    private dialog: MatDialog,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  @HostListener('window:keydown', ['$event'])
  onGlobalShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openCommandPalette();
    }
  }

  openCommandPalette(): void {
    if (this.dialog.openDialogs.some(dialogRef => dialogRef.componentInstance instanceof CommandPaletteComponent)) {
      return;
    }

    this.dialog.open(CommandPaletteComponent, {
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'cf-command-palette-panel',
      backdropClass: 'cf-dialog-backdrop'
    });
  }

  toggleAuth(): void {
    if (this.authService.isAuthenticated) {
      this.authService.logout();
      this.messageService.info('已退出编辑模式，添加电影页面将重新受路由守卫保护。', 'Auth');
      return;
    }

    const ok = this.authService.login('admin', 'admin');
    if (ok) {
      this.messageService.success('已进入编辑模式，可以访问添加电影页面。', 'Auth');
    }
  }
}
