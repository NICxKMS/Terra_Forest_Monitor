// Enhanced Forest Data Service - switches between mock and live data based on API configuration
import { apiConfigManager } from './apiConfigManager';
import { mockDataService } from './mockDataService';
import { nasaGibsService } from './nasaGibsService';
import { serverSideDataService } from './serverSideDataService';
import { API_CONFIG, CACHE_DURATIONS } from './apiConfig';

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
}

export class EnhancedForestDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  public clearCache(): void {
    this.cache.clear();
  }
  constructor() {
    // Refresh API configuration when service is created
    apiConfigManager.refreshApiKeys();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Check if server-side API is available with short timeout
      const healthPromise = serverSideDataService.checkServerHealth();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), 2000);
      });

      const serverHealth = await Promise.race([healthPromise, timeoutPromise]) as any;
      
      if (serverHealth.success) {
        console.log('🚀 Server-side API available - using serverless functions for API calls');
        console.log('📋 Server capabilities:', serverHealth.details?.capabilities);
      } else {
        console.log('ℹ️ Server-side API not available - using enhanced browser service');
        console.log('💡 Deploy Edge Functions to enable server-side API proxy');
      }
    } catch (error) {
      console.log('ℹ️ Server-side API check skipped - initializing in browser mode');
    }
  }

  // Determine if we should use live data
  private shouldUseLiveData(): boolean {
    return apiConfigManager.shouldUseLiveData();
  }

  // Helper method to detect CORS errors and provide informative messages
  private isCorsError(error: any): boolean {
    return error.message.includes('CORS') || 
           error.message.includes('Failed to fetch') ||
           error.name === 'TypeError' && error.message.includes('fetch');
  }

  // Enhanced fetch with better error handling
  private async fetchWithFallback(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors'
      });
      return response;
    } catch (error) {
      if (this.isCorsError(error)) {
        console.log('CORS error detected - this is expected for many APIs in browser environments');
        console.log('In production, these APIs would be accessed via server-side proxy');
        throw new Error('CORS policy restriction (browser limitation)');
      }
      throw error;
    }
  }

  // Get comprehensive forest region data
  public async getForestRegions(): Promise<ForestRegion[]> {
    // Try server-side API first with quick timeout
    try {
      const healthPromise = serverSideDataService.checkServerHealth();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Quick health check timeout')), 1000);
      });

      const serverHealth = await Promise.race([healthPromise, timeoutPromise]) as any;
      
      if (serverHealth.success) {
        console.log('🌍 Using server-side API for forest regions');
        return await serverSideDataService.getForestRegions();
      }
    } catch (error) {
      console.log('ℹ️ Server-side API not available, using enhanced browser service');
    }

    const cacheKey = 'forest_regions_live';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      console.log('Fetching live forest region data...');
      const regions = await Promise.all([
        this.getLiveRegionData('amazon', -3.4653, -62.2159),
        this.getLiveRegionData('congo', -0.228, 15.8277),
        this.getLiveRegionData('boreal', 64.2008, -153.4937),
        this.getLiveRegionData('southeast_asia', 1.3521, 103.8198),
        this.getLiveRegionData('temperate', 45.0, -85.0),
        this.getLiveRegionData('tropical_africa', 5.0, 20.0)
      ]);

      this.setCachedData(cacheKey, regions);
      return regions;
    } catch (error) {
      console.error('Error fetching live forest regions, falling back to mock data:', error);
      return mockDataService.getForestRegions();
    }
  }

  // Get forest alerts with live data integration
  public async getForestAlerts(): Promise<ForestAlert[]> {
    // Prefer direct browser NASA FIRMS if a user key exists
    const hasNasaKeyDirect = apiConfigManager.hasApiKey('nasa_firms');
    if (!hasNasaKeyDirect) {
      // No user NASA key: try server first (it proxies FIRMS + GFW)
      try {
        const healthPromise = serverSideDataService.checkServerHealth();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Quick health check timeout')), 1000);
        });

        const serverHealth = await Promise.race([healthPromise, timeoutPromise]) as any;
        
        if (serverHealth.success) {
          console.log('🔥 Using server-side API for forest alerts');
          return await serverSideDataService.getForestAlerts();
        }
      } catch (error) {
        console.log('ℹ️ Server-side API not available, using enhanced browser service');
      }
    } else {
      console.log('🔥 NASA FIRMS key detected – using direct browser calls for fire alerts');
    }

    // Fallback to browser-based service
    const cacheKey = 'forest_alerts_combined';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    console.log('Loading forest alerts from browser service...');
    
    // Check if we're in a browser environment with CORS limitations
    const isBrowser = typeof window !== 'undefined';
    
    // Strategy: Browser → use Worker for GFW; Server → direct GFW
    const shouldAttemptNasaFirms = hasNasaKeyDirect;
    console.log(`Environment: ${isBrowser ? 'Browser' : 'Server'}`);
    console.log(`NASA FIRMS: ${shouldAttemptNasaFirms ? 'Will attempt' : 'No key, using mock'}`);
    console.log(`Global Forest Watch: ${isBrowser ? 'Using Worker' : 'Direct server call'}`);

    try {
      const alerts: ForestAlert[] = [];

      // Fire alerts - use live data only if not in browser and has API key
      if (shouldAttemptNasaFirms) {
        try {
          const fireAlerts = await this.getLiveFireAlerts();
          alerts.push(...fireAlerts);
          console.log(`✓ Loaded ${fireAlerts.length} live fire alerts from NASA FIRMS`);
        } catch (error) {
          if (apiConfigManager.isNoMockEnabled()) throw error;
          console.log('NASA FIRMS failed, using mock fire alerts:', (error as any)?.message || error);
          alerts.push(...this.getMockFireAlerts());
        }
      } else {
        if (apiConfigManager.isNoMockEnabled()) {
          console.log('→ Skipping fire alerts (no API key, no-mock enabled)');
        } else {
          console.log('→ Using mock fire alerts (no API key)');
          alerts.push(...this.getMockFireAlerts());
        }
      }

      // Deforestation alerts
      try {
        if (isBrowser) {
          // Browser calls Worker to bypass CORS; use rolling 90-day window
          const deforestationAlerts = await serverSideDataService.getDeforestationAlerts('BRA', 90, 50);
          alerts.push(...deforestationAlerts);
          console.log(`✓ Loaded ${deforestationAlerts.length} deforestation alerts via Worker (GFW)`);
        } else {
          // Server-side can call GFW directly
          const deforestationAlerts = await this.getLiveDeforestationAlerts();
          alerts.push(...deforestationAlerts);
          console.log(`✓ Loaded ${deforestationAlerts.length} live deforestation alerts from Global Forest Watch`);
        }
      } catch (error) {
        if (apiConfigManager.isNoMockEnabled()) throw error;
        console.log('Global Forest Watch failed, using mock deforestation alerts:', (error as any)?.message || error);
        alerts.push(...this.getMockDeforestationAlerts());
      }

      // Always add some biodiversity alerts from mock data for demonstration
      if (!apiConfigManager.isNoMockEnabled() && alerts.length === 0) {
        const biodiversityAlerts = this.getMockBiodiversityAlerts();
        alerts.push(...biodiversityAlerts);
      }

      // Sort by timestamp and limit results
      const sortedAlerts = alerts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 25);

      console.log(`✓ Successfully loaded ${sortedAlerts.length} total forest alerts`);
      this.setCachedData(cacheKey, sortedAlerts);
      return sortedAlerts;
    } catch (error) {
      if (apiConfigManager.isNoMockEnabled()) {
        console.error('Critical error loading forest alerts with no-mock enabled:', error);
        return [];
      }
      console.error('Critical error loading forest alerts, using fallback mock data:', error);
      return mockDataService.getForestAlerts();
    }
  }

  // Get biodiversity data from GBIF
  public async getBiodiversityData(): Promise<BiodiversityData[]> {
    const cacheKey = 'biodiversity_live';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      console.log('Fetching live biodiversity data from GBIF...');
      const species = await this.getLiveBiodiversityData();

      if (species.length === 0) {
        if (apiConfigManager.isNoMockEnabled()) {
          console.log('No live biodiversity data, no-mock enabled – returning empty');
          return [];
        }
        console.log('No live biodiversity data available, using mock data');
        return mockDataService.getBiodiversityData();
      }

      this.setCachedData(cacheKey, species);
      return species;
    } catch (error) {
      if (apiConfigManager.isNoMockEnabled()) {
        console.error('Error fetching live biodiversity data (no-mock) – returning empty:', error);
        return [];
      }
      console.error('Error fetching live biodiversity data, falling back to mock data:', error);
      return mockDataService.getBiodiversityData();
    }
  }

  // Get weather data for forest regions
  public async getWeatherData(lat: number, lng: number): Promise<WeatherData> {
    const apiKey = apiConfigManager.getApiKey('openweather');
    if (!apiKey || apiKey === 'YOUR_OPENWEATHER_API_KEY_HERE') {
      if (apiConfigManager.isNoMockEnabled()) {
        throw new Error('OpenWeather API key not configured (no-mock enabled)');
      }
      console.log('Using mock weather data (OpenWeather API key not configured)');
      return this.generateMockWeatherData(lat, lng);
    }

    const cacheKey = `weather_live_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      console.log(`Fetching live weather data for ${lat}, ${lng}...`);
      const url = `${API_CONFIG.OPENWEATHER.BASE_URL}${API_CONFIG.OPENWEATHER.ENDPOINTS.CURRENT}?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('OpenWeather API key invalid (401 Unauthorized)');
        } else if (response.status === 429) {
          console.error('OpenWeather API rate limit exceeded');
        }
        throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const weatherData = this.parseOpenWeatherData(data);
      
      this.setCachedData(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      console.error('Error fetching live weather data:', error);
      if (apiConfigManager.isNoMockEnabled()) {
        throw error;
      }
      console.log('Falling back to mock weather data');
      return this.generateMockWeatherData(lat, lng);
    }
  }

  // Get historical forest data
  public async getHistoricalData(region: string, startYear: number, endYear: number): Promise<any[]> {
    const cacheKey = `historical_live_${region}_${startYear}_${endYear}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      console.log(`Fetching live historical data for ${region} (${startYear}-${endYear})...`);
      // This would integrate with Global Forest Watch historical data
      const data = await this.getLiveHistoricalData(region, startYear, endYear);
      
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching live historical data, falling back to mock data:', error);
      const years = Math.max(0, endYear - startYear);
      return mockDataService.getHistoricalData(region, years);
    }
  }

  // Private methods for live data fetching
  private async getLiveRegionData(id: string, lat: number, lng: number): Promise<ForestRegion> {
    const weather = await this.getWeatherData(lat, lng);
    
    // Get satellite data (NASA GIBS doesn't require API key)
    let satelliteData;
    try {
      satelliteData = await nasaGibsService.getCurrentSatelliteData({ lat, lng });
    } catch (error) {
      console.log('Error fetching satellite data:', error);
      satelliteData = [];
    }

    // Get forest change data from Global Forest Watch
    let forestChange;
    try {
      forestChange = await this.getLiveForestChangeData(lat, lng);
    } catch (error) {
      console.log('Error fetching forest change data:', error);
      forestChange = { forestLoss: { '2023': 2.0 } };
    }

    return {
      id,
      name: this.getRegionName(id),
      lat,
      lng,
      healthScore: this.calculateHealthScore(weather, satelliteData),
      deforestationRate: forestChange.forestLoss['2023'] || 2.0,
      biodiversityIndex: this.calculateBiodiversityIndex(id),
      alertLevel: this.calculateAlertLevel(weather, forestChange),
      lastUpdate: new Date().toISOString(),
      area: this.getRegionArea(id),
      forestCover: this.calculateForestCover(id, forestChange),
      fireRisk: weather.fireWeatherIndex,
      temperature: weather.temperature,
      precipitation: weather.precipitation
    };
  }

  private async getLiveFireAlerts(): Promise<ForestAlert[]> {
    const apiKey = apiConfigManager.getApiKey('nasa_firms');
    if (!apiKey || apiKey === 'YOUR_NASA_FIRMS_API_KEY_HERE') {
      throw new Error('NASA FIRMS API key not configured');
    }

    try {
      // Prefer direct browser call using user key
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const datasets = ['MODIS_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT'];
      for (const dataset of datasets) {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${dataset}/world/1/${yesterday}`;
        console.log('→ Fetching live fire data from NASA FIRMS:', url);
        const response = await fetch(url, { headers: { 'Accept': 'text/csv' } });
        if (!response.ok) continue;
        const csvData = await response.text();
        const fireAlerts = this.parseFireCsvData(csvData);
        return fireAlerts;
      }
      throw new Error('All FIRMS datasets returned no data');
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  private async getLiveDeforestationAlerts(): Promise<ForestAlert[]> {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      throw new Error('Global Forest Watch API requires server-side access (CORS limitation)');
    }

    try {
      // Global Forest Watch API - use a working endpoint with proper parameters
      const currentYear = new Date().getFullYear();
      const url = `https://production-api.globalforestwatch.org/v1/glad-alerts/admin/BRA?period=${currentYear}-01-01,${currentYear}-12-31&gladConfirmOnly=false&limit=10`;
      
      console.log('→ Fetching live deforestation alerts from Global Forest Watch...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Global-Forest-Explorer/1.0'
        }
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          // Try simpler forest loss endpoint as fallback
          const alternativeUrl = `https://production-api.globalforestwatch.org/v1/forest-change/umd-loss-gain?lat=-3&lon=-60`;
          const altResponse = await fetch(alternativeUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (altResponse.ok) {
            const altData = await altResponse.json();
            return this.parseForestLossData(altData);
          }
          throw new Error('Global Forest Watch API bad request - invalid parameters');
        } else if (response.status === 404) {
          throw new Error('Global Forest Watch API endpoint not found');
        } else if (response.status === 403) {
          throw new Error('Global Forest Watch API access forbidden');
        }
        throw new Error(`Global Forest Watch API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || !data.data) {
        return [];
      }
      
      const deforestationAlerts = this.parseGladAlertsData(data);
      return deforestationAlerts;
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  private async getLiveBiodiversityData(): Promise<BiodiversityData[]> {
    try {
      const species: BiodiversityData[] = [];
      const forestSpecies = [
        'Pongo abelii',
        'Panthera onca', 
        'Gorilla beringei',
        'Dendrobates tinctorius',
        'Harpia harpyja'
      ];

      for (const scientificName of forestSpecies) {
        try {
          const gbifData = await this.fetchGBIFSpeciesData(scientificName);
          if (gbifData) {
            species.push(gbifData);
          }
        } catch (error) {
          console.log(`Error fetching GBIF data for ${scientificName}:`, error);
        }
      }

      return species;
    } catch (error) {
      console.error('Error fetching live biodiversity data:', error);
      return [];
    }
  }

  private async fetchGBIFSpeciesData(scientificName: string): Promise<BiodiversityData | null> {
    try {
      const searchUrl = `${API_CONFIG.GBIF.BASE_URL}${API_CONFIG.GBIF.ENDPOINTS.SPECIES}?q=${encodeURIComponent(scientificName)}&limit=1`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return this.parseGBIFSpeciesData(data.results[0]);
      }

      return null;
    } catch (error) {
      console.error(`Error fetching GBIF data for ${scientificName}:`, error);
      return null;
    }
  }

  private async getLiveForestChangeData(lat: number, lng: number): Promise<any> {
    try {
      const url = `${API_CONFIG.GLOBAL_FOREST_WATCH.BASE_URL}${API_CONFIG.GLOBAL_FOREST_WATCH.ENDPOINTS.FOREST_LOSS}?lat=${lat}&lng=${lng}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Global Forest Watch API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching live forest change data:', error);
      return { forestLoss: { '2023': 2.0 } }; // Fallback data
    }
  }

  private async getLiveHistoricalData(region: string, startYear: number, endYear: number): Promise<any[]> {
    try {
      // This would integrate with multiple historical data sources
      const data: any[] = [];
      
      for (let year = startYear; year <= endYear; year++) {
        // In a real implementation, this would fetch from Global Forest Watch historical API
        const yearData = {
          year,
          region,
          forestCoverage: Math.max(50, 92 - (2024 - year) * 1.0 + (Math.random() - 0.5) * 3),
          deforestationRate: 0.8 + (2024 - year) * 0.03 + Math.random() * 0.3,
          temperature: 13.2 + (2024 - year) * 0.15 + Math.random() * 0.2,
          precipitation: 1200 - (2024 - year) * 20 + Math.random() * 40,
          carbonSequestration: Math.max(0.1, 2.8 - (2024 - year) * 0.1),
          biodiversityIndex: Math.max(60, 95 - (2024 - year) * 1.0)
        };
        data.push(yearData);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching live historical data:', error);
      throw error;
    }
  }

  // Data parsing methods
  private parseOpenWeatherData(data: any): WeatherData {
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      windSpeed: data.wind.speed,
      pressure: data.main.pressure,
      cloudCover: data.clouds.all,
      uvIndex: 0, // Would need UV Index API call
      fireWeatherIndex: this.calculateFireWeatherIndex(
        data.main.temp,
        data.main.humidity,
        data.rain?.['1h'] || 0
      )
    };
  }

  private parseFireCsvData(csvData: string): ForestAlert[] {
    const alerts: ForestAlert[] = [];
    const lines = csvData.split('\n');
    
    // Skip header
    for (let i = 1; i < Math.min(lines.length, 21); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const fields = line.split(',');
      if (fields.length >= 13) {
        const lat = parseFloat(fields[0]);
        const lng = parseFloat(fields[1]);
        const brightness = parseFloat(fields[2]);
        const confidence = parseFloat(fields[8]);
        const frp = parseFloat(fields[11]);
        
        alerts.push({
          id: `fire_${lat}_${lng}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          location: this.getLocationName(lat, lng),
          type: 'fire',
          severity: this.calculateFireSeverity(frp, confidence),
          confidence,
          description: `Fire detected with ${frp.toFixed(1)} MW radiative power`,
          coordinates: { lat, lng },
          metadata: { brightness, frp }
        });
      }
    }
    
    return alerts;
  }

  private parseGladAlertsData(data: any): ForestAlert[] {
    const alerts: ForestAlert[] = [];
    
    if (data.data && Array.isArray(data.data)) {
      data.data.slice(0, 10).forEach((alert: any, index: number) => {
        alerts.push({
          id: `deforest_${index}_${Date.now()}`,
          timestamp: alert.date || new Date().toISOString(),
          location: alert.iso || alert.admin || 'Forest Region',
          type: 'deforestation',
          severity: this.getDeforestationSeverity(alert.alerts || alert.area || 1),
          confidence: alert.confidence || 85,
          description: `Deforestation detected: ${alert.alerts || alert.area || 'area'} alerts`,
          coordinates: { 
            lat: alert.lat || (Math.random() * 10 - 5), 
            lng: alert.lng || (Math.random() * 20 - 10)
          },
          metadata: alert
        });
      });
    }
    
    return alerts;
  }

  private parseForestLossData(data: any): ForestAlert[] {
    const alerts: ForestAlert[] = [];
    
    // Convert forest loss data to alert format
    if (data.umd_tree_cover_loss || data.data) {
      const lossData = data.umd_tree_cover_loss || data.data;
      Object.entries(lossData).forEach(([year, loss]: [string, any], index) => {
        if (parseInt(year) >= 2020 && loss > 0) {
          alerts.push({
            id: `forest_loss_${year}_${index}`,
            timestamp: new Date(`${year}-06-01`).toISOString(),
            location: `Forest Region (${year})`,
            type: 'deforestation',
            severity: loss > 1000 ? 'critical' : loss > 500 ? 'high' : 'medium',
            confidence: 90,
            description: `Forest loss detected: ${loss} hectares in ${year}`,
            coordinates: {
              lat: -3 + (Math.random() - 0.5) * 2,
              lng: -60 + (Math.random() - 0.5) * 2
            },
            metadata: { year, loss }
          });
        }
      });
    }
    
    return alerts;
  }

  private getDeforestationSeverity(alertCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (alertCount > 100) return 'critical';
    if (alertCount > 50) return 'high';
    if (alertCount > 10) return 'medium';
    return 'low';
  }

  private parseGBIFSpeciesData(gbifResult: any): BiodiversityData {
    return {
      id: gbifResult.key || gbifResult.scientificName?.toLowerCase().replace(' ', '_'),
      name: gbifResult.vernacularName || gbifResult.canonicalName || 'Unknown Species',
      scientificName: gbifResult.scientificName || gbifResult.canonicalName,
      status: this.determineConservationStatus(gbifResult),
      population: Math.floor(Math.random() * 100000) + 1000, // Would need additional API calls
      trend: (Math.random() - 0.5) * 6, // Would need trend data
      habitat: gbifResult.habitat || 'Forest',
      lastSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      confidence: 85 + Math.random() * 10,
      threatLevel: Math.floor(Math.random() * 100),
      conservationStatus: gbifResult.threatStatus || 'Data Deficient'
    };
  }

  // Helper methods
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
      fireWeatherIndex: this.calculateFireWeatherIndex(temp, humidity, precipitation)
    };
  }

  private determineConservationStatus(gbifResult: any): 'stable' | 'declining' | 'critically_endangered' | 'recovering' {
    const status = gbifResult.threatStatus?.toLowerCase() || '';
    
    if (status.includes('critically endangered')) return 'critically_endangered';
    if (status.includes('endangered') || status.includes('vulnerable')) return 'declining';
    if (status.includes('recovering') || status.includes('improving')) return 'recovering';
    return 'stable';
  }

  private calculateFireWeatherIndex(temp: number, humidity: number, precipitation: number): number {
    const dryness = Math.max(0, 100 - humidity);
    const heat = Math.max(0, temp - 20);
    const dryPeriod = Math.max(0, 30 - precipitation);
    
    return Math.min(100, (dryness + heat + dryPeriod) / 3);
  }

  private calculateHealthScore(weather: WeatherData, satelliteData: any[]): number {
    let score = 80;
    
    if (weather.fireWeatherIndex > 70) score -= 15;
    if (weather.precipitation < 500) score -= 10;
    if (weather.temperature > 35) score -= 5;
    
    return Math.max(30, Math.min(100, score + (Math.random() - 0.5) * 10));
  }

  private calculateAlertLevel(weather: WeatherData, forestChange: any): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;
    
    if (weather.fireWeatherIndex > 80) riskScore += 3;
    else if (weather.fireWeatherIndex > 60) riskScore += 2;
    else if (weather.fireWeatherIndex > 40) riskScore += 1;
    
    const currentLoss = forestChange.forestLoss?.['2023'] || 0;
    if (currentLoss > 3) riskScore += 3;
    else if (currentLoss > 2) riskScore += 2;
    else if (currentLoss > 1) riskScore += 1;
    
    if (riskScore >= 5) return 'critical';
    if (riskScore >= 3) return 'high';
    if (riskScore >= 1) return 'medium';
    return 'low';
  }

  private calculateFireSeverity(frp: number, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (frp > 50 && confidence > 80) return 'critical';
    if (frp > 25 && confidence > 70) return 'high';
    if (frp > 10 && confidence > 60) return 'medium';
    return 'low';
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

  private getLocationName(lat: number, lng: number): string {
    if (lat < -3 && lat > -5 && lng < -60 && lng > -65) return 'Amazon Basin, Brazil';
    if (lat < 2 && lat > -2 && lng > 14 && lng < 17) return 'Congo Basin, DRC';
    if (lat > 60 && lng < -150) return 'Boreal Forest, Canada';
    return `Forest Region (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
  }

  private getRegionName(id: string): string {
    const names: { [key: string]: string } = {
      amazon: 'Amazon Basin',
      congo: 'Congo Basin',
      boreal: 'Boreal Forest',
      southeast_asia: 'Southeast Asian Rainforest',
      temperate: 'Temperate Forests',
      tropical_africa: 'Tropical African Forests'
    };
    return names[id] || id;
  }

  private getRegionArea(id: string): number {
    const areas: { [key: string]: number } = {
      amazon: 6700000,
      congo: 3700000,
      boreal: 17000000,
      southeast_asia: 2500000,
      temperate: 10000000,
      tropical_africa: 4000000
    };
    return areas[id] || 1000000;
  }

  private calculateBiodiversityIndex(id: string): number {
    const indices: { [key: string]: number } = {
      amazon: 94,
      congo: 87,
      boreal: 76,
      southeast_asia: 91,
      temperate: 82,
      tropical_africa: 89
    };
    return indices[id] || 80;
  }

  private calculateForestCover(id: string, forestChange?: any): number {
    const baseCover: { [key: string]: number } = {
      amazon: 85,
      congo: 92,
      boreal: 94,
      southeast_asia: 78,
      temperate: 68,
      tropical_africa: 75
    };
    
    let cover = baseCover[id] || 70;
    
    // Adjust based on recent forest loss if available
    if (forestChange?.forestLoss?.['2023']) {
      cover = Math.max(30, cover - forestChange.forestLoss['2023']);
    }
    
    return cover;
  }

  // Cache methods
  private getCachedData(key: string, duration: number = CACHE_DURATIONS.FOREST_DATA): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < duration) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any, duration: number = CACHE_DURATIONS.FOREST_DATA): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Mock data methods for fallback
  private getMockFireAlerts(): ForestAlert[] {
    return [
      {
        id: 'fire_mock_1',
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
        id: 'fire_mock_2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        location: 'Southeast Asia',
        type: 'fire',
        severity: 'critical',
        confidence: 92,
        description: 'High-intensity fire detected with 47.8 MW radiative power',
        coordinates: { lat: 1.5, lng: 104.2 },
        metadata: { brightness: 340.2, frp: 47.8 }
      }
    ];
  }

  private getMockDeforestationAlerts(): ForestAlert[] {
    return [
      {
        id: 'deforest_mock_1',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        location: 'Congo Basin, DRC',
        type: 'deforestation',
        severity: 'high',
        confidence: 78,
        description: 'Deforestation alert detected by GLAD system',
        coordinates: { lat: -0.3, lng: 15.9 }
      },
      {
        id: 'deforest_mock_2',
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

  private getMockBiodiversityAlerts(): ForestAlert[] {
    return [
      {
        id: 'biodiversity_mock_1',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        location: 'Sumatran Forest, Indonesia',
        type: 'biodiversity',
        severity: 'high',
        confidence: 85,
        description: 'Endangered species habitat disruption detected',
        coordinates: { lat: 0.5, lng: 101.5 }
      },
      {
        id: 'biodiversity_mock_2',
        timestamp: new Date(Date.now() - 18000000).toISOString(),
        location: 'Atlantic Forest, Brazil',
        type: 'biodiversity',
        severity: 'medium',
        confidence: 72,
        description: 'Wildlife migration pattern changes observed',
        coordinates: { lat: -22.9, lng: -43.2 }
      }
    ];
  }
}

export const enhancedForestDataService = new EnhancedForestDataService();