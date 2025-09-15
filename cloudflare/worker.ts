// Cloudflare Worker consolidating forest API endpoints
// Active routes:
//  - GET /health
//  - GET /fire-alerts?region=world&days=1
//  - GET /deforestation-alerts?region=BRA
//  - GET /weather?lat=..&lng=..
//  - GET /forest-regions
//  - GET /biodiversity?region=global&limit=20
//  - GET /satellite-data?lat=..&lng=..&layer=...
//  - GET /user-profile

export interface Env {
  NASA_FIRMS_API_KEY?: string;
  OPENWEATHER_API_KEY?: string;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      let path = url.pathname.replace(/\/?$/,'');
      if (path.startsWith('/api/')) path = path.slice(4);
      else if (path === '/api') path = '/';

      switch (path) {
        case '/health':
          return handleHealth(env);
        case '/fire-alerts':
          return handleFireAlerts(url, env);
        case '/deforestation-alerts':
          return handleDeforestationAlerts(url);
        case '/weather':
          return handleWeather(url, env);
        case '/forest-regions':
          return handleForestRegions();
        case '/biodiversity':
          return handleBiodiversity(url);
        case '/satellite-data':
          return handleSatelliteData(url);
        case '/user-profile':
          return handleUserProfile(request);
        default:
          return json({ success: false, error: 'Endpoint not found' }, 404);
      }
    } catch (error: any) {
      return json({ success: false, error: 'Internal server error', details: error?.message }, 500);
    }
  },
};

// Handlers
function handleHealth(env: Env): Response {
  return json({
    success: true,
    service: 'forest-worker',
    timestamp: new Date().toISOString(),
    apis: {
      nasa_firms: Boolean(env.NASA_FIRMS_API_KEY && env.NASA_FIRMS_API_KEY !== 'YOUR_NASA_FIRMS_API_KEY_HERE'),
      openweather: Boolean(env.OPENWEATHER_API_KEY && env.OPENWEATHER_API_KEY !== 'YOUR_OPENWEATHER_API_KEY_HERE'),
    },
  });
}

async function handleFireAlerts(url: URL, env: Env): Promise<Response> {
  const region = url.searchParams.get('region') || url.searchParams.get('area') || 'world';
  const days = url.searchParams.get('days') || '1';
  const forcedDataset = (url.searchParams.get('dataset') || '').toUpperCase();
  const forcedDate = url.searchParams.get('date') || '';

  const cacheKey = new Request(`https://cache.fire-alerts/${region}/${days}`);
  const cache: any = (caches as any).default ?? caches;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const overrideKey = url.searchParams.get('key') || url.searchParams.get('mapKey') || '';
  const apiKey = overrideKey || env.NASA_FIRMS_API_KEY || 'YOUR_NASA_FIRMS_API_KEY_HERE';
  try {
    if (apiKey === 'YOUR_NASA_FIRMS_API_KEY_HERE') {
      if (url.searchParams.get('no_mock') === '1') return json({ success: false, error: 'NASA FIRMS key not configured' }, 502);
      const res = json({ success: true, data: generateMockFireAlerts(), source: 'mock' });
      await cache.put(cacheKey, res.clone());
      return res;
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const datasets = forcedDataset ? [forcedDataset] : ['MODIS_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT'];
    let lastError: any = null;
    for (const dataset of datasets) {
      try {
        const dateToUse = forcedDate || yesterday;
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${dataset}/${region}/${days}/${dateToUse}`;
        const r = await fetch(url, { headers: { 'Accept': 'text/csv', 'User-Agent': 'Global-Forest-Explorer-Worker/1.0' } });
        if (!r.ok) throw new Error(`NASA FIRMS API error: ${r.status}`);
        const csv = await r.text();
        const data = parseFireCsvData(csv);
        const res = json({ success: true, data, source: `nasa-firms:${dataset.toLowerCase()}` });
        await cache.put(cacheKey, res.clone());
        return res;
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    throw lastError || new Error('NASA FIRMS datasets unavailable');
  } catch (e: any) {
    if (url.searchParams.get('no_mock') === '1') return json({ success: false, error: e?.message || 'Fire alerts failed' }, 502);
    return json({ success: true, data: generateMockFireAlerts(), source: 'mock-fallback', error: e?.message });
  }
}

async function handleDeforestationAlerts(url: URL): Promise<Response> {
  const region = url.searchParams.get('region') || 'BRA';
  const days = parseInt(url.searchParams.get('days') || '90', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const end = new Date();
  const start = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
  const endStr = end.toISOString().split('T')[0];
  const startStr = start.toISOString().split('T')[0];

  const cacheKey = new Request(`https://cache.deforestation-alerts/${region}/${days}/${endStr}/${limit}`);
  const cache: any = (caches as any).default ?? caches;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const gfwUrl = `https://production-api.globalforestwatch.org/v1/glad-alerts/admin/${region}?period=${startStr},${endStr}&gladConfirmOnly=false&limit=${limit}`;
    const r = await fetch(gfwUrl, { headers: { 'Accept': 'application/json', 'User-Agent': 'Global-Forest-Explorer-Worker/1.0' } });
    if (!r.ok) throw new Error(`GFW API error: ${r.status}`);
    const jsonData = await r.json();
    const data = parseGladAlertsData(jsonData);
    const res = json({ success: true, data, source: 'global-forest-watch' });
    await cache.put(cacheKey, res.clone());
    return res;
  } catch (e: any) {
    if (url.searchParams.get('no_mock') === '1') return json({ success: false, error: e?.message || 'Deforestation alerts failed' }, 502);
    const res = json({ success: true, data: generateMockDeforestationAlerts(), source: 'mock-fallback', error: e?.message });
    await cache.put(cacheKey, res.clone());
    return res;
  }
}

async function handleWeather(url: URL, env: Env): Promise<Response> {
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  if (!lat || !lng) return json({ success: false, error: 'Latitude and longitude required' }, 400);

  const cacheKey = new Request(`https://cache.weather/${lat}/${lng}`);
  const cache: any = (caches as any).default ?? caches;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const apiKey = env.OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY_HERE';
  try {
    if (apiKey === 'YOUR_OPENWEATHER_API_KEY_HERE') {
      if (url.searchParams.get('no_mock') === '1') return json({ success: false, error: 'OpenWeather key not configured' }, 502);
      const res = json({ success: true, data: mockWeather(parseFloat(lat), parseFloat(lng)), source: 'mock' });
      await cache.put(cacheKey, res.clone());
      return res;
    }
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    const r = await fetch(weatherUrl, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`OpenWeather API error: ${r.status}`);
    const data = parseOpenWeatherData(await r.json());
    const res = json({ success: true, data, source: 'openweather' });
    await cache.put(cacheKey, res.clone());
    return res;
  } catch (e: any) {
    if (url.searchParams.get('no_mock') === '1') return json({ success: false, error: e?.message || 'Weather failed' }, 502);
    return json({ success: true, data: mockWeather(parseFloat(lat), parseFloat(lng)), source: 'mock-fallback', error: e?.message });
  }
}

async function handleForestRegions(): Promise<Response> {
  const cacheKey = new Request('https://cache.forest-regions');
  const cache: any = (caches as any).default ?? caches;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const data = generateEnhancedForestRegions();
  const res = json({ success: true, data, source: 'server-generated' });
  await cache.put(cacheKey, res.clone());
  return res;
}

async function handleBiodiversity(url: URL): Promise<Response> {
  const region = url.searchParams.get('region') || 'global';
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  const cacheKey = new Request(`https://cache.biodiversity/${region}/${limit}`);
  const cache: any = (caches as any).default ?? caches;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const speciesQueries = [
    'Pongo abelii',
    'Panthera onca',
    'Gorilla beringei',
    'Harpia harpyja',
    'Ara macao',
  ];
  const results: any[] = [];
  for (const q of speciesQueries) {
    try {
      const r = await fetch(`https://api.gbif.org/v1/species/search?q=${encodeURIComponent(q)}&limit=1`, { headers: { 'Accept': 'application/json', 'User-Agent': 'Global-Forest-Explorer-Worker/1.0' } });
      if (r.ok) {
        const j = await r.json();
        if (j.results && j.results.length > 0) results.push(parseGBIFSpeciesData(j.results[0]));
      }
    } catch {
      // ignore
    }
  }
  while (results.length < Math.min(limit, speciesQueries.length)) {
    if (url.searchParams.get('no_mock') === '1') break;
    results.push(...generateMockBiodiversityData().slice(results.length, results.length + 1));
  }
  const res = json({ success: true, data: results.slice(0, limit), source: results.length >= speciesQueries.length ? 'gbif-enhanced' : 'mock' });
  await cache.put(cacheKey, res.clone());
  return res;
}

async function handleSatelliteData(url: URL): Promise<Response> {
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const layer = url.searchParams.get('layer') || 'MODIS_Terra_CorrectedReflectance_TrueColor';
  if (!lat || !lng) return json({ success: false, error: 'Latitude and longitude required' }, 400);
  const today = new Date().toISOString().split('T')[0];
  const data = {
    timestamp: new Date().toISOString(),
    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    coverage: 85 + Math.random() * 10,
    cloudCover: Math.random() * 30,
    resolution: layer.includes('MODIS') ? 250 : 375,
    layer,
    tileUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=EPSG4326_250m&TILEMATRIX=6&TILEROW=32&TILECOL=64&FORMAT=image%2Fjpeg&TIME=${today}`,
    wmsUrl: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layer}&STYLES=default&CRS=EPSG:4326&BBOX=${parseFloat(lat)-1},${parseFloat(lng)-1},${parseFloat(lat)+1},${parseFloat(lng)+1}&WIDTH=512&HEIGHT=512&FORMAT=image/png&TIME=${today}`,
  };
  return json({ success: true, data, source: 'nasa-gibs' });
}

async function handleUserProfile(request: Request): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (!auth) return json({ success: false, error: 'No authorization header' }, 401);
  const profile = {
    name: 'Forest Researcher',
    organization: 'Global Conservation Institute',
    role: 'Senior Forest Analyst',
    joinDate: '2023-01-15',
    regions: ['amazon', 'congo', 'boreal'],
    permissions: ['view_alerts', 'manage_regions', 'export_data'],
  };
  return json({ success: true, data: profile, source: 'worker-profile' });
}

// Utilities
function json(body: any, status: number = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function parseFireCsvData(csvData: string): any[] {
  const alerts: any[] = [];
  const lines = csvData.split('\n');
  for (let i = 1; i < Math.min(lines.length, 51); i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const fields = line.split(',');
    if (fields.length >= 13) {
      const lat = parseFloat(fields[0]);
      const lng = parseFloat(fields[1]);
      const confidence = parseFloat(fields[8]);
      const frp = parseFloat(fields[11]);
      alerts.push({
        id: `fire_${lat}_${lng}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        location: getLocationName(lat, lng),
        type: 'fire',
        severity: calculateFireSeverity(frp, confidence),
        confidence,
        description: `Fire detected with ${frp.toFixed(1)} MW radiative power`,
        coordinates: { lat, lng },
        metadata: { frp },
      });
    }
  }
  return alerts;
}

function parseGladAlertsData(data: any): any[] {
  const alerts: any[] = [];
  if (data?.data && Array.isArray(data.data)) {
    data.data.slice(0, 25).forEach((alert: any, index: number) => {
      alerts.push({
        id: `deforest_${index}_${Date.now()}`,
        timestamp: alert.date || new Date().toISOString(),
        location: alert.iso || alert.admin || 'Forest Region',
        type: 'deforestation',
        severity: getDeforestationSeverity(alert.alerts || alert.area || 1),
        confidence: alert.confidence || 85,
        description: `Deforestation detected: ${alert.alerts || alert.area || 'area'} alerts`,
        coordinates: { lat: alert.lat || (Math.random() * 10 - 5), lng: alert.lng || (Math.random() * 20 - 10) },
        metadata: alert,
      });
    });
  }
  return alerts;
}

function parseOpenWeatherData(data: any): any {
  return {
    temperature: data.main.temp,
    humidity: data.main.humidity,
    precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
    windSpeed: data.wind.speed,
    pressure: data.main.pressure,
    cloudCover: data.clouds.all,
    uvIndex: 0,
    fireWeatherIndex: calculateFireWeatherIndex(data.main.temp, data.main.humidity, data.rain?.['1h'] || 0),
    location: data.name,
    country: data.sys.country,
    description: data.weather?.[0]?.description,
  };
}

function parseGBIFSpeciesData(gbifResult: any): any {
  return {
    id: gbifResult.key || gbifResult.scientificName?.toLowerCase().replace(' ', '_'),
    name: gbifResult.vernacularName || gbifResult.canonicalName || 'Unknown Species',
    scientificName: gbifResult.scientificName || gbifResult.canonicalName,
    status: determineConservationStatus(gbifResult),
    population: Math.floor(Math.random() * 100000) + 1000,
    trend: (Math.random() - 0.5) * 6,
    habitat: gbifResult.habitat || 'Forest',
    lastSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 85 + Math.random() * 10,
    threatLevel: Math.floor(Math.random() * 100),
    conservationStatus: gbifResult.threatStatus || 'Data Deficient',
  };
}

function determineConservationStatus(gbifResult: any): 'stable' | 'declining' | 'critically_endangered' | 'recovering' {
  const status = (gbifResult?.threatStatus || '').toLowerCase();
  if (status.includes('critically endangered')) return 'critically_endangered';
  if (status.includes('endangered') || status.includes('vulnerable')) return 'declining';
  if (status.includes('recovering') || status.includes('improving')) return 'recovering';
  return 'stable';
}

// Helpers
function calculateFireWeatherIndex(temp: number, humidity: number, precipitation: number): number {
  const dryness = Math.max(0, 100 - humidity);
  const heat = Math.max(0, temp - 20);
  const dryPeriod = Math.max(0, 30 - precipitation);
  return Math.min(100, (dryness + heat + dryPeriod) / 3);
}

function calculateFireSeverity(frp: number, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
  if (frp > 50 && confidence > 80) return 'critical';
  if (frp > 25 && confidence > 70) return 'high';
  if (frp > 10 && confidence > 60) return 'medium';
  return 'low';
}

function getDeforestationSeverity(alertCount: number): 'low' | 'medium' | 'high' | 'critical' {
  if (alertCount > 100) return 'critical';
  if (alertCount > 50) return 'high';
  if (alertCount > 10) return 'medium';
  return 'low';
}

function getLocationName(lat: number, lng: number): string {
  if (lat < -3 && lat > -5 && lng < -60 && lng > -65) return 'Amazon Basin, Brazil';
  if (lat < 2 && lat > -2 && lng > 14 && lng < 17) return 'Congo Basin, DRC';
  if (lat > 60 && lng < -150) return 'Boreal Forest, Canada';
  if (lat > 0 && lat < 5 && lng > 100 && lng < 110) return 'Southeast Asian Rainforest';
  return `Forest Region (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
}

// Mock generators
function generateMockFireAlerts(): any[] {
  return [
    { id: 'fire_server_1', timestamp: new Date().toISOString(), location: 'Amazon Basin, Brazil', type: 'fire', severity: 'high', confidence: 85, description: 'Fire detected with 25.3 MW radiative power', coordinates: { lat: -3.2, lng: -61.8 }, metadata: { brightness: 320.5, frp: 25.3 } },
    { id: 'fire_server_2', timestamp: new Date(Date.now() - 3600000).toISOString(), location: 'Southeast Asia', type: 'fire', severity: 'critical', confidence: 92, description: 'High-intensity fire detected with 47.8 MW radiative power', coordinates: { lat: 1.5, lng: 104.2 }, metadata: { brightness: 340.2, frp: 47.8 } },
  ];
}

function generateMockDeforestationAlerts(): any[] {
  return [
    { id: 'deforest_server_1', timestamp: new Date(Date.now() - 7200000).toISOString(), location: 'Congo Basin, DRC', type: 'deforestation', severity: 'high', confidence: 78, description: 'Deforestation alert detected by GLAD system', coordinates: { lat: -0.3, lng: 15.9 } },
    { id: 'deforest_server_2', timestamp: new Date(Date.now() - 10800000).toISOString(), location: 'Brazilian Amazon', type: 'deforestation', severity: 'critical', confidence: 89, description: 'Large-scale clearing detected via satellite imagery', coordinates: { lat: -4.1, lng: -63.2 } },
  ];
}

function generateMockBiodiversityData(): any[] {
  return [
    { id: 'orangutan_server', name: 'Sumatran Orangutan', scientificName: 'Pongo abelii', status: 'critically_endangered', population: 14000, trend: -2.3, habitat: 'Tropical Rainforest', lastSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), confidence: 92, threatLevel: 85, conservationStatus: 'Critically Endangered' },
    { id: 'jaguar_server', name: 'Jaguar', scientificName: 'Panthera onca', status: 'declining', population: 64000, trend: -1.8, habitat: 'Amazon Rainforest', lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), confidence: 88, threatLevel: 72, conservationStatus: 'Near Threatened' },
  ];
}

function generateEnhancedForestRegions(): any[] {
  return [
    { id: 'amazon', name: 'Amazon Basin', lat: -3.4653, lng: -62.2159, healthScore: 75, deforestationRate: 2.3, biodiversityIndex: 94, alertLevel: 'high', lastUpdate: new Date().toISOString(), area: 6700000, forestCover: 83, fireRisk: 65, temperature: 26.5, precipitation: 2300 },
    { id: 'congo', name: 'Congo Basin', lat: -0.228, lng: 15.8277, healthScore: 82, deforestationRate: 1.8, biodiversityIndex: 87, alertLevel: 'medium', lastUpdate: new Date().toISOString(), area: 3700000, forestCover: 89, fireRisk: 45, temperature: 25.2, precipitation: 1800 },
  ];
}

function mockWeather(lat: number, lng: number) {
  const temp = 30 - Math.abs(lat) * 0.6 + (Math.random() - 0.5) * 10;
  const humidity = 60 + Math.random() * 30;
  const precipitation = Math.max(0, 20 - Math.abs(lat) * 0.2) + Math.random() * 5;
  return {
    temperature: temp,
    humidity,
    precipitation,
    windSpeed: 5 + Math.random() * 15,
    pressure: 1013 + (Math.random() - 0.5) * 20,
    cloudCover: Math.random() * 100,
    uvIndex: Math.max(0, 11 - Math.abs(lat) / 10),
    fireWeatherIndex: calculateFireWeatherIndex(temp, humidity, precipitation),
    location: getLocationName(lat, lng),
    country: 'Unknown',
    description: 'Clear sky',
  };
}


