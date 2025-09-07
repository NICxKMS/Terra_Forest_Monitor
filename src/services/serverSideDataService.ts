// Server-side Data Service - connects to Supabase Edge Functions API proxy
import { supabase } from '../utils/supabase/client';
import { CACHE_DURATIONS } from './apiConfig';
import { apiConfigManager } from './apiConfigManager';

interface ServerApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  cached?: boolean;
  source?: string;
}

interface ForestRegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  healthScore: number;
  deforestationRate: number;
  biodiversityIndex: number;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdate: string;
  area: number;
  forestCover: number;
  fireRisk: number;
  temperature: number;
  precipitation: number;
}

interface ForestAlert {
  id: string;
  timestamp: string;
  location: string;
  type: 'fire' | 'deforestation' | 'biodiversity' | 'weather';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  coordinates: { lat: number; lng: number };
  metadata?: any;
}

interface BiodiversityData {
  id: string;
  name: string;
  scientificName: string;
  status: 'stable' | 'declining' | 'critically_endangered' | 'recovering';
  population: number;
  trend: number;
  habitat: string;
  lastSeen: string;
  confidence: number;
  threatLevel: number;
  conservationStatus: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  pressure: number;
  cloudCover: number;
  uvIndex: number;
  fireWeatherIndex: number;
  location: string;
  country: string;
  description: string;
}

export class ServerSideDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private baseUrl = (typeof window !== 'undefined' && (window as any).__FOREST_WORKER_BASE__) || (import.meta as any).env?.VITE_FOREST_WORKER_BASE || 'https://forest.nicx.me/api';

  constructor() {
    console.log('🚀 Server-side data service initialized');
    console.log('📡 Checking for deployed Supabase Edge Functions...');
    console.log('💡 Deploy with: supabase functions deploy forest-api');
    console.log('💡 Deploy with: supabase functions deploy forest-data-webhook');
  }

  // Health check for server-side API
  public async checkServerHealth(): Promise<{ success: boolean; details?: any; error?: string }> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), 5000);
      });

      const healthPromise = fetch(`${this.baseUrl}/health`).then(r => r.json()).then((data) => ({ data, error: null }));
      
      const { data, error } = await Promise.race([healthPromise, timeoutPromise]) as any;
      
      if (error) {
        throw new Error(error.message);
      }

      console.log('🟢 Server health:', data);
      return { success: true, details: data };
    } catch (err) {
      console.log('ℹ️ Server health check failed:', (err as any)?.message);
      return { 
        success: false, 
        error: 'Edge Functions not deployed or accessible',
        details: {
          message: 'Deploy Supabase Edge Functions to enable server-side API proxy',
          fallback: 'Using enhanced browser service with CORS limitations'
        }
      };
    }
  }

  // Get comprehensive forest region data
  public async getForestRegions(): Promise<ForestRegion[]> {
    const cacheKey = 'forest_regions_server';
    const cached = this.getCachedData(cacheKey, CACHE_DURATIONS.FOREST_DATA);
    if (cached) {
      console.log('📦 Using cached forest regions data');
      return cached;
    }

    try {
      console.log('🌍 Fetching forest regions via Worker...');
      
      // Add timeout for Edge Function calls
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      const requestPromise = fetch(`${this.baseUrl}/forest-regions${apiConfigManager.isNoMockEnabled() ? '?no_mock=1' : ''}`).then(r => r.json());
      const response: ServerApiResponse = await Promise.race([requestPromise, timeoutPromise]) as any;
      
      if (!response.success) {
        throw new Error(response.error || 'Server API error');
      }

      console.log(`✅ Loaded ${response.data.length} forest regions from ${response.source}`);
      this.setCachedData(cacheKey, response.data, CACHE_DURATIONS.FOREST_DATA);
      return response.data;
      
    } catch (err) {
      if (apiConfigManager.isNoMockEnabled()) {
        throw err;
      }
      console.log('ℹ️ Forest regions endpoint failed, using mock data:', (err as any)?.message);
      return this.getMockForestRegions();
    }
  }

  // Get forest alerts with server-side processing
  public async getForestAlerts(): Promise<ForestAlert[]> {
    const cacheKey = 'forest_alerts_server';
    const cached = this.getCachedData(cacheKey, CACHE_DURATIONS.FIRE_DATA);
    if (cached) {
      console.log('📦 Using cached forest alerts data');
      return cached;
    }

    try {
      console.log('🔥 Fetching forest alerts via Worker...');
      
      // Add timeout for Edge Function calls
      const createTimeoutPromise = (ms: number) => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), ms);
      });

      // Fetch fire alerts with timeout
      const firePromise = Promise.race([
        fetch(`${this.baseUrl}/fire-alerts?region=world&days=1${apiConfigManager.isNoMockEnabled() ? '&no_mock=1' : ''}`).then(r => r.json()),
        createTimeoutPromise(8000)
      ]);

      // Fetch deforestation alerts with timeout
      const deforestationPromise = Promise.race([
        fetch(`${this.baseUrl}/deforestation-alerts?region=BRA${apiConfigManager.isNoMockEnabled() ? '&no_mock=1' : ''}`).then(r => r.json()),
        createTimeoutPromise(8000)
      ]);

      const [fireResult, deforestationResult] = await Promise.allSettled([
        firePromise,
        deforestationPromise
      ]);

      const alerts: ForestAlert[] = [];

      // Process fire alerts
      if (fireResult.status === 'fulfilled' && !fireResult.value.error) {
        const fireResponse: ServerApiResponse = fireResult.value;
        if (fireResponse && fireResponse.success && fireResponse.data) {
          alerts.push(...fireResponse.data);
          console.log(`🔥 Loaded ${fireResponse.data.length} fire alerts from ${fireResponse.source}`);
        }
      } else {
        const msg = fireResult.status === 'rejected' ? (fireResult.reason?.message || 'request failed') : fireResult.value?.error || 'unknown error';
        console.log('ℹ️ Fire alerts endpoint failed, using mock data:', msg);
      }

      // Process deforestation alerts
      if (deforestationResult.status === 'fulfilled' && !deforestationResult.value.error) {
        const deforestationResponse: ServerApiResponse = deforestationResult.value;
        if (deforestationResponse && deforestationResponse.success && deforestationResponse.data) {
          alerts.push(...deforestationResponse.data);
          console.log(`🌳 Loaded ${deforestationResponse.data.length} deforestation alerts from ${deforestationResponse.source}`);
        }
      } else {
        const msg = deforestationResult.status === 'rejected' ? (deforestationResult.reason?.message || 'request failed') : deforestationResult.value?.error || 'unknown error';
        console.log('ℹ️ Deforestation alerts endpoint failed, using mock data:', msg);
      }

      // If no server data available, use mock data
      if (alerts.length === 0) {
        if (apiConfigManager.isNoMockEnabled()) {
          console.log('ℹ️ No server alerts available (no-mock on). Returning empty list.');
          return [];
        }
        console.log('ℹ️ No server alerts available, using comprehensive mock data');
        return this.getMockForestAlerts();
      }

      // Add mock biodiversity alerts for demonstration
      if (!apiConfigManager.isNoMockEnabled()) {
        const biodiversityAlerts = this.getMockBiodiversityAlerts();
        alerts.push(...biodiversityAlerts);
      }

      // Sort by timestamp and limit results
      const sortedAlerts = alerts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 25);

      console.log(`✅ Total forest alerts loaded: ${sortedAlerts.length}`);
      this.setCachedData(cacheKey, sortedAlerts, CACHE_DURATIONS.FIRE_DATA);
      return sortedAlerts;
      
    } catch (err) {
      if (apiConfigManager.isNoMockEnabled()) {
        throw err;
      }
      console.log('ℹ️ Alerts workflow failed, using mock data:', (err as any)?.message);
      // Return mock data as fallback
      return this.getMockForestAlerts();
    }
  }

  // Get deforestation alerts only (via Worker)
  public async getDeforestationAlerts(region: string = 'BRA', days: number = 90, limit: number = 50): Promise<ForestAlert[]> {
    const cacheKey = `deforestation_server_${region}_${days}_${limit}`;
    const cached = this.getCachedData(cacheKey, CACHE_DURATIONS.FIRE_DATA);
    if (cached) {
      console.log('📦 Using cached deforestation alerts data');
      return cached;
    }

    try {
      console.log(`🌳 Fetching deforestation alerts via Worker for region ${region} (last ${days} days, limit ${limit})...`);

      const r = await fetch(`${this.baseUrl}/deforestation-alerts?region=${encodeURIComponent(region)}&days=${days}&limit=${limit}${apiConfigManager.isNoMockEnabled() ? '&no_mock=1' : ''}`);
      const data = await r.json();

      const response: ServerApiResponse = data;

      if (!response.success) {
        throw new Error(response.error || 'Server API error');
      }

      console.log(`🌳 Loaded ${response.data.length} deforestation alerts from ${response.source}`);
      this.setCachedData(cacheKey, response.data, CACHE_DURATIONS.FIRE_DATA);
      return response.data;
    } catch (err) {
      if (apiConfigManager.isNoMockEnabled()) {
        throw err;
      }
      console.log('ℹ️ Deforestation alerts endpoint failed, using mock data:', (err as any)?.message);
      return this.getMockDeforestationAlerts();
    }
  }

  // Get biodiversity data from server
  public async getBiodiversityData(): Promise<BiodiversityData[]> {
    const cacheKey = 'biodiversity_server';
    const cached = this.getCachedData(cacheKey, CACHE_DURATIONS.SPECIES_DATA);
    if (cached) {
      console.log('📦 Using cached biodiversity data');
      return cached;
    }

    try {
      console.log('🦎 Fetching biodiversity data from server-side API...');
      
      const r = await fetch(`${this.baseUrl}/biodiversity?region=global&limit=20${apiConfigManager.isNoMockEnabled() ? '&no_mock=1' : ''}`);
      const data = await r.json();

      const response: ServerApiResponse = data;
      
      if (!response.success) {
        throw new Error(response.error || 'Server API error');
      }

      console.log(`✅ Loaded ${response.data.length} species from ${response.source}`);
      this.setCachedData(cacheKey, response.data, CACHE_DURATIONS.SPECIES_DATA);
      return response.data;
      
    } catch (err) {
      console.error('❌ Error fetching biodiversity data from server:', err);
      if (apiConfigManager.isNoMockEnabled()) {
        throw err;
      }
      return this.getMockBiodiversityData();
    }
  }

  // Get weather data for specific coordinates
  public async getWeatherData(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `weather_server_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const cached = this.getCachedData(cacheKey, CACHE_DURATIONS.WEATHER_DATA);
    if (cached) {
      console.log(`📦 Using cached weather data for ${lat}, ${lng}`);
      return cached;
    }

    try {
      console.log(`🌤️ Fetching weather data for ${lat}, ${lng} from server-side API...`);
      
      const r = await fetch(`${this.baseUrl}/weather?lat=${lat}&lng=${lng}${apiConfigManager.isNoMockEnabled() ? '&no_mock=1' : ''}`);
      const data = await r.json();

      const response: ServerApiResponse = data;
      
      if (!response.success) {
        throw new Error(response.error || 'Server API error');
      }

      console.log(`✅ Weather data loaded from ${response.source}`);
      this.setCachedData(cacheKey, response.data, CACHE_DURATIONS.WEATHER_DATA);
      return response.data;
      
    } catch (err) {
      console.error(`❌ Error fetching weather data for ${lat}, ${lng}:`, err);
      if (apiConfigManager.isNoMockEnabled()) {
        throw err;
      }
      return this.generateMockWeatherData(lat, lng);
    }
  }

  // Get satellite data and tile URLs
  public async getSatelliteData(lat: number, lng: number, layer?: string): Promise<any> {
    try {
      console.log(`🛰️ Fetching satellite data for ${lat}, ${lng}...`);
      
      const r = await fetch(`${this.baseUrl}/satellite-data?lat=${lat}&lng=${lng}&layer=${encodeURIComponent(layer || 'MODIS_Terra_CorrectedReflectance_TrueColor')}${apiConfigManager.isNoMockEnabled() ? '&no_mock=1' : ''}`);
      const data = await r.json();

      const response: ServerApiResponse = data;
      
      if (!response.success) {
        throw new Error(response.error || 'Server API error');
      }

      console.log(`✅ Satellite data loaded from ${response.source}`);
      return response.data;
      
    } catch (err) {
      console.error(`❌ Error fetching satellite data for ${lat}, ${lng}:`, err);
      throw err;
    }
  }

  // Get historical forest data
  public async getHistoricalData(region: string, startYear: number, endYear: number): Promise<any[]> {
    const cacheKey = `historical_server_${region}_${startYear}_${endYear}`;
    const cached = this.getCachedData(cacheKey, CACHE_DURATIONS.FOREST_DATA);
    if (cached) {
      console.log(`📦 Using cached historical data for ${region}`);
      return cached;
    }

    try {
      console.log(`📈 Generating historical data for ${region} (${startYear}-${endYear})...`);
      
      // Generate comprehensive historical data
      const data: any[] = []
      
      for (let year = startYear; year <= endYear; year++) {
        const yearData = {
          year,
          region,
          forestCoverage: Math.max(50, 92 - (2024 - year) * 1.0 + (Math.random() - 0.5) * 3),
          deforestationRate: 0.8 + (2024 - year) * 0.03 + Math.random() * 0.3,
          temperature: 13.2 + (2024 - year) * 0.15 + Math.random() * 0.2,
          precipitation: 1200 - (2024 - year) * 20 + Math.random() * 40,
          carbonSequestration: Math.max(0.1, 2.8 - (2024 - year) * 0.1),
          biodiversityIndex: Math.max(60, 95 - (2024 - year) * 1.0),
          fireIncidents: Math.floor(Math.random() * 100) + 10,
          protectedArea: Math.min(100, 60 + (year - 2000) * 0.5),
          source: 'server-generated'
        }
        data.push(yearData)
      }
      
      console.log(`✅ Generated ${data.length} years of historical data for ${region}`);
      this.setCachedData(cacheKey, data, CACHE_DURATIONS.FOREST_DATA);
      return data;
      
    } catch (err) {
      console.error(`❌ Error generating historical data for ${region}:`, err);
      throw err;
    }
  }

  // Webhook trigger for manual data refresh
  public async triggerDataRefresh(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Triggering server-side data refresh...');
      
      const { data, error } = await supabase.functions.invoke('forest-data-webhook/full-sync');
      
      if (error) {
        throw new Error(error.message);
      }

      const response: ServerApiResponse = data;
      
      if (!response.success) {
        throw new Error(response.error || 'Webhook trigger failed');
      }

      console.log('✅ Data refresh triggered successfully:', response);
      
      // Clear local cache to force fresh data
      this.cache.clear();
      
      return { success: true, message: 'Data refresh completed successfully' };
      
    } catch (error) {
      console.error('❌ Error triggering data refresh:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get server API status
  public async getServerStatus(): Promise<any> {
    try {
      const health = await this.checkServerHealth();
      
      return {
        serverSide: health.success,
        apis: health.details?.apis || {},
        capabilities: health.details?.capabilities || [],
        timestamp: health.details?.timestamp || new Date().toISOString()
      };
      
    } catch (error) {
      return {
        serverSide: false,
        apis: {},
        capabilities: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Cache management
  private getCachedData(key: string, duration: number): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < duration) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any, duration: number = CACHE_DURATIONS.FOREST_DATA): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Mock data generators for fallback
  private getMockForestRegions(): ForestRegion[] {
    return [
      {
        id: 'amazon',
        name: 'Amazon Basin',
        lat: -3.4653,
        lng: -62.2159,
        healthScore: 75.2,
        deforestationRate: 2.3,
        biodiversityIndex: 94.1,
        alertLevel: 'high',
        lastUpdate: new Date().toISOString(),
        area: 6700000,
        forestCover: 83.5,
        fireRisk: 65.2,
        temperature: 26.5,
        precipitation: 2300
      },
      {
        id: 'congo',
        name: 'Congo Basin',
        lat: -0.228,
        lng: 15.8277,
        healthScore: 82.1,
        deforestationRate: 1.8,
        biodiversityIndex: 87.3,
        alertLevel: 'medium',
        lastUpdate: new Date().toISOString(),
        area: 3700000,
        forestCover: 89.2,
        fireRisk: 45.1,
        temperature: 25.2,
        precipitation: 1800
      },
      {
        id: 'boreal',
        name: 'Boreal Forest',
        lat: 64.2008,
        lng: -153.4937,
        healthScore: 88.5,
        deforestationRate: 0.8,
        biodiversityIndex: 76.4,
        alertLevel: 'low',
        lastUpdate: new Date().toISOString(),
        area: 17000000,
        forestCover: 94.1,
        fireRisk: 35.8,
        temperature: 2.1,
        precipitation: 450
      }
    ];
  }

  private getMockForestAlerts(): ForestAlert[] {
    return [
      {
        id: 'fire_server_mock_1',
        timestamp: new Date().toISOString(),
        location: 'Amazon Basin, Brazil',
        type: 'fire',
        severity: 'high',
        confidence: 85,
        description: 'Fire detected with 25.3 MW radiative power',
        coordinates: { lat: -3.2, lng: -61.8 },
        metadata: { brightness: 320.5, frp: 25.3 }
      },
      {
        id: 'deforest_server_mock_1',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        location: 'Congo Basin, DRC',
        type: 'deforestation',
        severity: 'high',
        confidence: 78,
        description: 'Deforestation alert detected by GLAD system',
        coordinates: { lat: -0.3, lng: 15.9 }
      }
    ];
  }

  private getMockBiodiversityAlerts(): ForestAlert[] {
    return [
      {
        id: 'biodiversity_server_mock_1',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        location: 'Sumatran Forest, Indonesia',
        type: 'biodiversity',
        severity: 'high',
        confidence: 85,
        description: 'Endangered species habitat disruption detected',
        coordinates: { lat: 0.5, lng: 101.5 }
      }
    ];
  }

  private getMockDeforestationAlerts(): ForestAlert[] {
    return [
      {
        id: 'deforest_server_mock_1',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        location: 'Congo Basin, DRC',
        type: 'deforestation',
        severity: 'high',
        confidence: 78,
        description: 'Deforestation alert detected by GLAD system',
        coordinates: { lat: -0.3, lng: 15.9 }
      },
      {
        id: 'deforest_server_mock_2',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        location: 'Brazilian Amazon',
        type: 'deforestation',
        severity: 'critical',
        confidence: 89,
        description: 'Large-scale clearing detected via satellite imagery',
        coordinates: { lat: -4.1, lng: -63.2 }
      }
    ];
  }

  private getMockBiodiversityData(): BiodiversityData[] {
    return [
      {
        id: 'orangutan_server_mock',
        name: 'Sumatran Orangutan',
        scientificName: 'Pongo abelii',
        status: 'critically_endangered',
        population: 14000,
        trend: -2.3,
        habitat: 'Tropical Rainforest',
        lastSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 92,
        threatLevel: 85,
        conservationStatus: 'Critically Endangered'
      },
      {
        id: 'jaguar_server_mock',
        name: 'Jaguar',
        scientificName: 'Panthera onca',
        status: 'declining',
        population: 64000,
        trend: -1.8,
        habitat: 'Amazon Rainforest',
        lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 88,
        threatLevel: 72,
        conservationStatus: 'Near Threatened'
      }
    ];
  }

  private generateMockWeatherData(lat: number, lng: number): WeatherData {
    const temp = this.getRegionalTemperature(lat, lng);
    const humidity = 60 + Math.random() * 30;
    const precipitation = this.getRegionalPrecipitation(lat, lng);
    
    return {
      temperature: temp,
      humidity,
      precipitation,
      windSpeed: 5 + Math.random() * 15,
      pressure: 1013 + (Math.random() - 0.5) * 20,
      cloudCover: Math.random() * 100,
      uvIndex: Math.max(0, 11 - Math.abs(lat) / 10),
      fireWeatherIndex: this.calculateFireWeatherIndex(temp, humidity, precipitation),
      location: this.getLocationName(lat, lng),
      country: 'Unknown',
      description: 'Clear sky'
    };
  }

  private getRegionalTemperature(lat: number, lng: number): number {
    const baseTemp = 30 - Math.abs(lat) * 0.6;
    return baseTemp + (Math.random() - 0.5) * 10;
  }

  private getRegionalPrecipitation(lat: number, lng: number): number {
    if (Math.abs(lat) < 10) return 2000 + Math.random() * 1000;
    if (Math.abs(lat) < 30) return 1000 + Math.random() * 500;
    return 500 + Math.random() * 300;
  }

  private calculateFireWeatherIndex(temp: number, humidity: number, precipitation: number): number {
    const dryness = Math.max(0, 100 - humidity);
    const heat = Math.max(0, temp - 20);
    const dryPeriod = Math.max(0, 30 - precipitation);
    
    return Math.min(100, (dryness + heat + dryPeriod) / 3);
  }

  private getLocationName(lat: number, lng: number): string {
    if (lat < -3 && lat > -5 && lng < -60 && lng > -65) return 'Amazon Basin, Brazil';
    if (lat < 2 && lat > -2 && lng > 14 && lng < 17) return 'Congo Basin, DRC';
    if (lat > 60 && lng < -150) return 'Boreal Forest, Canada';
    if (lat > 0 && lat < 5 && lng > 100 && lng < 110) return 'Southeast Asian Rainforest';
    return `Forest Region (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
  }
}

export const serverSideDataService = new ServerSideDataService();