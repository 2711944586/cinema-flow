import { Pipe, PipeTransform } from '@angular/core';

/**
 * 评分等级管道
 * 将数字评分转换为中文等级描述
 * ≥ 9.0 → 神作 | ≥ 7.0 → 推荐 | < 7.0 → 平庸
 */
@Pipe({
  name: 'ratingLevel',
  standalone: true
})
export class RatingLevelPipe implements PipeTransform {
  transform(rating: number): string {
    if (rating >= 9.0) {
      return '🏆 神作';
    } else if (rating >= 7.0) {
      return '👍 推荐';
    } else {
      return '😐 平庸';
    }
  }
}
