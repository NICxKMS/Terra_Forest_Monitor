import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Database, 
  CloudUpload, 
  Users, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Server,
  Satellite,
  TreePine
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export function BackendIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('');
  const [demoDataInitialized, setDemoDataInitialized] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [species, setSpecies] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [satelliteData, setSatelliteData] = useState<any>(null);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a3a679a6`;

  // API call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          ...options.headers,
        },
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API call failed:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Check API health
  const checkHealth = async () => {
    setIsLoading(true);
    const result = await apiCall('/health');
    if (result.success) {
      setIsConnected(true);
      setApiStatus('Connected to Global Forest Explorer API');
    } else {
      setIsConnected(false);
      setApiStatus(`Connection failed: ${result.error}`);
    }
    setIsLoading(false);
  };

  // Initialize demo data
  const initializeDemoData = async () => {
    setIsLoading(true);
    const result = await apiCall('/init-demo-data', { method: 'POST' });
    if (result.success) {
      setDemoDataInitialized(true);
      setApiStatus('Demo data initialized successfully');
      await loadData();
    } else {
      setApiStatus(`Failed to initialize demo data: ${result.error}`);
    }
    setIsLoading(false);
  };

  // Load all data
  const loadData = async () => {
    try {
      const [alertsRes, speciesRes, regionsRes, satelliteRes] = await Promise.all([
        apiCall('/alerts'),
        apiCall('/species'),
        apiCall('/regions'),
        apiCall('/satellite/latest')
      ]);

      if (alertsRes.success) setAlerts(alertsRes.data || []);
      if (speciesRes.success) setSpecies(speciesRes.data || []);
      if (regionsRes.success) setRegions(regionsRes.data || []);
      if (satelliteRes.success) setSatelliteData(satelliteRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Create new alert
  const createAlert = async () => {
    const alertData = {
      location: 'Test Region',
      type: 'deforestation',
      severity: 'medium',
      confidence: 85,
      description: 'Test alert from frontend',
      coordinates: { lat: -3.4653, lng: -62.2159 }
    };

    const result = await apiCall('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData)
    });

    if (result.success) {
      setApiStatus('Alert created successfully');
      await loadData();
    } else {
      setApiStatus(`Failed to create alert: ${result.error}`);
    }
  };

  // Run AI analysis
  const runAnalysis = async () => {
    const analysisData = {
      regionId: 'amazon-basin',
      analysisType: 'threat_assessment'
    };

    const result = await apiCall('/analyze', {
      method: 'POST',
      body: JSON.stringify(analysisData)
    });

    if (result.success) {
      setApiStatus(`AI Analysis completed: ${result.data.results.confidence.toFixed(1)}% confidence`);
    } else {
      setApiStatus(`Analysis failed: ${result.error}`);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <h2>Backend Integration Status</h2>
          </div>
          <Button onClick={checkHealth} disabled={isLoading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
        </div>

        <Alert className={isConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-center gap-2">
            {isConnected ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <AlertDescription>{apiStatus}</AlertDescription>
          </div>
        </Alert>

        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">API Server</p>
                <p>Online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <p>Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Real-time</p>
                <p>Active</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Demo Data Initialization */}
      {isConnected && !demoDataInitialized && (
        <Card className="p-6">
          <h3 className="mb-4">Initialize Demo Data</h3>
          <p className="text-muted-foreground mb-4">
            Set up sample forest regions, species data, and monitoring alerts to demonstrate the platform capabilities.
          </p>
          <Button onClick={initializeDemoData} disabled={isLoading}>
            <CloudUpload className="w-4 h-4 mr-2" />
            Initialize Demo Data
          </Button>
        </Card>
      )}

      {/* Data Overview */}
      {isConnected && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="species">Species</TabsTrigger>
            <TabsTrigger value="satellite">Satellite</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Alerts</p>
                    <p className="text-2xl">{alerts.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <TreePine className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Species Tracked</p>
                    <p className="text-2xl">{species.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Forest Regions</p>
                    <p className="text-2xl">{regions.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Satellite className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Satellites</p>
                    <p className="text-2xl">{satelliteData?.satellites?.filter(s => s.status === 'active').length || 0}</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="p-6">
              <h3 className="mb-4">Recent Alerts</h3>
              {alerts.length === 0 ? (
                <p className="text-muted-foreground">No alerts found. Initialize demo data to see examples.</p>
              ) : (
                <div className="space-y-3">
                  {alerts.slice(-5).map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{alert.location}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="species">
            <Card className="p-6">
              <h3 className="mb-4">Species Database</h3>
              {species.length === 0 ? (
                <p className="text-muted-foreground">No species data found. Initialize demo data to see examples.</p>
              ) : (
                <div className="space-y-3">
                  {species.map((sp, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{sp.name}</p>
                        <p className="text-sm text-muted-foreground italic">{sp.scientificName}</p>
                        <p className="text-sm">Population: {sp.population?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={sp.status === 'critically_endangered' ? 'destructive' : 'default'}>
                          {sp.status?.replace('_', ' ')}
                        </Badge>
                        <p className="text-sm mt-1">Confidence: {sp.confidence}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="satellite">
            <Card className="p-6">
              <h3 className="mb-4">Satellite Network Status</h3>
              {satelliteData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl text-green-600">{satelliteData.globalCoverage}%</p>
                      <p className="text-sm text-muted-foreground">Global Coverage</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl text-blue-600">{satelliteData.cloudCover}%</p>
                      <p className="text-sm text-muted-foreground">Cloud Cover</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl text-purple-600">{satelliteData.dataQuality}</p>
                      <p className="text-sm text-muted-foreground">Data Quality</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Active Satellites</h4>
                    {satelliteData.satellites?.map((sat, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="font-medium">{sat.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={sat.status === 'active' ? 'default' : 'secondary'}>
                            {sat.status}
                          </Badge>
                          <span className="text-sm">{sat.coverage}% coverage</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading satellite data...</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="mb-4">Data Management</h3>
                <div className="space-y-3">
                  <Button onClick={createAlert} className="w-full">
                    Create Test Alert
                  </Button>
                  <Button onClick={loadData} variant="outline" className="w-full">
                    Refresh All Data
                  </Button>
                  <Button onClick={initializeDemoData} variant="outline" className="w-full">
                    Reinitialize Demo Data
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="mb-4">AI Analysis</h3>
                <div className="space-y-3">
                  <Button onClick={runAnalysis} className="w-full">
                    Run Threat Analysis
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Execute AI-powered analysis on forest regions to detect potential threats and risks.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}