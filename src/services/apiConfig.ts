// API configuration and endpoints for live data sources
export const API_CONFIG = {
  // NASA GIBS - Global Imagery Browse Services
  NASA_GIBS: {
    BASE_URL: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
    WMTS_URL: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi',
    LAYERS: {
      MODIS_TERRA_TRUE_COLOR: 'MODIS_Terra_CorrectedReflectance_TrueColor',
      MODIS_FIRES: 'MODIS_Fires_All',
      VIIRS_FIRES: 'VIIRS_SNPP_Fires_375m_Day',
      LANDSAT_WELD: 'LANDSAT_WELD_CorrectedReflectance_TrueColor_Global_Annual'
    }
  },
  
  // NASA FIRMS - Fire Information for Resource Management System
  NASA_FIRMS: {
    BASE_URL: 'https://firms.modaps.eosdis.nasa.gov/api',
    // Using the demo key - users should replace with their own
    API_KEY: 'YOUR_NASA_FIRMS_API_KEY', 
    ENDPOINTS: {
      ACTIVE_FIRES: '/area/csv',
      FIRE_ARCHIVE: '/archive/csv'
    }
  },
  
  // OpenWeather API for climate data
  OPENWEATHER: {
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    API_KEY: 'YOUR_OPENWEATHER_API_KEY', // Demo key - replace with real one
    ENDPOINTS: {
      CURRENT: '/weather',
      FORECAST: '/forecast',
      ONECALL: '/onecall'
    }
  },
  
  // Global Forest Watch API
  GLOBAL_FOREST_WATCH: {
    BASE_URL: 'https://production-api.globalforestwatch.org',
    ENDPOINTS: {
      FOREST_LOSS: '/v1/forest-change/umd-loss-gain',
      GLAD_ALERTS: '/v1/glad-alerts/admin',
      FOREST_COVER: '/v1/forest-cover',
      TREE_COVER: '/v1/forest-change/tree-cover'
    }
  },
  
  // GBIF - Global Biodiversity Information Facility
  GBIF: {
    BASE_URL: 'https://api.gbif.org/v1',
    ENDPOINTS: {
      OCCURRENCES: '/occurrence/search',
      SPECIES: '/species/search',
      DATASETS: '/dataset/search'
    }
  },
  
  // ESA Sentinel Hub (free tier available)
  SENTINEL_HUB: {
    BASE_URL: 'https://services.sentinel-hub.com/api/v1',
    EVALSCRIPT_URL: 'https://custom-scripts.sentinel-hub.com',
    // Users need to register for free account
    CLIENT_ID: 'YOUR_SENTINEL_HUB_CLIENT_ID',
    CLIENT_SECRET: 'YOUR_SENTINEL_HUB_CLIENT_SECRET'
  }
};

// Rate limiting configuration
export const RATE_LIMITS = {
  NASA_FIRMS: 1000, // requests per day
  OPENWEATHER: 1000, // requests per day (free tier)
  GBIF: 100000, // requests per day
  GLOBAL_FOREST_WATCH: 10000, // requests per day
  SENTINEL_HUB: 3000 // processing units per month (free tier)
};

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
  SATELLITE_DATA: 30 * 60 * 1000, // 30 minutes
  FIRE_DATA: 15 * 60 * 1000, // 15 minutes
  WEATHER_DATA: 10 * 60 * 1000, // 10 minutes
  FOREST_DATA: 24 * 60 * 60 * 1000, // 24 hours
  SPECIES_DATA: 24 * 60 * 60 * 1000 // 24 hours
};