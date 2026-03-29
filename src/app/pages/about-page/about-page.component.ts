import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DataManagementComponent } from '../../components/data-management/data-management.component';
import { CORE_NAV_ITEMS, ENHANCEMENT_NAV_ITEMS } from '../../config/navigation';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, DataManagementComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent {
  readonly coreModules = CORE_NAV_ITEMS;
  readonly enhancementModules = ENHANCEMENT_NAV_ITEMS;
  readonly highlights = [
    'Angular 17 Standalone + Angular Material + SCSS',
    'Explore 与 Movies 两种浏览方式并存',
    '筛选条件可保留当前浏览视图',
    '快速跳转、最近浏览与片库存档'
  ];
  readonly techStack = [
    'Angular Router / loadComponent',
    'BehaviorSubject 状态管理',
    'Material Dialog / SnackBar',
    'LocalStorage 持久化',
    '真实海报校验与图片兜底策略'
  ];
}
