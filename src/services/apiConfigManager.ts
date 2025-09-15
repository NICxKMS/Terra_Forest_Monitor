// API Configuration Manager - handles API keys and switching between mock/live data
import { API_CONFIG } from './apiConfig';

interface StoredApiKeys {
  nasa_firms?: string;
  openweather?: string;
  sentinel_hub_client_id?: string;
  sentinel_hub_client_secret?: string;
}

export class ApiConfigManager {
  private static instance: ApiConfigManager;
  private apiKeys: StoredApiKeys = {};
  private useLiveData: boolean = false;
  private noMock: boolean = false;

  private constructor() {
    this.loadApiKeys();
    this.loadNoMockFlag();
  }

  public static getInstance(): ApiConfigManager {
    if (!ApiConfigManager.instance) {
      ApiConfigManager.instance = new ApiConfigManager();
    }
    return ApiConfigManager.instance;
  }

  private loadApiKeys(): void {
    try {
      const saved = localStorage.getItem('forest-explorer-api-keys');
      const parsedKeys = saved ? JSON.parse(saved) : {};

      // Read environment-provided keys (Vite)
      const envKeys: StoredApiKeys = {
        nasa_firms: (import.meta as any).env?.VITE_NASA_FIRMS_API_KEY,
        openweather: (import.meta as any).env?.VITE_OPENWEATHER_API_KEY,
        sentinel_hub_client_id: (import.meta as any).env?.VITE_SENTINEL_HUB_CLIENT_ID,
        sentinel_hub_client_secret: (import.meta as any).env?.VITE_SENTINEL_HUB_CLIENT_SECRET,
      };

      this.apiKeys = {
        nasa_firms: parsedKeys.nasa_firms?.value || envKeys.nasa_firms,
        openweather: parsedKeys.openweather?.value || envKeys.openweather,
        sentinel_hub_client_id: parsedKeys.sentinel_hub?.value || envKeys.sentinel_hub_client_id,
        sentinel_hub_client_secret: parsedKeys.sentinel_hub_secret?.value || envKeys.sentinel_hub_client_secret,
      };

      // Enable live data if any API keys are present
      this.useLiveData = Object.values(this.apiKeys).some(key => key && key.length > 0);
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  private loadNoMockFlag(): void {
    try {
      const saved = localStorage.getItem('forest-explorer-no-mock');
      this.noMock = saved === '1' || saved === 'true';
    } catch {}
  }

  public refreshApiKeys(): void {
    this.loadApiKeys();
    this.loadNoMockFlag();
  }

  public hasApiKey(service: keyof StoredApiKeys): boolean {
    return !!(this.apiKeys[service] && this.apiKeys[service]!.length > 0);
  }

  public getApiKey(service: keyof StoredApiKeys): string | undefined {
    return this.apiKeys[service];
  }

  public shouldUseLiveData(): boolean {
    return this.useLiveData && Object.values(this.apiKeys).some(key => key && key.length > 0);
  }

  public isNoMockEnabled(): boolean {
    return this.noMock === true;
  }

  public setNoMock(enabled: boolean): void {
    this.noMock = enabled;
    try {
      localStorage.setItem('forest-explorer-no-mock', enabled ? '1' : '0');
    } catch {}
  }

  public getConfiguredApis(): string[] {
    const configured: string[] = [];
    if (this.apiKeys.nasa_firms && this.apiKeys.nasa_firms.length > 0) configured.push('nasa_firms');
    if (this.apiKeys.openweather && this.apiKeys.openweather.length > 0) configured.push('openweather');
    if (
      this.apiKeys.sentinel_hub_client_id && this.apiKeys.sentinel_hub_client_id.length > 0 &&
      this.apiKeys.sentinel_hub_client_secret && this.apiKeys.sentinel_hub_client_secret.length > 0
    ) configured.push('sentinel_hub');
    return configured;
  }

  // Get API configuration with live keys
  public getApiConfig() {
    return {
      ...API_CONFIG,
      NASA_FIRMS: {
        ...API_CONFIG.NASA_FIRMS,
        API_KEY: this.apiKeys.nasa_firms || API_CONFIG.NASA_FIRMS.API_KEY
      },
      OPENWEATHER: {
        ...API_CONFIG.OPENWEATHER,
        API_KEY: this.apiKeys.openweather || API_CONFIG.OPENWEATHER.API_KEY
      },
      SENTINEL_HUB: {
        ...API_CONFIG.SENTINEL_HUB,
        CLIENT_ID: this.apiKeys.sentinel_hub_client_id || API_CONFIG.SENTINEL_HUB.CLIENT_ID,
        CLIENT_SECRET: this.apiKeys.sentinel_hub_client_secret || API_CONFIG.SENTINEL_HUB.CLIENT_SECRET
      }
    };
  }

  // Test if an API endpoint is reachable
  public async testApiConnection(service: string): Promise<{ success: boolean; error?: string; latencyMs?: number; endpoint?: string; statusCode?: number }> {
    const baseUrl = (typeof window !== 'undefined' && (window as any).__FOREST_WORKER_BASE__) || (import.meta as any).env?.VITE_FOREST_WORKER_BASE || 'https://forest.nicx.me/api';
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let endpoint = '';
    try {
      switch (service) {
        case 'openweather': {
          endpoint = `${baseUrl}/weather?lat=51.5074&lng=-0.1278`;
          const response = await fetch(endpoint);
          const body = await response.json().catch(() => ({}));
          const latencyMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
          if (response.ok && body?.success) return { success: true, latencyMs, endpoint, statusCode: response.status };
          return { success: false, error: `HTTP ${response.status}`, latencyMs, endpoint, statusCode: response.status };
        }
        case 'nasa_firms': {
          endpoint = `${baseUrl}/fire-alerts?region=world&days=1`;
          const response = await fetch(endpoint);
          const body = await response.json().catch(() => ({}));
          const latencyMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
          if (response.ok && body?.success) return { success: true, latencyMs, endpoint, statusCode: response.status };
          return { success: false, error: `HTTP ${response.status}`, latencyMs, endpoint, statusCode: response.status };
        }
        case 'nasa_gibs': {
          endpoint = `${baseUrl}/satellite-data?lat=0&lng=0`;
          const response = await fetch(endpoint);
          const body = await response.json().catch(() => ({}));
          const latencyMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
          if (response.ok && body?.success) return { success: true, latencyMs, endpoint, statusCode: response.status };
          return { success: false, error: `HTTP ${response.status}`, latencyMs, endpoint, statusCode: response.status };
        }
        case 'global_forest_watch': {
          endpoint = `${baseUrl}/deforestation-alerts?region=BRA`;
          const response = await fetch(endpoint);
          const body = await response.json().catch(() => ({}));
          const latencyMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
          if (response.ok && body?.success) return { success: true, latencyMs, endpoint, statusCode: response.status };
          return { success: false, error: `HTTP ${response.status}`, latencyMs, endpoint, statusCode: response.status };
        }
        case 'gbif': {
          endpoint = `${baseUrl}/biodiversity?region=global&limit=1`;
          const response = await fetch(endpoint);
          const body = await response.json().catch(() => ({}));
          const latencyMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
          if (response.ok && body?.success) return { success: true, latencyMs, endpoint, statusCode: response.status };
          return { success: false, error: `HTTP ${response.status}`, latencyMs, endpoint, statusCode: response.status };
        }
        case 'sentinel_hub': {
          // No direct worker endpoint; report configuration only
          const latencyMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
          return { success: this.hasApiKey('sentinel_hub_client_id') && this.hasApiKey('sentinel_hub_client_secret'), latencyMs, endpoint: 'Sentinel Hub (client-side config)', statusCode: 0 };
        }
        default:
          return { success: false, error: 'Unknown service' };
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Connection failed';
      if (errorMessage.includes('CORS')) {
        errorMessage += ' (CORS policy restriction)';
      } else if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error or CORS restriction';
      }
      const latencyMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
      return { 
        success: false, 
        error: errorMessage,
        latencyMs,
        endpoint
      };
    }
  }

  // Enable/disable live data mode
  public setUseLiveData(enabled: boolean): void {
    this.useLiveData = enabled;
  }

  // Get status of all configured APIs
  public async getApiStatuses(): Promise<Record<string, { connected: boolean; error?: string; latencyMs?: number; endpoint?: string }>> {
    const services = ['openweather', 'nasa_firms', 'nasa_gibs', 'global_forest_watch', 'gbif'];
    const statuses: Record<string, { connected: boolean; error?: string; latencyMs?: number; endpoint?: string }> = {};
    for (const service of services) {
      const result = await this.testApiConnection(service);
      statuses[service] = {
        connected: result.success,
        error: result.error,
        latencyMs: result.latencyMs,
        endpoint: result.endpoint
      };
    }
    return statuses;
  }
}

// Export singleton instance
export const apiConfigManager = ApiConfigManager.getInstance();