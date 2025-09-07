# Global Forest Explorer - Production Deployment Guide

This guide covers deploying the Global Forest Explorer with complete server-side API proxy, serverless functions, and webhook-based data updates to bypass browser CORS limitations.

## 🚀 Architecture Overview

The production deployment uses three key approaches to handle external API limitations:

1. **Server-side API Proxy** - Supabase Edge Functions act as CORS-free proxies
2. **Serverless Functions** - All external API calls handled server-side  
3. **Webhook-based Updates** - Scheduled data synchronization and caching

## 📋 Prerequisites

- Supabase account and project
- API keys for external services (optional but recommended):
  - NASA FIRMS API key
  - OpenWeather API key
  - GBIF account (free, no key required)

## 🛠️ Deployment Steps

### 1. Set Up Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push database schema
supabase db push

# Deploy Edge Functions
supabase functions deploy forest-api
supabase functions deploy forest-data-webhook
```

### 2. Configure Environment Variables

In your Supabase dashboard, go to Settings > Edge Functions and add:

```bash
NASA_FIRMS_API_KEY=your_nasa_firms_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Set Up Database Schema

The migration file `20241209000001_forest_data_tables.sql` will create:

- `api_cache` - Cached API responses
- `forest_alerts` - Processed forest monitoring alerts
- `webhook_logs` - Webhook event logging
- `update_timestamps` - Data refresh scheduling
- `forest_regions` - Enhanced region data
- `species_data` - Biodiversity tracking
- `user_profiles` - User management

### 4. Configure Webhook Scheduling

Set up cron jobs or scheduled functions to trigger data updates:

#### Option A: Supabase Cron (recommended)

```sql
-- Schedule fire alerts update every 15 minutes
SELECT cron.schedule(
  'fire-alerts-update',
  '*/15 * * * *',
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/forest-data-webhook/scheduled-update'',
    headers:=''{"Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb
  );'
);

-- Schedule full data sync daily at 2 AM
SELECT cron.schedule(
  'daily-full-sync',
  '0 2 * * *',
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/forest-data-webhook/full-sync'',
    headers:=''{"Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb
  );'
);
```

#### Option B: External Cron Service

Use services like GitHub Actions, Vercel Cron, or similar:

```yaml
# .github/workflows/data-sync.yml
name: Forest Data Sync
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Data Update
        run: |
          curl -X POST \
            https://your-project.supabase.co/functions/v1/forest-data-webhook/scheduled-update \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### 5. Deploy Frontend Application

Deploy to platforms like Vercel, Netlify, or Cloudflare Pages:

```bash
# Build the application
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod
```

## 🔧 Configuration

### Environment Variables for Frontend

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Edge Function URLs

The application will automatically use these endpoints:

- `https://your-project.supabase.co/functions/v1/forest-api/fire-alerts`
- `https://your-project.supabase.co/functions/v1/forest-api/deforestation-alerts`
- `https://your-project.supabase.co/functions/v1/forest-api/weather`
- `https://your-project.supabase.co/functions/v1/forest-api/biodiversity`
- `https://your-project.supabase.co/functions/v1/forest-api/satellite-data`

## 🎯 API Endpoints

### Forest API (Server-side Proxy)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/forest-api/health` | GET | Service health check |
| `/forest-api/fire-alerts` | GET/POST | NASA FIRMS fire data |
| `/forest-api/deforestation-alerts` | GET/POST | Global Forest Watch alerts |
| `/forest-api/weather` | GET/POST | OpenWeather data |
| `/forest-api/biodiversity` | GET/POST | GBIF species data |
| `/forest-api/satellite-data` | GET/POST | NASA GIBS imagery |
| `/forest-api/forest-regions` | GET | Enhanced region data |

### Webhook Endpoints (Data Updates)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/forest-data-webhook/scheduled-update` | POST | Scheduled data refresh |
| `/forest-data-webhook/full-sync` | POST | Complete data synchronization |
| `/forest-data-webhook/fire-alert-webhook` | POST | External fire alert webhook |
| `/forest-data-webhook/deforestation-webhook` | POST | External deforestation webhook |
| `/forest-data-webhook/weather-update` | POST | Weather data refresh |

## 📊 Monitoring & Analytics

### Health Checks

Monitor your deployment with these endpoints:

```bash
# Check API proxy health
curl https://your-project.supabase.co/functions/v1/forest-api/health

# Check webhook service health  
curl https://your-project.supabase.co/functions/v1/forest-data-webhook/health
```

### Database Monitoring

Key tables to monitor:

```sql
-- Check API cache hit rates
SELECT key, hit_count, created_at 
FROM api_cache 
ORDER BY hit_count DESC;

-- Monitor webhook success rates
SELECT event_type, status, COUNT(*) 
FROM webhook_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type, status;

-- Track API usage
SELECT endpoint, COUNT(*), AVG(response_time) 
FROM api_usage 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

### Logging

Edge Functions automatically log to Supabase's logging dashboard. Monitor:

- Function invocation counts
- Error rates and types
- Response times
- Memory usage

## 🔒 Security

### Rate Limiting

Implement rate limiting in Edge Functions:

```typescript
// Example rate limiting logic
const clientId = req.headers.get('x-client-id') || 'anonymous';
const rateLimit = await checkRateLimit(clientId, 100); // 100 requests per hour

if (!rateLimit.allowed) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

### API Key Management

- Store API keys as Supabase secrets (encrypted)
- Rotate keys regularly
- Monitor usage and set quotas
- Use least-privilege access

### CORS Configuration

Edge Functions handle CORS automatically, but you can customize:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

## 🚀 Performance Optimization

### Caching Strategy

The system implements multi-layer caching:

1. **Browser Cache** (5-30 minutes)
2. **Database Cache** (15 minutes - 24 hours)
3. **CDN Cache** (for static assets)

### Data Update Frequency

Recommended update schedules:

- **Fire Alerts**: Every 15 minutes
- **Deforestation**: Every hour
- **Weather**: Every 10 minutes
- **Biodiversity**: Daily
- **Forest Regions**: Daily

### Database Optimization

```sql
-- Regular cache cleanup
SELECT cron.schedule(
  'cache-cleanup',
  '0 */6 * * *',  -- Every 6 hours
  'SELECT cleanup_expired_cache();'
);

-- Index optimization
REINDEX INDEX CONCURRENTLY idx_forest_alerts_timestamp;
ANALYZE forest_alerts;
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Edge Function Timeouts

```typescript
// Set appropriate timeouts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

const response = await fetch(url, {
  signal: controller.signal,
  // ... other options
});
```

#### 2. API Rate Limits

Monitor and implement exponential backoff:

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

#### 3. Database Connection Issues

Enable connection pooling and set proper timeouts:

```sql
-- Check connection counts
SELECT COUNT(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Set connection limits
ALTER DATABASE postgres SET max_connections = 100;
```

### Debug Mode

Enable debug logging:

```typescript
const DEBUG = Deno.env.get('DEBUG') === 'true';

if (DEBUG) {
  console.log('Debug info:', { url, method, headers });
}
```

## 📈 Scaling Considerations

### Horizontal Scaling

- Edge Functions auto-scale based on demand
- Database can be scaled vertically or with read replicas
- Consider caching layers (Redis) for high traffic

### Geographic Distribution

- Deploy Edge Functions to multiple regions
- Use CDN for static assets
- Consider regional database replicas

### Cost Optimization

- Monitor Edge Function invocations
- Optimize database queries
- Set up cost alerts
- Use appropriate caching strategies

## 📚 Additional Resources

- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [NASA FIRMS API Documentation](https://firms.modaps.eosdis.nasa.gov/api/)
- [Global Forest Watch API](https://production-api.globalforestwatch.org/documentation)
- [OpenWeather API Guide](https://openweathermap.org/api)
- [GBIF API Documentation](https://www.gbif.org/developer/summary)

## 🤝 Support

For deployment issues:

1. Check Supabase function logs
2. Monitor database performance
3. Review webhook logs
4. Test individual API endpoints
5. Check API key configurations

The deployment provides a robust, scalable platform that eliminates browser CORS limitations while providing real-time forest monitoring capabilities with professional-grade reliability and performance.