import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  baseUrl: string;
}

interface CinemaFlowRuntimeConfig {
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    __CINEMAFLOW_CONFIG__?: CinemaFlowRuntimeConfig;
  }
}

export const API_CONFIG = new InjectionToken<ApiConfig>('cinemaflow.api.config', {
  providedIn: 'root',
  factory: () => ({
    baseUrl: window.__CINEMAFLOW_CONFIG__?.apiBaseUrl || '/api'
  })
});

export function buildApiUrl(config: ApiConfig, path: string): string {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
