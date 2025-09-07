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

  private constructor() {
    this.loadApiKeys();
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
      if (saved) {
        const parsedKeys = JSON.parse(saved);
        this.apiKeys = {
          nasa_firms: parsedKeys.nasa_firms?.value,
          openweather: parsedKeys.openweather?.value,
          sentinel_hub_client_id: parsedKeys.sentinel_hub?.value,
          sentinel_hub_client_secret: parsedKeys.sentinel_hub_secret?.value
        };
        // Enable live data if any API keys are present
        this.useLiveData = Object.values(this.apiKeys).some(key => key && key.length > 0);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  public refreshApiKeys(): void {
    this.loadApiKeys();
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

  public getConfiguredApis(): string[] {
    return Object.entries(this.apiKeys)
      .filter(([_, value]) => value && value.length > 0)
      .map(([key, _]) => key);
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
  public async testApiConnection(service: string): Promise<{ success: boolean; error?: string }> {
    try {
      switch (service) {
        case 'openweather': {
          const apiKey = this.getApiKey('openweather');
          if (!apiKey || apiKey === 'YOUR_OPENWEATHER_API_KEY_HERE') {
            return { success: false, error: 'Valid API key required' };
          }
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${apiKey}`,
            { mode: 'cors' }
          );
          if (response.status === 401) {
            return { success: false, error: 'Invalid API key' };
          }
          return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
        }
        
        case 'nasa_firms': {
          const apiKey = this.getApiKey('nasa_firms');
          if (!apiKey || apiKey === 'YOUR_NASA_FIRMS_API_KEY_HERE') {
            return { success: false, error: 'Valid API key required' };
          }
          // Use a lighter endpoint for testing
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const response = await fetch(
            `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/MODIS_NRT/world/1/${yesterday}`,
            { 
              mode: 'cors',
              headers: { 'Accept': 'text/csv' }
            }
          );
          if (response.status === 403) {
            return { success: false, error: 'Invalid API key or access denied' };
          }
          return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
        }
        
        case 'nasa_gibs': {
          // NASA GIBS doesn't require an API key
          const response = await fetch(
            'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities',
            { 
              mode: 'cors',
              headers: { 'Accept': 'application/xml' }
            }
          );
          return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
        }
        
        case 'global_forest_watch': {
          // Note: This API may have CORS restrictions in browsers
          try {
            const response = await fetch(
              'https://production-api.globalforestwatch.org/v1/forest-change/umd-loss-gain?lat=0&lng=0',
              { 
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
              }
            );
            if (response.status === 400) {
              // 400 is expected for invalid coordinates, but means API is reachable
              return { success: true, error: undefined };
            }
            return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
          } catch (corsError) {
            // CORS error means API exists but has restrictions
            return { success: true, error: 'CORS restricted (API accessible via server)' };
          }
        }
        
        case 'gbif': {
          // GBIF is generally CORS-friendly
          const response = await fetch(
            'https://api.gbif.org/v1/occurrence/search?limit=1',
            { 
              mode: 'cors',
              headers: { 'Accept': 'application/json' }
            }
          );
          return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
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
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  // Enable/disable live data mode
  public setUseLiveData(enabled: boolean): void {
    this.useLiveData = enabled;
  }

  // Get status of all configured APIs
  public async getApiStatuses(): Promise<Record<string, { connected: boolean; error?: string }>> {
    const services = ['openweather', 'nasa_firms', 'nasa_gibs', 'global_forest_watch', 'gbif'];
    const statuses: Record<string, { connected: boolean; error?: string }> = {};
    
    for (const service of services) {
      const result = await this.testApiConnection(service);
      statuses[service] = {
        connected: result.success,
        error: result.error
      };
    }
    
    return statuses;
  }
}

// Export singleton instance
export const apiConfigManager = ApiConfigManager.getInstance();