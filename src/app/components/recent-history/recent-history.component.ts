import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RecentHistoryEntry } from '../../services/recent-history.service';

@Component({
  selector: 'app-recent-history',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './recent-history.component.html',
  styleUrl: './recent-history.component.scss'
})
export class RecentHistoryComponent {
  @Input() entries: RecentHistoryEntry[] = [];
  @Input() title = '最近浏览';
  @Input() description = '继续回到你刚看过的电影页。';
  @Input() emptyTitle = '还没有最近浏览记录';
  @Input() emptyDescription = '访问电影详情页后显示最近记录。';
  @Input() compact = false;
}
