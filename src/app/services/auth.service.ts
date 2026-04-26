import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'cinemaflow.auth.v1';
  private readonly authenticatedSubject = new BehaviorSubject<boolean>(this.readStoredState());

  readonly isAuthenticated$ = this.authenticatedSubject.asObservable();

  get isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  login(username = 'admin', password = 'admin'): boolean {
    const ok = username === 'admin' && password === 'admin';
    this.setAuthenticated(ok);
    return ok;
  }

  logout(): void {
    this.setAuthenticated(false);
  }

  private setAuthenticated(value: boolean): void {
    this.authenticatedSubject.next(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, value ? 'true' : 'false');
    }
  }

  private readStoredState(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.storageKey) === 'true';
  }
}
