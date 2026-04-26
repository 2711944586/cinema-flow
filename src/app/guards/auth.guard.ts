import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { MessageService } from '../services/message.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const messageService = inject(MessageService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  messageService.warning('添加电影需要先登录。演示账号已固定为 admin / admin，可点击顶部按钮进入编辑模式。', 'Auth Guard');
  return router.createUrlTree(['/dashboard']);
};
