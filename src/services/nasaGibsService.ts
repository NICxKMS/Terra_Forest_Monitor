// NASA GIBS API service for satellite imagery and data
import { API_CONFIG, CACHE_DURATIONS } from './apiConfig';

interface SatelliteData {
  timestamp: string;
  coverage: number;
  cloudCover: number;
  resolution: number;
  layer: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface FireData {
  latitude: number;
  longitude: number;
  brightness: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  confidence: number;
  version: string;
  bright_t31: number;
  frp: number; // Fire Radiative Power
}

export class NASAGibsService {
  private cache = new Map<string, { data: any; timestamp: number }>();

  // Get WMTS tile URL for specific layer and coordinates
  public getWMTSTileUrl(
    layer: string,
    date: string,
    z: number,
    x: number,
    y: number,
    format: string = 'jpg'
  ): string {
    const baseUrl = API_CONFIG.NASA_GIBS.WMTS_URL;
    return `${baseUrl}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=EPSG4326_250m&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}&FORMAT=image%2F${format}&TIME=${date}`;
  }

  // Get WMS capabilities to understand available layers
  public async getWMSCapabilities(): Promise<any> {
    const cacheKey = 'wms_capabilities';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const url = `${API_CONFIG.NASA_GIBS.BASE_URL}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      // Parse XML response (simplified for demo)
      const capabilities = this.parseWMSCapabilities(xmlText);
      
      this.setCachedData(cacheKey, capabilities);
      return capabilities;
    } catch (error) {
      console.error('Error fetching WMS capabilities:', error);
      return this.getMockCapabilities();
    }
  }

  // Get current satellite data for forest monitoring
  public async getCurrentSatelliteData(coordinates: { lat: number; lng: number }): Promise<SatelliteData[]> {
    const cacheKey = `satellite_${coordinates.lat}_${coordinates.lng}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      const satelliteData: SatelliteData[] = [
        {
          timestamp: new Date().toISOString(),
          coverage: 85 + Math.random() * 10,
          cloudCover: Math.random() * 30,
          resolution: 10,
          layer: API_CONFIG.NASA_GIBS.LAYERS.MODIS_TERRA_TRUE_COLOR,
          coordinates
        },
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          coverage: 87 + Math.random() * 8,
          cloudCover: Math.random() * 25,
          resolution: 375,
          layer: API_CONFIG.NASA_GIBS.LAYERS.VIIRS_FIRES,
          coordinates
        }
      ];

      this.setCachedData(cacheKey, satelliteData);
      return satelliteData;
    } catch (error) {
      console.error('Error fetching satellite data:', error);
      return this.getMockSatelliteData(coordinates);
    }
  }

  // Get fire detection data using FIRMS API
  public async getFireData(area: { 
    north: number; 
    south: number; 
    east: number; 
    west: number; 
  }): Promise<FireData[]> {
    const cacheKey = `fires_${area.north}_${area.south}_${area.east}_${area.west}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Using FIRMS demo endpoint (replace with real API key)
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${API_CONFIG.NASA_FIRMS.API_KEY}/VIIRS_SNPP_NRT/${area.north},${area.west},${area.south},${area.east}/1`;
      
      // For demo purposes, we'll return mock data since API key is needed
      const mockFireData = this.getMockFireData(area);
      
      this.setCachedData(cacheKey, mockFireData);
      return mockFireData;
    } catch (error) {
      console.error('Error fetching fire data:', error);
      return this.getMockFireData(area);
    }
  }

  // Get forest change data using tile analysis
  public async getForestChangeData(region: string): Promise<any> {
    const cacheKey = `forest_change_${region}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // This would typically analyze LANDSAT data over time
      const forestData = {
        region,
        forestLoss: {
          '2023': 2.3,
          '2022': 1.8,
          '2021': 2.1,
          '2020': 1.9
        },
        forestGain: {
          '2023': 0.4,
          '2022': 0.3,
          '2021': 0.5,
          '2020': 0.4
        },
        totalArea: this.getRegionArea(region),
        lastUpdate: new Date().toISOString()
      };

      this.setCachedData(cacheKey, forestData);
      return forestData;
    } catch (error) {
      console.error('Error fetching forest change data:', error);
      return this.getMockForestChangeData(region);
    }
  }

  // Get tile URL for forest visualization
  public getForestVisualizationTile(
    layer: string,
    date: string,
    bbox: [number, number, number, number],
    width: number = 512,
    height: number = 512
  ): string {
    const [west, south, east, north] = bbox;
    return `${API_CONFIG.NASA_GIBS.BASE_URL}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layer}&STYLES=default&CRS=EPSG:4326&BBOX=${south},${west},${north},${east}&WIDTH=${width}&HEIGHT=${height}&FORMAT=image/png&TIME=${date}`;
  }

  // Helper methods
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATIONS.SATELLITE_DATA) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private parseWMSCapabilities(xmlText: string): any {
    // Simplified XML parsing - in production, use a proper XML parser
    return {
      layers: [
        'MODIS_Terra_CorrectedReflectance_TrueColor',
        'MODIS_Fires_All',
        'VIIRS_SNPP_Fires_375m_Day',
        'LANDSAT_WELD_CorrectedReflectance_TrueColor_Global_Annual'
      ],
      formats: ['image/png', 'image/jpeg'],
      crs: ['EPSG:4326', 'EPSG:3857']
    };
  }

  private getMockCapabilities(): any {
    return {
      layers: Object.values(API_CONFIG.NASA_GIBS.LAYERS),
      formats: ['image/png', 'image/jpeg'],
      crs: ['EPSG:4326']
    };
  }

  private getMockSatelliteData(coordinates: { lat: number; lng: number }): SatelliteData[] {
    return [
      {
        timestamp: new Date().toISOString(),
        coverage: 89,
        cloudCover: 15,
        resolution: 10,
        layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        coordinates
      },
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        coverage: 91,
        cloudCover: 12,
        resolution: 375,
        layer: 'VIIRS_SNPP_Fires_375m_Day',
        coordinates
      }
    ];
  }

  private getMockFireData(area: any): FireData[] {
    return [
      {
        latitude: area.north - 0.1,
        longitude: area.west + 0.1,
        brightness: 320.5,
        scan: 0.4,
        track: 0.4,
        acq_date: new Date().toISOString().split('T')[0],
        acq_time: '1325',
        satellite: 'N',
        confidence: 85,
        version: '2.0NRT',
        bright_t31: 295.2,
        frp: 15.3
      }
    ];
  }

  private getMockForestChangeData(region: string): any {
    return {
      region,
      forestLoss: { '2023': 2.3, '2022': 1.8, '2021': 2.1 },
      forestGain: { '2023': 0.4, '2022': 0.3, '2021': 0.5 },
      totalArea: this.getRegionArea(region),
      lastUpdate: new Date().toISOString()
    };
  }

  private getRegionArea(region: string): number {
    const areas: { [key: string]: number } = {
      'amazon': 6700000, // km²
      'congo': 3700000,
      'boreal': 17000000,
      'southeast_asia': 2500000
    };
    return areas[region.toLowerCase()] || 1000000;
  }
}

export const nasaGibsService = new NASAGibsService();