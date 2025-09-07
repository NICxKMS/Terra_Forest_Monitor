-- Forest Data Tables for Caching and Webhook Management

-- API Cache table for storing cached API responses
CREATE TABLE IF NOT EXISTS api_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  source TEXT DEFAULT 'unknown',
  hit_count INTEGER DEFAULT 0
);

-- Index for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(key);
CREATE INDEX IF NOT EXISTS idx_api_cache_created_at ON api_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at);

-- Forest Alerts table for storing processed alerts
CREATE TABLE IF NOT EXISTS forest_alerts (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fire', 'deforestation', 'biodiversity', 'weather')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence DECIMAL(5,2),
  description TEXT,
  coordinates JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for forest alerts
CREATE INDEX IF NOT EXISTS idx_forest_alerts_timestamp ON forest_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_forest_alerts_type ON forest_alerts(type);
CREATE INDEX IF NOT EXISTS idx_forest_alerts_severity ON forest_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_forest_alerts_location ON forest_alerts USING gin(to_tsvector('english', location));
CREATE INDEX IF NOT EXISTS idx_forest_alerts_coordinates ON forest_alerts USING gin(coordinates);

-- Webhook logs for tracking webhook events
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);

-- Update timestamps for tracking last update times
CREATE TABLE IF NOT EXISTS update_timestamps (
  update_type TEXT PRIMARY KEY,
  last_update TIMESTAMP WITH TIME ZONE NOT NULL,
  next_scheduled TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Forest regions data (enhanced with server-side processing)
CREATE TABLE IF NOT EXISTS forest_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  health_score DECIMAL(5,2),
  deforestation_rate DECIMAL(5,2),
  biodiversity_index DECIMAL(5,2),
  alert_level TEXT CHECK (alert_level IN ('low', 'medium', 'high', 'critical')),
  area BIGINT,
  forest_cover DECIMAL(5,2),
  fire_risk DECIMAL(5,2),
  temperature DECIMAL(5,2),
  precipitation DECIMAL(7,2),
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  source TEXT DEFAULT 'server'
);

-- Indexes for forest regions
CREATE INDEX IF NOT EXISTS idx_forest_regions_location ON forest_regions(lat, lng);
CREATE INDEX IF NOT EXISTS idx_forest_regions_alert_level ON forest_regions(alert_level);
CREATE INDEX IF NOT EXISTS idx_forest_regions_health_score ON forest_regions(health_score DESC);

-- Species data for biodiversity tracking
CREATE TABLE IF NOT EXISTS species_data (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  conservation_status TEXT,
  population BIGINT,
  trend DECIMAL(5,2),
  habitat TEXT,
  threat_level DECIMAL(5,2),
  confidence DECIMAL(5,2),
  last_seen TIMESTAMP WITH TIME ZONE,
  coordinates JSONB,
  metadata JSONB DEFAULT '{}',
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for species data
CREATE INDEX IF NOT EXISTS idx_species_data_conservation_status ON species_data(conservation_status);
CREATE INDEX IF NOT EXISTS idx_species_data_threat_level ON species_data(threat_level DESC);
CREATE INDEX IF NOT EXISTS idx_species_data_scientific_name ON species_data(scientific_name);

-- User profiles for authenticated access
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  organization TEXT,
  role TEXT,
  regions TEXT[] DEFAULT '{}',
  permissions TEXT[] DEFAULT '{}',
  api_quota INTEGER DEFAULT 1000,
  api_usage INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  data_size INTEGER,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for API usage
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);

-- Data quality metrics
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  threshold_min DECIMAL(10,4),
  threshold_max DECIMAL(10,4),
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create functions for automatic cache cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update forest alert timestamps
CREATE OR REPLACE FUNCTION update_forest_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for forest alerts
CREATE TRIGGER update_forest_alerts_updated_at
  BEFORE UPDATE ON forest_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_forest_alerts_timestamp();

-- Create function to increment cache hit count
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_key TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE api_cache 
  SET hit_count = hit_count + 1 
  WHERE key = cache_key;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for security
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE forest_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE forest_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to cache (for demo purposes)
CREATE POLICY "Public read access for api_cache" ON api_cache
  FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Service role full access for api_cache" ON api_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Allow public read access to forest alerts
CREATE POLICY "Public read access for forest_alerts" ON forest_alerts
  FOR SELECT USING (true);

-- Allow service role full access to forest alerts
CREATE POLICY "Service role full access for forest_alerts" ON forest_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Allow public read access to forest regions
CREATE POLICY "Public read access for forest_regions" ON forest_regions
  FOR SELECT USING (true);

-- Allow service role full access to forest regions
CREATE POLICY "Service role full access for forest_regions" ON forest_regions
  FOR ALL USING (auth.role() = 'service_role');

-- Allow public read access to species data
CREATE POLICY "Public read access for species_data" ON species_data
  FOR SELECT USING (true);

-- Allow service role full access to species data
CREATE POLICY "Service role full access for species_data" ON species_data
  FOR ALL USING (auth.role() = 'service_role');

-- User profile policies
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Insert initial update timestamps
INSERT INTO update_timestamps (update_type, last_update) VALUES
  ('fire-alerts', NOW() - INTERVAL '1 hour'),
  ('deforestation-alerts', NOW() - INTERVAL '2 hours'),
  ('weather-data', NOW() - INTERVAL '30 minutes'),
  ('biodiversity-data', NOW() - INTERVAL '12 hours'),
  ('forest-regions', NOW() - INTERVAL '24 hours')
ON CONFLICT (update_type) DO NOTHING;

-- Insert sample forest regions
INSERT INTO forest_regions (id, name, lat, lng, health_score, deforestation_rate, biodiversity_index, alert_level, area, forest_cover, fire_risk, temperature, precipitation) VALUES
  ('amazon', 'Amazon Basin', -3.4653, -62.2159, 75.2, 2.3, 94.1, 'high', 6700000, 83.5, 65.2, 26.5, 2300),
  ('congo', 'Congo Basin', -0.228, 15.8277, 82.1, 1.8, 87.3, 'medium', 3700000, 89.2, 45.1, 25.2, 1800),
  ('boreal', 'Boreal Forest', 64.2008, -153.4937, 88.5, 0.8, 76.4, 'low', 17000000, 94.1, 35.8, 2.1, 450),
  ('southeast_asia', 'Southeast Asian Rainforest', 1.3521, 103.8198, 68.9, 3.1, 91.2, 'critical', 2500000, 78.3, 72.4, 27.8, 2800),
  ('temperate', 'Temperate Forests', 45.0, -85.0, 85.3, 1.2, 82.1, 'low', 10000000, 88.7, 28.5, 15.2, 950),
  ('tropical_africa', 'Tropical African Forests', 5.0, 20.0, 79.4, 2.1, 89.5, 'medium', 4000000, 85.1, 58.3, 24.8, 1950)
ON CONFLICT (id) DO UPDATE SET
  health_score = EXCLUDED.health_score,
  deforestation_rate = EXCLUDED.deforestation_rate,
  biodiversity_index = EXCLUDED.biodiversity_index,
  alert_level = EXCLUDED.alert_level,
  forest_cover = EXCLUDED.forest_cover,
  fire_risk = EXCLUDED.fire_risk,
  temperature = EXCLUDED.temperature,
  precipitation = EXCLUDED.precipitation,
  last_update = NOW();

COMMENT ON TABLE api_cache IS 'Caches API responses to reduce external API calls and improve performance';
COMMENT ON TABLE forest_alerts IS 'Stores real-time forest monitoring alerts from various sources';
COMMENT ON TABLE webhook_logs IS 'Logs webhook events and processing results for debugging and monitoring';
COMMENT ON TABLE update_timestamps IS 'Tracks last update times for different data types to manage refresh schedules';
COMMENT ON TABLE forest_regions IS 'Enhanced forest region data with server-side processing and analytics';
COMMENT ON TABLE species_data IS 'Biodiversity and species tracking data from various conservation databases';
COMMENT ON TABLE user_profiles IS 'User profiles for authenticated access and API quota management';
COMMENT ON TABLE api_usage IS 'API usage tracking for analytics and quota management';
COMMENT ON TABLE data_quality_metrics IS 'Data quality metrics and monitoring for various data sources';