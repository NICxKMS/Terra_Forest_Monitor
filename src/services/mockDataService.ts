// Mock data service for when API calls fail
// This provides realistic forest monitoring data for the demo

export interface ForestRegion {
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

export interface ForestAlert {
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

export interface BiodiversityData {
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

export interface SatelliteData {
  id: string;
  timestamp: string;
  coordinates: { lat: number; lng: number };
  cloudCover: number;
  vegetationIndex: number;
  surfaceTemperature: number;
  fireDetection: boolean;
  imageUrl?: string;
}

export class MockDataService {
  // Generate realistic forest regions
  getForestRegions(): ForestRegion[] {
    return [
      {
        id: 'amazon',
        name: 'Amazon Basin',
        lat: -3.4653,
        lng: -62.2159,
        healthScore: 72,
        deforestationRate: 2.3,
        biodiversityIndex: 94,
        alertLevel: 'high',
        lastUpdate: new Date().toISOString(),
        area: 6700000,
        forestCover: 85,
        fireRisk: 65,
        temperature: 28.5,
        precipitation: 2300
      },
      {
        id: 'congo',
        name: 'Congo Basin',
        lat: -0.228,
        lng: 15.8277,
        healthScore: 81,
        deforestationRate: 1.2,
        biodiversityIndex: 87,
        alertLevel: 'medium',
        lastUpdate: new Date().toISOString(),
        area: 3700000,
        forestCover: 92,
        fireRisk: 45,
        temperature: 26.2,
        precipitation: 1800
      },
      {
        id: 'boreal',
        name: 'Boreal Forest',
        lat: 64.2008,
        lng: -153.4937,
        healthScore: 89,
        deforestationRate: 0.3,
        biodiversityIndex: 76,
        alertLevel: 'low',
        lastUpdate: new Date().toISOString(),
        area: 17000000,
        forestCover: 94,
        fireRisk: 35,
        temperature: 13.2,
        precipitation: 400
      },
      {
        id: 'southeast_asia',
        name: 'Southeast Asian Rainforest',
        lat: 1.3521,
        lng: 103.8198,
        healthScore: 65,
        deforestationRate: 3.1,
        biodiversityIndex: 91,
        alertLevel: 'critical',
        lastUpdate: new Date().toISOString(),
        area: 2500000,
        forestCover: 78,
        fireRisk: 75,
        temperature: 29.8,
        precipitation: 2500
      },
      {
        id: 'temperate_north_america',
        name: 'North American Temperate Forest',
        lat: 45.0,
        lng: -85.0,
        healthScore: 85,
        deforestationRate: 0.8,
        biodiversityIndex: 82,
        alertLevel: 'low',
        lastUpdate: new Date().toISOString(),
        area: 8500000,
        forestCover: 88,
        fireRisk: 40,
        temperature: 15.3,
        precipitation: 900
      },
      {
        id: 'tropical_africa',
        name: 'Tropical African Forest',
        lat: 5.0,
        lng: 20.0,
        healthScore: 76,
        deforestationRate: 1.8,
        biodiversityIndex: 89,
        alertLevel: 'medium',
        lastUpdate: new Date().toISOString(),
        area: 4000000,
        forestCover: 80,
        fireRisk: 55,
        temperature: 27.8,
        precipitation: 1600
      }
    ];
  }

  // Generate recent forest alerts
  getForestAlerts(): ForestAlert[] {
    const now = new Date();
    return [
      {
        id: 'fire_001',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        location: 'Amazon Basin, Brazil',
        type: 'fire',
        severity: 'critical',
        confidence: 94,
        description: 'Large active fire detected with high radiative power (47.8 MW)',
        coordinates: { lat: -3.2, lng: -61.8 },
        metadata: {
          brightness: 348.2,
          frp: 47.8,
          satellite: 'MODIS-Aqua'
        }
      },
      {
        id: 'deforest_001',
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        location: 'Congo Basin, DRC',
        type: 'deforestation',
        severity: 'high',
        confidence: 87,
        description: 'Rapid forest loss detected in protected area (15.3 hectares)',
        coordinates: { lat: -0.5, lng: 16.2 }
      },
      {
        id: 'fire_002',
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        location: 'Southeast Asia, Indonesia',
        type: 'fire',
        severity: 'high',
        confidence: 82,
        description: 'Multiple fire hotspots in palm oil plantation area',
        coordinates: { lat: 1.5, lng: 104.2 }
      },
      {
        id: 'biodiversity_001',
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        location: 'Boreal Forest, Canada',
        type: 'biodiversity',
        severity: 'medium',
        confidence: 76,
        description: 'Caribou migration pattern disruption detected',
        coordinates: { lat: 65.1, lng: -152.8 }
      },
      {
        id: 'weather_001',
        timestamp: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
        location: 'Amazon Basin, Peru',
        type: 'weather',
        severity: 'medium',
        confidence: 91,
        description: 'Extreme drought conditions increasing fire risk',
        coordinates: { lat: -4.1, lng: -73.2 }
      }
    ];
  }

  // Generate biodiversity monitoring data
  getBiodiversityData(): BiodiversityData[] {
    return [
      {
        id: 'sumatran_orangutan',
        name: 'Sumatran Orangutan',
        scientificName: 'Pongo abelii',
        status: 'critically_endangered',
        population: 14000,
        trend: -3.2,
        habitat: 'Southeast Asian Rainforest',
        lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 94,
        threatLevel: 85,
        conservationStatus: 'Critically Endangered'
      },
      {
        id: 'jaguar',
        name: 'Jaguar',
        scientificName: 'Panthera onca',
        status: 'declining',
        population: 64000,
        trend: -1.8,
        habitat: 'Amazon Rainforest',
        lastSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 87,
        threatLevel: 70,
        conservationStatus: 'Near Threatened'
      },
      {
        id: 'mountain_gorilla',
        name: 'Mountain Gorilla',
        scientificName: 'Gorilla beringei',
        status: 'recovering',
        population: 1000,
        trend: 2.1,
        habitat: 'Congo Basin',
        lastSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 91,
        threatLevel: 65,
        conservationStatus: 'Critically Endangered'
      },
      {
        id: 'harpy_eagle',
        name: 'Harpy Eagle',
        scientificName: 'Harpia harpyja',
        status: 'stable',
        population: 20000,
        trend: 0.3,
        habitat: 'Amazon Rainforest',
        lastSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 78,
        threatLevel: 45,
        conservationStatus: 'Near Threatened'
      },
      {
        id: 'forest_elephant',
        name: 'African Forest Elephant',
        scientificName: 'Loxodonta cyclotis',
        status: 'critically_endangered',
        population: 60000,
        trend: -4.1,
        habitat: 'Congo Basin',
        lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 89,
        threatLevel: 92,
        conservationStatus: 'Critically Endangered'
      },
      {
        id: 'woodland_caribou',
        name: 'Woodland Caribou',
        scientificName: 'Rangifer tarandus caribou',
        status: 'declining',
        population: 2100000,
        trend: -2.5,
        habitat: 'Boreal Forest',
        lastSeen: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 85,
        threatLevel: 60,
        conservationStatus: 'Vulnerable'
      }
    ];
  }

  // Generate satellite data
  getSatelliteData(): SatelliteData[] {
    const regions = this.getForestRegions();
    return regions.flatMap(region => [
      {
        id: `sat_${region.id}_1`,
        timestamp: new Date().toISOString(),
        coordinates: { lat: region.lat, lng: region.lng },
        cloudCover: Math.random() * 60,
        vegetationIndex: 0.6 + Math.random() * 0.3,
        surfaceTemperature: region.temperature + (Math.random() - 0.5) * 5,
        fireDetection: region.fireRisk > 60 && Math.random() > 0.7
      },
      {
        id: `sat_${region.id}_2`,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        coordinates: { 
          lat: region.lat + (Math.random() - 0.5) * 0.5, 
          lng: region.lng + (Math.random() - 0.5) * 0.5 
        },
        cloudCover: Math.random() * 80,
        vegetationIndex: 0.5 + Math.random() * 0.4,
        surfaceTemperature: region.temperature + (Math.random() - 0.5) * 3,
        fireDetection: region.fireRisk > 50 && Math.random() > 0.8
      }
    ]);
  }

  // Generate historical data for charts
  getHistoricalData(regionId: string, years: number = 10): any[] {
    const currentYear = new Date().getFullYear();
    const data = [];
    
    for (let i = years; i >= 0; i--) {
      const year = currentYear - i;
      data.push({
        year,
        forestCoverage: Math.max(50, 95 - i * 1.2 + (Math.random() - 0.5) * 3),
        deforestationRate: 0.5 + i * 0.05 + Math.random() * 0.3,
        temperature: 13.5 + i * 0.12 + (Math.random() - 0.5) * 0.8,
        precipitation: 1100 - i * 15 + (Math.random() - 0.5) * 50,
        carbonSequestration: Math.max(0.1, 2.5 - i * 0.08 + (Math.random() - 0.5) * 0.2),
        biodiversityIndex: Math.max(60, 92 - i * 0.8 + (Math.random() - 0.5) * 2),
        fireIncidents: Math.floor(Math.random() * 50 + i * 2),
        speciesCount: Math.max(1000, 2500 - i * 20 + Math.random() * 100)
      });
    }
    
    return data;
  }

  // Generate analytics data
  getAnalyticsData() {
    return {
      globalStats: {
        totalForestArea: 40600000, // km²
        forestCoverPercentage: 31.2,
        deforestationRate: 10.2, // million hectares per year
        carbonStorage: 861, // billion tons
        speciesCount: 80000,
        protectedAreas: 15.7 // percentage
      },
      monthlyTrends: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(0, i).toLocaleString('default', { month: 'short' }),
        deforestation: 50 + Math.random() * 30,
        fires: 100 + Math.random() * 150,
        restoration: 20 + Math.random() * 15,
        species: 1200 + Math.random() * 200
      })),
      regionalComparison: this.getForestRegions().map(region => ({
        name: region.name,
        healthScore: region.healthScore,
        biodiversityIndex: region.biodiversityIndex,
        deforestationRate: region.deforestationRate,
        forestCover: region.forestCover
      }))
    };
  }
}

export const mockDataService = new MockDataService();