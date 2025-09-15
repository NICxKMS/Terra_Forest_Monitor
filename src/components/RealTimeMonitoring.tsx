import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Satellite, Radio, Activity, AlertCircle, CheckCircle2, Clock, MapPin, Zap } from 'lucide-react';
import { mockDataService } from '../services/mockDataService';
import { enhancedForestDataService } from '../services/enhancedForestDataService';
import { serverSideDataService } from '../services/serverSideDataService';
import { apiConfigManager } from '../services/apiConfigManager';

interface AlertData {
  id: string;
  timestamp: string;
  location: string;
  type: 'deforestation' | 'fire' | 'illegal_logging' | 'disease' | 'biodiversity_threat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  coordinates: { lat: number; lng: number };
}

interface SatelliteData {
  timestamp: string;
  coverage: number;
  resolution: number;
  cloudCover: number;
}

const mockAlerts: AlertData[] = [
  {
    id: '1',
    timestamp: '2024-09-06 14:23:15',
    location: 'Amazon Basin, Brazil',
    type: 'deforestation',
    severity: 'critical',
    confidence: 94,
    description: 'Large-scale clearing detected in protected area',
    coordinates: { lat: -3.4653, lng: -62.2159 }
  },
  {
    id: '2',
    timestamp: '2024-09-06 13:45:32',
    location: 'Borneo, Indonesia',
    type: 'illegal_logging',
    severity: 'high',
    confidence: 87,
    description: 'Unauthorized logging activity in conservation zone',
    coordinates: { lat: 0.7893, lng: 113.9213 }
  },
  {
    id: '3',
    timestamp: '2024-09-06 12:10:08',
    location: 'Congo Basin, DRC',
    type: 'fire',
    severity: 'medium',
    confidence: 76,
    description: 'Multiple fire hotspots detected',
    coordinates: { lat: -0.228, lng: 15.8277 }
  },
  {
    id: '4',
    timestamp: '2024-09-06 11:33:21',
    location: 'Boreal Forest, Canada',
    type: 'disease',
    severity: 'medium',
    confidence: 82,
    description: 'Tree disease outbreak spreading',
    coordinates: { lat: 64.2008, lng: -153.4937 }
  },
  {
    id: '5',
    timestamp: '2024-09-06 10:15:44',
    location: 'Southeast Asia',
    type: 'biodiversity_threat',
    severity: 'low',
    confidence: 69,
    description: 'Habitat fragmentation detected',
    coordinates: { lat: 1.3521, lng: 103.8198 }
  }
];

const realTimeData = [
  { time: '14:20', forestHealth: 73, alerts: 5, coverage: 91 },
  { time: '14:21', forestHealth: 73, alerts: 7, coverage: 91 },
  { time: '14:22', forestHealth: 72, alerts: 8, coverage: 90 },
  { time: '14:23', forestHealth: 72, alerts: 12, coverage: 90 },
  { time: '14:24', forestHealth: 71, alerts: 15, coverage: 89 },
  { time: '14:25', forestHealth: 71, alerts: 17, coverage: 89 },
];

const satelliteFeeds: SatelliteData[] = [
  { timestamp: '14:25:32', coverage: 89, resolution: 10, cloudCover: 15 },
  { timestamp: '14:24:18', coverage: 91, resolution: 10, cloudCover: 12 },
  { timestamp: '14:23:05', coverage: 90, resolution: 10, cloudCover: 18 },
];

export function RealTimeMonitoring() {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [satelliteData, setSatelliteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const liveOnly = apiConfigManager.isNoMockEnabled();
        // Always try live first
        let alertsData: any[] = [];
        try {
          alertsData = await enhancedForestDataService.getForestAlerts();
        } catch (e) {
          if (liveOnly) throw e;
          alertsData = mockDataService.getForestAlerts();
        }
        
        // Transform alerts to match component interface
        const transformedAlerts: AlertData[] = alertsData.map(alert => ({
          id: alert.id,
          timestamp: new Date(alert.timestamp).toLocaleString(),
          location: alert.location,
          type: alert.type as any,
          severity: alert.severity,
          confidence: alert.confidence,
          description: alert.description,
          coordinates: alert.coordinates
        }));
        
        setAlerts(transformedAlerts);
      } catch (error) {
        console.log('Error fetching alerts:', error);
        if (apiConfigManager.isNoMockEnabled()) setAlerts([]);
        else setAlerts(mockAlerts);
      }
    };

    const fetchSatelliteData = async () => {
      try {
        const liveOnly = apiConfigManager.isNoMockEnabled();
        try {
          const currentData = await serverSideDataService.getSatelliteData(0, 0);
          setSatelliteData({ feeds: [], realTimeData: [], currentData });
        } catch (e) {
          if (liveOnly) throw e;
          const satelliteDataResponse = mockDataService.getSatelliteData();
          setSatelliteData({ 
            feeds: satelliteFeeds, 
            realTimeData,
            currentData: satelliteDataResponse 
          });
        }
      } catch (error) {
        console.log('Error fetching satellite data:', error);
        if (apiConfigManager.isNoMockEnabled()) setSatelliteData({ feeds: [], realTimeData: [] });
        else setSatelliteData({ feeds: satelliteFeeds, realTimeData });
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    fetchSatelliteData();

    if (isLive) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
        fetchAlerts();
        fetchSatelliteData();
      }, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'deforestation': return '🪓';
      case 'fire': return '🔥';
      case 'illegal_logging': return '🪚';
      case 'disease': return '🦠';
      case 'biodiversity_threat': return '🦎';
      default: return '⚠️';
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center">
            <Radio className="w-6 h-6 mr-2 text-green-500" />
            Real-Time Forest Monitoring
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm">{isLive ? 'LIVE' : 'OFFLINE'}</span>
            </div>
            <Button
              variant={isLive ? "destructive" : "default"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? 'Stop' : 'Start'} Monitoring
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Satellite className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Satellites Active</p>
              <p className="text-xl">
                {loading ? '...' : `${satelliteData?.activeSatellites || 12}/${satelliteData?.totalSatellites || 15}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Data Streams</p>
              <p className="text-xl">{loading ? '...' : satelliteData?.dataStreams || 847}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Last Update</p>
              <p className="text-sm">{lastUpdate.toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Processing Speed</p>
              <p className="text-xl">{loading ? '...' : satelliteData?.processingSpeed || '2.3s'}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Data Feed */}
        <Card className="p-6">
          <h3 className="flex items-center mb-4">
            <Activity className="w-5 h-5 mr-2" />
            Live Data Feed
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={realTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="forestHealth" stroke="#22c55e" strokeWidth={2} name="Forest Health %" />
              <Line type="monotone" dataKey="alerts" stroke="#dc2626" strokeWidth={2} name="Active Alerts" />
              <Line type="monotone" dataKey="coverage" stroke="#3b82f6" strokeWidth={2} name="Satellite Coverage %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Satellite Status */}
        <Card className="p-6">
          <h3 className="flex items-center mb-4">
            <Satellite className="w-5 h-5 mr-2" />
            Satellite Feeds
          </h3>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading satellite data...</div>
            ) : (
              satelliteData?.feeds?.map((feed: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {feed.status === 'active' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm">{feed.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(feed.lastUpdate).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Coverage: {feed.coverage}%</p>
                    <p className="text-xs text-muted-foreground">Resolution: {feed.resolution}m</p>
                  </div>
                </div>
              )) || satelliteFeeds.map((feed, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm">Sentinel-{index + 1}</p>
                      <p className="text-xs text-muted-foreground">{feed.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Coverage: {feed.coverage}%</p>
                    <p className="text-xs text-muted-foreground">Resolution: {feed.resolution}m</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card className="p-6">
        <h3 className="flex items-center mb-4">
          <AlertCircle className="w-5 h-5 mr-2" />
          Active Alerts
          <Badge variant="destructive" className="ml-2">{alerts.length > 0 ? alerts.length : mockAlerts.length}</Badge>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(alerts.length > 0 ? alerts : mockAlerts).map((alert) => (
            <Alert 
              key={alert.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedAlert?.id === alert.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getAlertIcon(alert.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{alert.confidence}% confident</span>
                    </div>
                    <AlertDescription className="text-sm">
                      <p className="font-medium">{alert.type.replace('_', ' ').toUpperCase()}</p>
                      <p>{alert.description}</p>
                    </AlertDescription>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{alert.location}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                  </div>
                </div>
              </div>
              <Progress value={alert.confidence} className="mt-3 h-2" />
            </Alert>
          ))}
        </div>
      </Card>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <Card className="p-6 border-2 border-primary">
          <div className="flex items-center justify-between mb-4">
            <h3>Alert Details</h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>
              Close
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Alert Type</label>
                <p className="flex items-center gap-2">
                  <span className="text-lg">{getAlertIcon(selectedAlert.type)}</span>
                  {selectedAlert.type.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Badge variant={getSeverityColor(selectedAlert.severity)} className="block w-fit mt-1">
                  {selectedAlert.severity.toUpperCase()}
                </Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium">AI Confidence</label>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={selectedAlert.confidence} className="flex-1" />
                  <span className="text-sm">{selectedAlert.confidence}%</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Location</label>
                <p className="flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {selectedAlert.location}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedAlert.coordinates.lat.toFixed(4)}, {selectedAlert.coordinates.lng.toFixed(4)}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="mt-1">{selectedAlert.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Timestamp</label>
                <p className="mt-1">{selectedAlert.timestamp}</p>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  View on Map
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}