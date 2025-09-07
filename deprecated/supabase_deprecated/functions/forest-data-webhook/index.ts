// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nasa-api-key, x-openweather-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Environment variables
const NASA_FIRMS_API_KEY = Deno.env.get('NASA_FIRMS_API_KEY') || 'YOUR_NASA_FIRMS_API_KEY_HERE'
const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY') || 'YOUR_OPENWEATHER_API_KEY_HERE'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface WebhookEvent {
  type: 'scheduled' | 'manual' | 'api-update'
  source?: string
  timestamp: string
  data?: any
}

interface ClientApiKeys {
  nasaApiKey?: string
  openWeatherApiKey?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const { pathname, searchParams } = url
    const path = pathname.replace('/functions/v1/forest-data-webhook', '')
    
    console.log(`Forest Data Webhook: ${req.method} ${path}`)

    // Extract optional client-supplied API keys from headers or query params
    const clientApiKeys: ClientApiKeys = {
      nasaApiKey: req.headers.get('x-nasa-api-key') || searchParams.get('nasaKey') || searchParams.get('nasa_api_key') || undefined,
      openWeatherApiKey: req.headers.get('x-openweather-api-key') || searchParams.get('owKey') || searchParams.get('openweatherKey') || searchParams.get('openweather_api_key') || undefined
    }

    // Initialize Supabase client with service role for full access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Route handlers
    switch (path) {
      case '/scheduled-update':
        return await handleScheduledUpdate(supabase, clientApiKeys)
        
      case '/fire-alert-webhook':
        return await handleFireAlertWebhook(req, supabase)
        
      case '/deforestation-webhook':
        return await handleDeforestationWebhook(req, supabase)
        
      case '/weather-update':
        return await handleWeatherUpdate(supabase, clientApiKeys.openWeatherApiKey)
        
      case '/full-sync':
        return await handleFullDataSync(supabase, clientApiKeys)
        
      case '/health':
        return handleWebhookHealth({
          requestKeys: {
            nasa: Boolean(clientApiKeys.nasaApiKey),
            openweather: Boolean(clientApiKeys.openWeatherApiKey)
          }
        })
        
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook endpoint not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('Forest Data Webhook Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Webhook processing error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Health check for webhook
function handleWebhookHealth(options?: { requestKeys?: { nasa: boolean; openweather: boolean } }): Response {
  const status = {
    success: true,
    service: 'forest-data-webhook',
    timestamp: new Date().toISOString(),
    capabilities: [
      'scheduled-updates',
      'fire-alert-processing',
      'deforestation-monitoring',
      'weather-sync',
      'data-caching'
    ],
    apis: {
      nasa_firms_env: NASA_FIRMS_API_KEY !== 'YOUR_NASA_FIRMS_API_KEY_HERE',
      openweather_env: OPENWEATHER_API_KEY !== 'YOUR_OPENWEATHER_API_KEY_HERE',
      nasa_firms_request: Boolean(options?.requestKeys?.nasa),
      openweather_request: Boolean(options?.requestKeys?.openweather)
    }
  }
  
  return new Response(
    JSON.stringify(status),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Scheduled update handler (called by cron job)
async function handleScheduledUpdate(supabase: any, clientApiKeys?: ClientApiKeys): Promise<Response> {
  try {
    console.log('Starting scheduled forest data update...')
    
    const updateResults = {
      timestamp: new Date().toISOString(),
      updates: []
    }

    // Update fire alerts every 15 minutes
    try {
      console.log('Updating fire alerts...')
      const fireResults = await updateFireAlerts(supabase, clientApiKeys?.nasaApiKey)
      updateResults.updates.push({
        type: 'fire-alerts',
        success: true,
        count: fireResults.count,
        source: fireResults.source
      })
    } catch (error) {
      console.error('Fire alerts update failed:', error)
      updateResults.updates.push({
        type: 'fire-alerts',
        success: false,
        error: error.message
      })
    }

    // Update deforestation alerts every hour
    const lastDeforestationUpdate = await getLastUpdateTime(supabase, 'deforestation-alerts')
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    
    if (!lastDeforestationUpdate || new Date(lastDeforestationUpdate).getTime() < oneHourAgo) {
      try {
        console.log('Updating deforestation alerts...')
        const deforestationResults = await updateDeforestationAlerts(supabase)
        updateResults.updates.push({
          type: 'deforestation-alerts',
          success: true,
          count: deforestationResults.count,
          source: deforestationResults.source
        })
      } catch (error) {
        console.error('Deforestation alerts update failed:', error)
        updateResults.updates.push({
          type: 'deforestation-alerts',
          success: false,
          error: error.message
        })
      }
    }

    // Update weather data for key regions every 10 minutes
    try {
      console.log('Updating weather data...')
      const weatherResults = await updateRegionalWeather(supabase, clientApiKeys?.openWeatherApiKey)
      updateResults.updates.push({
        type: 'weather-data',
        success: true,
        count: weatherResults.count,
        source: weatherResults.source
      })
    } catch (error) {
      console.error('Weather data update failed:', error)
      updateResults.updates.push({
        type: 'weather-data',
        success: false,
        error: error.message
      })
    }

    // Update biodiversity data daily
    const lastBiodiversityUpdate = await getLastUpdateTime(supabase, 'biodiversity-data')
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
    
    if (!lastBiodiversityUpdate || new Date(lastBiodiversityUpdate).getTime() < twentyFourHoursAgo) {
      try {
        console.log('Updating biodiversity data...')
        const biodiversityResults = await updateBiodiversityData(supabase)
        updateResults.updates.push({
          type: 'biodiversity-data',
          success: true,
          count: biodiversityResults.count,
          source: biodiversityResults.source
        })
      } catch (error) {
        console.error('Biodiversity data update failed:', error)
        updateResults.updates.push({
          type: 'biodiversity-data',
          success: false,
          error: error.message
        })
      }
    }

    // Store update log
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'scheduled-update',
        data: updateResults,
        created_at: new Date().toISOString()
      })

    console.log('Scheduled update completed:', updateResults)

    return new Response(
      JSON.stringify({ success: true, results: updateResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Scheduled update error:', error)
    
    // Log the error
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'scheduled-update-error',
        data: { error: error.message, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Fire alert webhook handler
async function handleFireAlertWebhook(req: Request, supabase: any): Promise<Response> {
  try {
    const webhookData = await req.json()
    console.log('Received fire alert webhook:', webhookData)

    // Process fire alert data
    const processedAlerts = await processFireAlertData(webhookData, supabase)

    // Store in database
    for (const alert of processedAlerts) {
      await supabase
        .from('forest_alerts')
        .upsert(alert, { onConflict: 'id' })
    }

    // Log webhook
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'fire-alert-webhook',
        data: { count: processedAlerts.length, source: webhookData.source || 'external' },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedAlerts.length,
        message: 'Fire alerts processed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Fire alert webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Deforestation webhook handler
async function handleDeforestationWebhook(req: Request, supabase: any): Promise<Response> {
  try {
    const webhookData = await req.json()
    console.log('Received deforestation webhook:', webhookData)

    // Process deforestation alert data
    const processedAlerts = await processDeforestationData(webhookData, supabase)

    // Store in database
    for (const alert of processedAlerts) {
      await supabase
        .from('forest_alerts')
        .upsert(alert, { onConflict: 'id' })
    }

    // Log webhook
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'deforestation-webhook',
        data: { count: processedAlerts.length, source: webhookData.source || 'external' },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedAlerts.length,
        message: 'Deforestation alerts processed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Deforestation webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Weather update handler
async function handleWeatherUpdate(supabase: any, openWeatherApiKey?: string): Promise<Response> {
  try {
    console.log('Starting weather data update...')
    
    const weatherResults = await updateRegionalWeather(supabase, openWeatherApiKey)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: weatherResults,
        message: 'Weather data updated successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Weather update error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Full data sync handler
async function handleFullDataSync(supabase: any, clientApiKeys?: ClientApiKeys): Promise<Response> {
  try {
    console.log('Starting full data synchronization...')
    
    const syncResults = {
      timestamp: new Date().toISOString(),
      synced: []
    }

    // Sync all data types
    const syncOperations = [
      { name: 'fire-alerts', operation: () => updateFireAlerts(supabase, clientApiKeys?.nasaApiKey) },
      { name: 'deforestation-alerts', operation: () => updateDeforestationAlerts(supabase) },
      { name: 'weather-data', operation: () => updateRegionalWeather(supabase, clientApiKeys?.openWeatherApiKey) },
      { name: 'biodiversity-data', operation: () => updateBiodiversityData(supabase) },
      { name: 'forest-regions', operation: () => updateForestRegions(supabase) }
    ]

    for (const sync of syncOperations) {
      try {
        console.log(`Syncing ${sync.name}...`)
        const result = await sync.operation()
        syncResults.synced.push({
          type: sync.name,
          success: true,
          count: result.count,
          source: result.source
        })
      } catch (error) {
        console.error(`${sync.name} sync failed:`, error)
        syncResults.synced.push({
          type: sync.name,
          success: false,
          error: error.message
        })
      }
    }

    // Log full sync
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'full-data-sync',
        data: syncResults,
        created_at: new Date().toISOString()
      })

    console.log('Full data sync completed:', syncResults)

    return new Response(
      JSON.stringify({ success: true, results: syncResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Full data sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Data update functions
async function updateFireAlerts(supabase: any, nasaApiKey?: string): Promise<{ count: number; source: string }> {
  const effectiveNasaKey = nasaApiKey || NASA_FIRMS_API_KEY
  if (effectiveNasaKey === 'YOUR_NASA_FIRMS_API_KEY_HERE') {
    // Use mock data if no API key
    const mockAlerts = generateMockFireAlerts()
    
    for (const alert of mockAlerts) {
      await supabase
        .from('api_cache')
        .upsert({ 
          key: `fire_alert_${alert.id}`, 
          data: alert, 
          created_at: new Date().toISOString() 
        })
    }
    
    await setLastUpdateTime(supabase, 'fire-alerts')
    return { count: mockAlerts.length, source: 'mock-server' }
  }

  try {
    // Fetch from NASA FIRMS API
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${effectiveNasaKey}/MODIS_NRT/world/1/${yesterday}`
    
    const response = await fetch(firmsUrl, {
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'Global-Forest-Explorer-Webhook/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`NASA FIRMS API error: ${response.status}`)
    }

    const csvData = await response.text()
    const fireAlerts = parseFireCsvData(csvData)

    // Cache the alerts
    for (const alert of fireAlerts) {
      await supabase
        .from('forest_alerts')
        .upsert(alert, { onConflict: 'id' })
    }

    await setLastUpdateTime(supabase, 'fire-alerts')
    return { count: fireAlerts.length, source: 'nasa-firms' }
    
  } catch (error) {
    console.error('NASA FIRMS update failed:', error)
    throw error
  }
}

async function updateDeforestationAlerts(supabase: any): Promise<{ count: number; source: string }> {
  try {
    // Fetch from Global Forest Watch API
    const currentYear = new Date().getFullYear()
    const gfwUrl = `https://production-api.globalforestwatch.org/v1/glad-alerts/admin/BRA?period=${currentYear}-01-01,${currentYear}-12-31&gladConfirmOnly=false&limit=50`
    
    const response = await fetch(gfwUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Global-Forest-Explorer-Webhook/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Global Forest Watch API error: ${response.status}`)
    }

    const data = await response.json()
    const deforestationAlerts = parseGladAlertsData(data)

    // Cache the alerts
    for (const alert of deforestationAlerts) {
      await supabase
        .from('forest_alerts')
        .upsert(alert, { onConflict: 'id' })
    }

    await setLastUpdateTime(supabase, 'deforestation-alerts')
    return { count: deforestationAlerts.length, source: 'global-forest-watch' }
    
  } catch (error) {
    console.error('Global Forest Watch update failed, using mock data:', error)
    
    // Fall back to mock data
    const mockAlerts = generateMockDeforestationAlerts()
    
    for (const alert of mockAlerts) {
      await supabase
        .from('forest_alerts')
        .upsert(alert, { onConflict: 'id' })
    }
    
    await setLastUpdateTime(supabase, 'deforestation-alerts')
    return { count: mockAlerts.length, source: 'mock-fallback' }
  }
}

async function updateRegionalWeather(supabase: any, openWeatherApiKey?: string): Promise<{ count: number; source: string }> {
  const keyRegions = [
    { name: 'amazon', lat: -3.4653, lng: -62.2159 },
    { name: 'congo', lat: -0.228, lng: 15.8277 },
    { name: 'boreal', lat: 64.2008, lng: -153.4937 },
    { name: 'southeast_asia', lat: 1.3521, lng: 103.8198 }
  ]

  let updatedCount = 0
  let source = 'mock-server'

  const effectiveOpenWeatherKey = openWeatherApiKey || OPENWEATHER_API_KEY

  for (const region of keyRegions) {
    try {
      let weatherData

      if (effectiveOpenWeatherKey !== 'YOUR_OPENWEATHER_API_KEY_HERE') {
        // Fetch live weather data
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${region.lat}&lon=${region.lng}&appid=${effectiveOpenWeatherKey}&units=metric`
        
        const response = await fetch(weatherUrl)
        if (response.ok) {
          const data = await response.json()
          weatherData = parseOpenWeatherData(data)
          source = 'openweather'
        } else {
          throw new Error(`OpenWeather API error: ${response.status}`)
        }
      } else {
        // Use mock weather data
        weatherData = generateMockWeatherData(region.lat, region.lng)
      }

      // Cache weather data
      await supabase
        .from('api_cache')
        .upsert({ 
          key: `weather_${region.name}`, 
          data: weatherData, 
          created_at: new Date().toISOString() 
        })

      updatedCount++
      
    } catch (error) {
      console.error(`Weather update failed for ${region.name}:`, error)
      
      // Use mock data as fallback
      const mockWeatherData = generateMockWeatherData(region.lat, region.lng)
      await supabase
        .from('api_cache')
        .upsert({ 
          key: `weather_${region.name}`, 
          data: mockWeatherData, 
          created_at: new Date().toISOString() 
        })
      
      updatedCount++
    }
  }

  await setLastUpdateTime(supabase, 'weather-data')
  return { count: updatedCount, source }
}

async function updateBiodiversityData(supabase: any): Promise<{ count: number; source: string }> {
  const speciesQueries = [
    'Pongo abelii',      // Sumatran orangutan
    'Panthera onca',     // Jaguar
    'Gorilla beringei',  // Mountain gorilla
    'Harpia harpyja',    // Harpy eagle
    'Ara macao'          // Scarlet macaw
  ]

  const biodiversityData = []
  let source = 'gbif'

  for (const species of speciesQueries) {
    try {
      const gbifUrl = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(species)}&limit=1`
      
      const response = await fetch(gbifUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Global-Forest-Explorer-Webhook/1.0'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          biodiversityData.push(parseGBIFSpeciesData(data.results[0]))
        }
      }
    } catch (error) {
      console.log(`Error fetching GBIF data for ${species}:`, error)
    }
  }

  // Add mock data if we didn't get enough species
  if (biodiversityData.length < 5) {
    const mockSpecies = generateMockBiodiversityData()
    biodiversityData.push(...mockSpecies.slice(biodiversityData.length))
    source = 'gbif-enhanced'
  }

  // Cache biodiversity data
  await supabase
    .from('api_cache')
    .upsert({ 
      key: 'biodiversity_global', 
      data: biodiversityData, 
      created_at: new Date().toISOString() 
    })

  await setLastUpdateTime(supabase, 'biodiversity-data')
  return { count: biodiversityData.length, source }
}

async function updateForestRegions(supabase: any): Promise<{ count: number; source: string }> {
  const forestRegions = generateEnhancedForestRegions()

  // Cache forest regions
  await supabase
    .from('api_cache')
    .upsert({ 
      key: 'forest_regions_enhanced', 
      data: forestRegions, 
      created_at: new Date().toISOString() 
    })

  await setLastUpdateTime(supabase, 'forest-regions')
  return { count: forestRegions.length, source: 'server-enhanced' }
}

// Utility functions
async function getLastUpdateTime(supabase: any, type: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('update_timestamps')
      .select('last_update')
      .eq('update_type', type)
      .single()
    
    return data?.last_update || null
  } catch {
    return null
  }
}

async function setLastUpdateTime(supabase: any, type: string): Promise<void> {
  await supabase
    .from('update_timestamps')
    .upsert({ 
      update_type: type, 
      last_update: new Date().toISOString() 
    })
}

async function processFireAlertData(webhookData: any, supabase: any): Promise<any[]> {
  // Process incoming fire alert webhook data
  const alerts = []
  
  if (webhookData.alerts && Array.isArray(webhookData.alerts)) {
    for (const alert of webhookData.alerts) {
      alerts.push({
        id: `fire_webhook_${alert.id || Date.now()}`,
        timestamp: alert.timestamp || new Date().toISOString(),
        location: alert.location || 'Unknown Location',
        type: 'fire',
        severity: alert.severity || 'medium',
        confidence: alert.confidence || 75,
        description: alert.description || 'Fire detected via webhook',
        coordinates: alert.coordinates || { lat: 0, lng: 0 },
        metadata: alert.metadata || {},
        source: 'webhook'
      })
    }
  }
  
  return alerts
}

async function processDeforestationData(webhookData: any, supabase: any): Promise<any[]> {
  // Process incoming deforestation webhook data
  const alerts = []
  
  if (webhookData.alerts && Array.isArray(webhookData.alerts)) {
    for (const alert of webhookData.alerts) {
      alerts.push({
        id: `deforest_webhook_${alert.id || Date.now()}`,
        timestamp: alert.timestamp || new Date().toISOString(),
        location: alert.location || 'Unknown Location',
        type: 'deforestation',
        severity: alert.severity || 'medium',
        confidence: alert.confidence || 80,
        description: alert.description || 'Deforestation detected via webhook',
        coordinates: alert.coordinates || { lat: 0, lng: 0 },
        metadata: alert.metadata || {},
        source: 'webhook'
      })
    }
  }
  
  return alerts
}

// Data parsing functions (same as in forest-api)
function parseFireCsvData(csvData: string): any[] {
  const alerts: any[] = []
  const lines = csvData.split('\n')
  
  for (let i = 1; i < Math.min(lines.length, 51); i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const fields = line.split(',')
    if (fields.length >= 13) {
      const lat = parseFloat(fields[0])
      const lng = parseFloat(fields[1])
      const brightness = parseFloat(fields[2])
      const confidence = parseFloat(fields[8])
      const frp = parseFloat(fields[11])
      
      alerts.push({
        id: `fire_${lat}_${lng}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        location: getLocationName(lat, lng),
        type: 'fire',
        severity: calculateFireSeverity(frp, confidence),
        confidence,
        description: `Fire detected with ${frp.toFixed(1)} MW radiative power`,
        coordinates: { lat, lng },
        metadata: { brightness, frp },
        source: 'nasa-firms'
      })
    }
  }
  
  return alerts
}

function parseGladAlertsData(data: any): any[] {
  const alerts: any[] = []
  
  if (data.data && Array.isArray(data.data)) {
    data.data.slice(0, 25).forEach((alert: any, index: number) => {
      alerts.push({
        id: `deforest_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: alert.date || new Date().toISOString(),
        location: alert.iso || alert.admin || 'Forest Region',
        type: 'deforestation',
        severity: getDeforestationSeverity(alert.alerts || alert.area || 1),
        confidence: alert.confidence || 85,
        description: `Deforestation detected: ${alert.alerts || alert.area || 'area'} alerts`,
        coordinates: { 
          lat: alert.lat || (Math.random() * 10 - 5), 
          lng: alert.lng || (Math.random() * 20 - 10)
        },
        metadata: alert,
        source: 'global-forest-watch'
      })
    })
  }
  
  return alerts
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
    fireWeatherIndex: calculateFireWeatherIndex(
      data.main.temp,
      data.main.humidity,
      data.rain?.['1h'] || 0
    ),
    location: data.name,
    country: data.sys.country,
    description: data.weather[0].description,
    source: 'openweather'
  }
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
    source: 'gbif'
  }
}

// Helper functions (same as forest-api)
function calculateFireSeverity(frp: number, confidence: number): string {
  if (frp > 50 && confidence > 80) return 'critical'
  if (frp > 25 && confidence > 70) return 'high'
  if (frp > 10 && confidence > 60) return 'medium'
  return 'low'
}

function getDeforestationSeverity(alertCount: number): string {
  if (alertCount > 100) return 'critical'
  if (alertCount > 50) return 'high'
  if (alertCount > 10) return 'medium'
  return 'low'
}

function calculateFireWeatherIndex(temp: number, humidity: number, precipitation: number): number {
  const dryness = Math.max(0, 100 - humidity)
  const heat = Math.max(0, temp - 20)
  const dryPeriod = Math.max(0, 30 - precipitation)
  
  return Math.min(100, (dryness + heat + dryPeriod) / 3)
}

function determineConservationStatus(gbifResult: any): string {
  const status = gbifResult.threatStatus?.toLowerCase() || ''
  
  if (status.includes('critically endangered')) return 'critically_endangered'
  if (status.includes('endangered') || status.includes('vulnerable')) return 'declining'
  if (status.includes('recovering') || status.includes('improving')) return 'recovering'
  return 'stable'
}

function getLocationName(lat: number, lng: number): string {
  if (lat < -3 && lat > -5 && lng < -60 && lng > -65) return 'Amazon Basin, Brazil'
  if (lat < 2 && lat > -2 && lng > 14 && lng < 17) return 'Congo Basin, DRC'
  if (lat > 60 && lng < -150) return 'Boreal Forest, Canada'
  if (lat > 0 && lat < 5 && lng > 100 && lng < 110) return 'Southeast Asian Rainforest'
  return `Forest Region (${lat.toFixed(2)}, ${lng.toFixed(2)})`
}

// Mock data generators (same as forest-api)
function generateMockFireAlerts(): any[] {
  return [
    {
      id: `fire_webhook_${Date.now()}_1`,
      timestamp: new Date().toISOString(),
      location: 'Amazon Basin, Brazil',
      type: 'fire',
      severity: 'high',
      confidence: 85,
      description: 'Fire detected with 25.3 MW radiative power',
      coordinates: { lat: -3.2, lng: -61.8 },
      metadata: { brightness: 320.5, frp: 25.3 },
      source: 'webhook-mock'
    },
    {
      id: `fire_webhook_${Date.now()}_2`,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      location: 'Southeast Asia',
      type: 'fire',
      severity: 'critical',
      confidence: 92,
      description: 'High-intensity fire detected with 47.8 MW radiative power',
      coordinates: { lat: 1.5, lng: 104.2 },
      metadata: { brightness: 340.2, frp: 47.8 },
      source: 'webhook-mock'
    }
  ]
}

function generateMockDeforestationAlerts(): any[] {
  return [
    {
      id: `deforest_webhook_${Date.now()}_1`,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      location: 'Congo Basin, DRC',
      type: 'deforestation',
      severity: 'high',
      confidence: 78,
      description: 'Deforestation alert detected by GLAD system',
      coordinates: { lat: -0.3, lng: 15.9 },
      source: 'webhook-mock'
    },
    {
      id: `deforest_webhook_${Date.now()}_2`,
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      location: 'Brazilian Amazon',
      type: 'deforestation',
      severity: 'critical',
      confidence: 89,
      description: 'Large-scale clearing detected via satellite imagery',
      coordinates: { lat: -4.1, lng: -63.2 },
      source: 'webhook-mock'
    }
  ]
}

function generateMockWeatherData(lat: number, lng: number): any {
  const temp = getRegionalTemperature(lat, lng)
  const humidity = 60 + Math.random() * 30
  const precipitation = getRegionalPrecipitation(lat, lng)
  
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
    source: 'webhook-mock'
  }
}

function generateMockBiodiversityData(): any[] {
  return [
    {
      id: `orangutan_webhook_${Date.now()}`,
      name: 'Sumatran Orangutan',
      scientificName: 'Pongo abelii',
      status: 'critically_endangered',
      population: 14000,
      trend: -2.3,
      habitat: 'Tropical Rainforest',
      lastSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      confidence: 92,
      threatLevel: 85,
      conservationStatus: 'Critically Endangered',
      source: 'webhook-mock'
    },
    {
      id: `jaguar_webhook_${Date.now()}`,
      name: 'Jaguar',
      scientificName: 'Panthera onca',
      status: 'declining',
      population: 64000,
      trend: -1.8,
      habitat: 'Amazon Rainforest',
      lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      confidence: 88,
      threatLevel: 72,
      conservationStatus: 'Near Threatened',
      source: 'webhook-mock'
    }
  ]
}

function generateEnhancedForestRegions(): any[] {
  return [
    {
      id: 'amazon',
      name: 'Amazon Basin',
      lat: -3.4653,
      lng: -62.2159,
      healthScore: 75,
      deforestationRate: 2.3,
      biodiversityIndex: 94,
      alertLevel: 'high',
      lastUpdate: new Date().toISOString(),
      area: 6700000,
      forestCover: 83,  
      fireRisk: 65,
      temperature: 26.5,
      precipitation: 2300,
      source: 'webhook-enhanced'
    },
    {
      id: 'congo',
      name: 'Congo Basin',
      lat: -0.228,
      lng: 15.8277,
      healthScore: 82,
      deforestationRate: 1.8,
      biodiversityIndex: 87,
      alertLevel: 'medium',
      lastUpdate: new Date().toISOString(),
      area: 3700000,
      forestCover: 89,
      fireRisk: 45,
      temperature: 25.2,
      precipitation: 1800,
      source: 'webhook-enhanced'
    }
  ]
}

function getRegionalTemperature(lat: number, lng: number): number {
  const baseTemp = 30 - Math.abs(lat) * 0.6
  return baseTemp + (Math.random() - 0.5) * 10
}

function getRegionalPrecipitation(lat: number, lng: number): number {
  if (Math.abs(lat) < 10) return 2000 + Math.random() * 1000
  if (Math.abs(lat) < 30) return 1000 + Math.random() * 500
  return 500 + Math.random() * 300
}

console.log("Forest Data Webhook serverless function loaded")