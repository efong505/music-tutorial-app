// src/app/core/guards/auth.guard.ts
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  return true; // mock always true
};
