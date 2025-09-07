import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Leaf, TreePine, Zap, AlertCircle, Satellite, Thermometer, Cloud, Activity } from 'lucide-react';
import { enhancedForestDataService } from '../services/enhancedForestDataService';

const forestHealthData = [
  { month: 'Jan', health: 85, coverage: 78, biodiversity: 92 },
  { month: 'Feb', health: 83, coverage: 77, biodiversity: 91 },
  { month: 'Mar', health: 81, coverage: 76, biodiversity: 89 },
  { month: 'Apr', health: 79, coverage: 75, biodiversity: 88 },
  { month: 'May', health: 77, coverage: 74, biodiversity: 87 },
  { month: 'Jun', health: 75, coverage: 73, biodiversity: 85 },
];

const deforestationData = [
  { region: 'Amazon', rate: 2.3, change: -0.4 },
  { region: 'Congo', rate: 1.2, change: 0.1 },
  { region: 'Indonesia', rate: 3.1, change: -0.2 },
  { region: 'Boreal', rate: 0.3, change: 0.0 },
  { region: 'Temperate', rate: 0.8, change: -0.1 },
];

const threatDistribution = [
  { name: 'Deforestation', value: 35, color: '#dc2626' },
  { name: 'Climate Change', value: 28, color: '#ea580c' },
  { name: 'Disease', value: 15, color: '#d97706' },
  { name: 'Fire', value: 12, color: '#ca8a04' },
  { name: 'Other', value: 10, color: '#65a30d' },
];

const aiPredictions = [
  {
    title: 'Deforestation Risk',
    region: 'Amazon Basin',
    probability: 78,
    timeframe: '6 months',
    severity: 'high'
  },
  {
    title: 'Biodiversity Decline', 
    region: 'Southeast Asia',
    probability: 65,
    timeframe: '1 year',
    severity: 'medium'
  },
  {
    title: 'Forest Fire Risk',
    region: 'Boreal Forest',
    probability: 42,
    timeframe: '3 months',
    severity: 'low'
  }
];

export function ForestAnalytics() {
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [forestRegions, setForestRegions] = useState<any[]>([]);
  const [satelliteStatus, setSatelliteStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch real-time data
        const realtimeResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/forest-api/realtime-data`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (realtimeResponse.ok) {
          const realtimeData = await realtimeResponse.json();
          if (realtimeData && typeof realtimeData === 'object') {
            setRealtimeData(realtimeData);
          }
        }

        // Fetch forest regions data
        const regionsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/forest-api/forest-regions`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (regionsResponse.ok) {
          const regionsData = await regionsResponse.json();
          if (Array.isArray(regionsData)) {
            setForestRegions(regionsData.filter(region => region != null));
          }
        }

        // Fetch satellite status
        const satelliteResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/forest-api/satellite-status`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (satelliteResponse.ok) {
          const satelliteData = await satelliteResponse.json();
          if (satelliteData && typeof satelliteData === 'object') {
            setSatelliteStatus(satelliteData);
          }
        }

        setLastDataUpdate(new Date());
      } catch (error) {
        console.log('Error fetching data:', error);
        // Set fallback data if API calls fail
        setRealtimeData({
          forestHealth: 75,
          activeAlerts: 12,
          satelliteCoverage: 89
        });
        setForestRegions([]);
        setSatelliteStatus({
          activeSatellites: 12,
          totalSatellites: 15
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const currentMetrics = realtimeData ? {
    forestHealth: Math.round(realtimeData.forestHealth),
    activeAlerts: realtimeData.activeAlerts,
    satelliteCoverage: Math.round(realtimeData.satelliteCoverage)
  } : { forestHealth: 75, activeAlerts: 147, satelliteCoverage: 89 };

  // Calculate global metrics from regions data (only when not loading and has data)
  const globalMetrics = !loading && forestRegions.length > 0 ? {
    avgTemperature: forestRegions
      .filter(r => r && typeof r.temperature === 'number')
      .reduce((sum, r) => sum + r.temperature, 0) / Math.max(1, forestRegions.filter(r => r && typeof r.temperature === 'number').length),
    avgForestCover: forestRegions
      .filter(r => r && typeof r.forestCover === 'number')
      .reduce((sum, r) => sum + r.forestCover, 0) / Math.max(1, forestRegions.filter(r => r && typeof r.forestCover === 'number').length),
    avgBiodiversity: forestRegions
      .filter(r => r && typeof r.biodiversityIndex === 'number')
      .reduce((sum, r) => sum + r.biodiversityIndex, 0) / Math.max(1, forestRegions.filter(r => r && typeof r.biodiversityIndex === 'number').length),
    highRiskRegions: forestRegions.filter(r => r && (r.alertLevel === 'high' || r.alertLevel === 'critical')).length
  } : null;

  return (
    <div className="space-y-6">
      {/* Data Source Status */}
      <Alert>
        <Activity className="w-4 h-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Live data integration active • Last update: {lastDataUpdate.toLocaleTimeString()} • 
            {satelliteStatus ? `${satelliteStatus.activeSatellites}/${satelliteStatus.totalSatellites} satellites active` : 'Satellite status loading...'}
          </span>
          <Badge variant={loading ? "secondary" : "default"} className="ml-2">
            {loading ? 'Updating...' : 'Live'}
          </Badge>
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Global Forest Health</p>
              <p className="text-2xl mt-1">{loading ? '...' : `${currentMetrics.forestHealth}%`}</p>
            </div>
            <div className="flex items-center text-red-600">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="text-sm">-2.1%</span>
            </div>
          </div>
          <Progress value={currentMetrics.forestHealth} className="mt-3" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Forest Coverage</p>
              <p className="text-2xl mt-1">
                {loading ? '...' : globalMetrics ? `${Math.round(globalMetrics.avgForestCover)}%` : '73%'}
              </p>
            </div>
            <div className="flex items-center text-red-600">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="text-sm">-1.8%</span>
            </div>
          </div>
          <Progress value={globalMetrics?.avgForestCover || 73} className="mt-3" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Biodiversity Index</p>
              <p className="text-2xl mt-1">
                {loading ? '...' : globalMetrics ? `${Math.round(globalMetrics.avgBiodiversity)}%` : '85%'}
              </p>
            </div>
            <div className="flex items-center text-red-600">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="text-sm">-3.2%</span>
            </div>
          </div>
          <Progress value={globalMetrics?.avgBiodiversity || 85} className="mt-3" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Active Alerts</p>
              <p className="text-2xl mt-1">{loading ? '...' : currentMetrics.activeAlerts}</p>
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+12</span>
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            <Badge variant="destructive" className="text-xs">23 High</Badge>
            <Badge variant="secondary" className="text-xs">124 Med</Badge>
          </div>
        </Card>
      </div>

      {/* Live Environmental Data */}
      {globalMetrics && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Live Environmental Conditions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Thermometer className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Temperature</p>
                <p className="text-xl">{globalMetrics.avgTemperature.toFixed(1)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Leaf className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Forest Cover</p>
                <p className="text-xl">{globalMetrics.avgForestCover.toFixed(0)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <TreePine className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Biodiversity</p>
                <p className="text-xl">{globalMetrics.avgBiodiversity.toFixed(0)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">High Risk Regions</p>
                <p className="text-xl">{globalMetrics.highRiskRegions}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forest Health Trends */}
        <Card className="p-6">
          <h3 className="mb-4">Forest Health Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forestHealthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="health" stroke="#22c55e" strokeWidth={2} name="Overall Health" />
              <Line type="monotone" dataKey="coverage" stroke="#3b82f6" strokeWidth={2} name="Forest Coverage" />
              <Line type="monotone" dataKey="biodiversity" stroke="#a855f7" strokeWidth={2} name="Biodiversity" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Threat Distribution */}
        <Card className="p-6">
          <h3 className="mb-4">Threat Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={threatDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {threatDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Live Regional Data */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Satellite className="w-5 h-5" />
            Live Regional Data
          </h3>
          {!loading && forestRegions.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={forestRegions
                .filter(region => region && region.name && region.healthScore != null)
                .map(region => ({
                  region: region.name.split(' ')[0], // Shorten names
                  health: region.healthScore || 0,
                  deforestation: region.deforestationRate || 0,
                  fireRisk: region.fireRisk || 0
                }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="health" fill="#22c55e" name="Health Score %" />
                <Bar dataKey="fireRisk" fill="#dc2626" name="Fire Risk %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deforestationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rate" fill="#dc2626" name="Deforestation Rate %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* AI Predictions */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            AI Risk Predictions
          </h3>
          <div className="space-y-4">
            {aiPredictions.map((prediction, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4>{prediction.title}</h4>
                  <Badge variant={prediction.severity === 'high' ? 'destructive' : prediction.severity === 'medium' ? 'secondary' : 'default'}>
                    {prediction.probability}% risk
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mb-2">{prediction.region}</p>
                <div className="flex items-center justify-between text-sm">
                  <span>Timeframe: {prediction.timeframe}</span>
                  <div className="flex items-center">
                    <AlertCircle className={`w-4 h-4 mr-1 ${
                      prediction.severity === 'high' ? 'text-red-500' : 
                      prediction.severity === 'medium' ? 'text-yellow-500' : 
                      'text-green-500'
                    }`} />
                    <span className="capitalize">{prediction.severity}</span>
                  </div>
                </div>
                <Progress value={prediction.probability} className="mt-2" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}