// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  loginMock() {
    return { user: 'test', token: '123' };
  }
}
