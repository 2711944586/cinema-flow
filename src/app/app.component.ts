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

  constructor(private dialog: MatDialog) {}

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
}
