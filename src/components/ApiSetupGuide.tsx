import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ExternalLink, 
  Key, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  description: string;
  requiresKey: boolean;
  documentation: string;
  keySteps: string[];
  keyPlaceholder?: string;
  testEndpoint?: string;
}

interface ApiKey {
  id: string;
  value: string;
  isValid?: boolean;
  lastTested?: string;
}

interface ApiStatus {
  connected: boolean;
  testing: boolean;
  error?: string;
  lastTested?: string;
}

export function ApiSetupGuide() {
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKey>>({});
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiStatus>>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());

  const apiEndpoints: ApiEndpoint[] = [
    {
      id: 'nasa_firms',
      name: 'NASA FIRMS',
      url: 'https://firms.modaps.eosdis.nasa.gov/',
      description: 'Fire Information for Resource Management System',
      requiresKey: true,
      documentation: 'https://firms.modaps.eosdis.nasa.gov/api/',
      keySteps: [
        'Register for free NASA Earthdata account',
        'Request FIRMS API key',
        'Use key for fire detection data'
      ],
      keyPlaceholder: 'Enter your NASA FIRMS API key...',
      testEndpoint: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
    },
    {
      id: 'openweather',
      name: 'OpenWeather',
      url: 'https://openweathermap.org/api',
      description: 'Weather data including current, forecast, and historical',
      requiresKey: true,
      documentation: 'https://openweathermap.org/api',
      keySteps: [
        'Sign up for free account',
        'Generate API key in dashboard',
        '1,000 calls/day free tier'
      ],
      keyPlaceholder: 'Enter your OpenWeather API key...',
      testEndpoint: 'https://api.openweathermap.org/data/2.5/weather'
    },
    {
      id: 'sentinel_hub',
      name: 'Sentinel Hub',
      url: 'https://www.sentinel-hub.com/',
      description: 'Satellite imagery processing and analysis',
      requiresKey: true,
      documentation: 'https://docs.sentinel-hub.com/',
      keySteps: [
        'Register for free account',
        'Create OAuth2 credentials',
        '3,000 processing units/month free'
      ],
      keyPlaceholder: 'Enter your Sentinel Hub Client ID...'
    },
    {
      id: 'nasa_gibs',
      name: 'NASA GIBS',
      url: 'https://gibs.earthdata.nasa.gov/',
      description: 'Global Imagery Browse Services for satellite imagery',
      requiresKey: false,
      documentation: 'https://nasa-gibs.github.io/gibs-api-docs/',
      keySteps: [
        'No API key required for imagery tiles',
        'Use WMTS/WMS endpoints directly',
        'Rate limits apply per IP address'
      ]
    },
    {
      id: 'global_forest_watch',
      name: 'Global Forest Watch',
      url: 'https://www.globalforestwatch.org/',
      description: 'Forest monitoring and deforestation data',
      requiresKey: false,
      documentation: 'https://production-api.globalforestwatch.org/',
      keySteps: [
        'Public API with rate limits',
        'No registration required',
        'REST endpoints available'
      ]
    },
    {
      id: 'gbif',
      name: 'GBIF',
      url: 'https://www.gbif.org/',
      description: 'Global Biodiversity Information Facility',
      requiresKey: false,
      documentation: 'https://www.gbif.org/developer/summary',
      keySteps: [
        'Free public API',
        'No authentication required',
        'Rate limits apply'
      ]
    }
  ];

  // Load saved API keys on component mount
  useEffect(() => {
    loadApiKeys();
    testAllConnections();
  }, []);

  const loadApiKeys = () => {
    try {
      const savedKeys = localStorage.getItem('forest-explorer-api-keys');
      if (savedKeys) {
        setApiKeys(JSON.parse(savedKeys));
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const saveApiKeys = () => {
    try {
      localStorage.setItem('forest-explorer-api-keys', JSON.stringify(apiKeys));
      setUnsavedChanges(new Set());
      toast.success('API keys saved successfully');
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast.error('Failed to save API keys');
    }
  };

  const updateApiKey = (apiId: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [apiId]: {
        id: apiId,
        value: value,
        isValid: undefined,
        lastTested: undefined
      }
    }));
    setUnsavedChanges(prev => new Set([...prev, apiId]));
  };

  const deleteApiKey = (apiId: string) => {
    setApiKeys(prev => {
      const updated = { ...prev };
      delete updated[apiId];
      return updated;
    });
    setApiStatuses(prev => {
      const updated = { ...prev };
      delete updated[apiId];
      return updated;
    });
    setUnsavedChanges(prev => new Set([...prev, apiId]));
    toast.success('API key removed');
  };

  const testApiConnection = async (apiId: string) => {
    const endpoint = apiEndpoints.find(e => e.id === apiId);
    const apiKey = apiKeys[apiId];
    
    if (!endpoint || (!apiKey && endpoint.requiresKey)) {
      return;
    }

    setApiStatuses(prev => ({
      ...prev,
      [apiId]: { ...prev[apiId], testing: true, connected: false }
    }));

    try {
      let testUrl = '';
      let testOptions: RequestInit = { method: 'GET' };

      switch (apiId) {
        case 'openweather':
          testUrl = `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${apiKey.value}`;
          break;
        case 'nasa_firms':
          testUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey.value}/MODIS_NRT/world/1/2024-01-01`;
          break;
        case 'nasa_gibs':
          testUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';
          break;
        case 'global_forest_watch':
          testUrl = 'https://production-api.globalforestwatch.org/v1/forest-change/umd-loss-gain?lat=0&lng=0';
          break;
        case 'gbif':
          testUrl = 'https://api.gbif.org/v1/occurrence/search?limit=1';
          break;
        default:
          throw new Error('Test not implemented for this API');
      }

      const response = await fetch(testUrl, testOptions);
      const isConnected = response.ok || response.status === 401; // 401 might mean key is invalid but service is reachable

      setApiStatuses(prev => ({
        ...prev,
        [apiId]: {
          testing: false,
          connected: isConnected,
          error: isConnected ? undefined : `HTTP ${response.status}`,
          lastTested: new Date().toISOString()
        }
      }));

      if (apiKey) {
        setApiKeys(prev => ({
          ...prev,
          [apiId]: {
            ...prev[apiId],
            isValid: response.ok,
            lastTested: new Date().toISOString()
          }
        }));
      }

      toast.success(isConnected ? `${endpoint.name} connected successfully` : `${endpoint.name} connection failed`);
    } catch (error) {
      setApiStatuses(prev => ({
        ...prev,
        [apiId]: {
          testing: false,
          connected: false,
          error: error instanceof Error ? error.message : 'Connection failed',
          lastTested: new Date().toISOString()
        }
      }));
      toast.error(`Failed to test ${endpoint.name}`);
    }
  };

  const testAllConnections = async () => {
    for (const endpoint of apiEndpoints) {
      if (!endpoint.requiresKey || apiKeys[endpoint.id]) {
        await testApiConnection(endpoint.id);
      }
    }
  };

  const handleCopyKey = (keyName: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success('API key copied to clipboard');
  };

  const getConnectionStatus = (apiId: string) => {
    const status = apiStatuses[apiId];
    const endpoint = apiEndpoints.find(e => e.id === apiId);
    
    if (!endpoint) return null;
    
    if (endpoint.requiresKey && !apiKeys[apiId]) {
      return { icon: AlertCircle, color: 'text-yellow-500', text: 'API key required' };
    }
    
    if (status?.testing) {
      return { icon: RefreshCw, color: 'text-blue-500 animate-spin', text: 'Testing...' };
    }
    
    if (status?.connected) {
      return { icon: Wifi, color: 'text-green-500', text: 'Connected' };
    }
    
    if (status?.error) {
      return { icon: WifiOff, color: 'text-red-500', text: status.error };
    }
    
    return { icon: WifiOff, color: 'text-gray-400', text: 'Not tested' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure live data sources for comprehensive forest monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApiKeys(!showApiKeys)}
          >
            {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showApiKeys ? 'Hide' : 'Show'} Keys
          </Button>
          {unsavedChanges.size > 0 && (
            <Button onClick={saveApiKeys} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Add your API keys to switch from mock data to live data sources. All keys are stored locally in your browser.
          {unsavedChanges.size > 0 && (
            <span className="block mt-2 text-yellow-600">
              You have unsaved changes. Click "Save Changes" to apply them.
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage APIs</TabsTrigger>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3>API Configuration Status</h3>
            <Button variant="outline" onClick={testAllConnections}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Test All Connections
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {apiEndpoints.map((api) => {
              const status = getConnectionStatus(api.id);
              const hasKey = apiKeys[api.id]?.value;
              const hasUnsavedChanges = unsavedChanges.has(api.id);
              
              return (
                <Card key={api.id} className="p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="flex items-center gap-2">
                            {api.name}
                            {api.requiresKey ? (
                              <Badge variant="secondary">Requires API Key</Badge>
                            ) : (
                              <Badge variant="outline">Public API</Badge>
                            )}
                            {hasUnsavedChanges && (
                              <Badge variant="destructive" className="text-xs">Unsaved</Badge>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {api.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {status && (
                          <div className="flex items-center gap-2 text-sm">
                            <status.icon className={`w-4 h-4 ${status.color}`} />
                            <span className="text-muted-foreground">{status.text}</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testApiConnection(api.id)}
                          disabled={api.requiresKey && !hasKey}
                        >
                          <TestTube className="w-3 h-3 mr-1" />
                          Test
                        </Button>
                      </div>
                    </div>
                    
                    {api.requiresKey && (
                      <div className="space-y-2">
                        <Label htmlFor={`api-${api.id}`}>API Key</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`api-${api.id}`}
                            type={showApiKeys ? "text" : "password"}
                            placeholder={api.keyPlaceholder}
                            value={apiKeys[api.id]?.value || ''}
                            onChange={(e) => updateApiKey(api.id, e.target.value)}
                            className="flex-1"
                          />
                          {hasKey && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyKey(api.id, apiKeys[api.id].value)}
                              >
                                {copiedKey === api.id ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteApiKey(api.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                        {apiKeys[api.id]?.lastTested && (
                          <p className="text-xs text-muted-foreground">
                            Last tested: {new Date(apiKeys[api.id].lastTested!).toLocaleString()}
                            {apiKeys[api.id]?.isValid !== undefined && (
                              <span className={apiKeys[api.id]?.isValid ? 'text-green-600' : 'text-red-600'}>
                                {' '}• {apiKeys[api.id]?.isValid ? 'Valid' : 'Invalid'}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apiEndpoints.map((api, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="flex items-center gap-2">
                      {api.name}
                      {api.requiresKey ? (
                        <Badge variant="secondary">Requires API Key</Badge>
                      ) : (
                        <Badge variant="outline">Public API</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {api.description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    {api.keySteps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(api.url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Visit Site
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(api.documentation, '_blank')}
                    >
                      API Docs
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4">Integration Steps</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">1</span>
                  Obtain API Keys
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Sign up for the APIs that require authentication. Most offer generous free tiers for development.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">2</span>
                  Add API Keys
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Use the "Manage APIs" tab to add your API keys. Keys are stored securely in your browser.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">3</span>
                  Test Connections
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Verify that the APIs are working by testing each connection. Green status means live data is available.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">4</span>
                  Monitor Usage
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Keep track of your API usage to stay within rate limits and plan for scaling.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4">Data Sources Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4>Satellite Imagery</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• NASA GIBS (MODIS, VIIRS)</li>
                  <li>• Sentinel Hub (Sentinel-1/2)</li>
                  <li>• Landsat imagery</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4>Environmental Data</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• OpenWeather climate data</li>
                  <li>• NASA FIRMS fire detection</li>
                  <li>• Global Forest Watch</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4>Biodiversity</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• GBIF species occurrences</li>
                  <li>• Habitat quality metrics</li>
                  <li>• Conservation status</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4>Analysis</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time threat detection</li>
                  <li>• Historical trend analysis</li>
                  <li>• AI-powered predictions</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}