import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { getVisiblePageNumbers, normalizePageSize } from '../../utils/pagination';

@Component({
  selector: 'app-list-pager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './list-pager.component.html',
  styleUrl: './list-pager.component.scss'
})
export class ListPagerComponent implements OnChanges {
  @Input() label = '列表';
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 12;
  @Input() pageSizeOptions: number[] = [8, 12, 24, 48];
  @Input() showPageSize = true;

  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();

  jumpTarget = '1';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPage']) {
      this.jumpTarget = String(this.currentPage);
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageNumbers(): number[] {
    return getVisiblePageNumbers(this.currentPage, this.totalPages);
  }

  get summaryText(): string {
    if (this.totalItems === 0) {
      return '当前没有可翻页的内容';
    }

    const startItem = (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);
    return `第 ${this.currentPage} / ${this.totalPages} 页 · 显示 ${startItem}-${endItem} 条，共 ${this.totalItems} 条`;
  }

  goToPage(page: number): void {
    const normalizedPage = Math.max(1, Math.min(this.totalPages, page));
    if (normalizedPage === this.currentPage) {
      return;
    }

    this.pageChange.emit(normalizedPage);
  }

  changePageSize(pageSize: number): void {
    const normalizedPageSize = normalizePageSize(pageSize, this.pageSizeOptions[0] ?? 12, this.pageSizeOptions);
    if (normalizedPageSize === this.pageSize) {
      return;
    }

    this.pageSizeChange.emit(normalizedPageSize);
  }

  submitJump(): void {
    const numericTarget = Number(this.jumpTarget);
    if (!Number.isFinite(numericTarget)) {
      this.jumpTarget = String(this.currentPage);
      return;
    }

    this.goToPage(Math.floor(numericTarget));
  }
}
