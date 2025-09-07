import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { 
  Settings, 
  X, 
  Bell, 
  Globe, 
  Shield, 
  Database,
  Key,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  ExternalLink
} from 'lucide-react';
import { apiConfigManager } from '../services/apiConfigManager';
import { toast } from 'sonner';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState({
    notifications: {
      fireAlerts: true,
      deforestationAlerts: true,
      biodiversityAlerts: false,
      weatherAlerts: true,
      emailNotifications: false,
      pushNotifications: true
    },
    display: {
      showSatelliteLayer: true,
      showAlertOverlay: true,
      autoRefresh: true,
      refreshInterval: 300,
      temperatureUnit: 'celsius',
      mapStyle: 'satellite'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [apiStatuses, setApiStatuses] = useState<Record<string, any>>({});
  const [isRefreshingApis, setIsRefreshingApis] = useState(false);
  const [noMock, setNoMock] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadApiStatuses();
      try {
        setNoMock(apiConfigManager.isNoMockEnabled());
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      apiConfigManager.setNoMock(noMock);
      if (typeof window !== 'undefined') {
        (window as any).__FOREST_NO_MOCK__ = noMock ? 1 : 0;
      }
      // Save settings to localStorage
      localStorage.setItem('forest-explorer-settings', JSON.stringify(settings));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      toast.success('Settings saved successfully');
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const loadApiStatuses = async () => {
    try {
      setIsRefreshingApis(true);
      apiConfigManager.refreshApiKeys();
      
      const services = ['openweather', 'nasa_firms', 'nasa_gibs', 'global_forest_watch', 'gbif', 'sentinel_hub'];
      const statuses: Record<string, any> = {};
      
      for (const service of services) {
        try {
          const result = await apiConfigManager.testApiConnection(service);
          statuses[service] = {
            ...result,
            configured: apiConfigManager.hasApiKey(service as any) || !['openweather', 'nasa_firms', 'sentinel_hub'].includes(service),
            lastTested: new Date().toISOString()
          };
        } catch (error) {
          statuses[service] = {
            success: false,
            error: 'Connection failed',
            configured: false,
            lastTested: new Date().toISOString()
          };
        }
      }
      
      setApiStatuses(statuses);
    } catch (error) {
      console.error('Error loading API statuses:', error);
      toast.error('Failed to load API statuses');
    } finally {
      setIsRefreshingApis(false);
    }
  };

  const refreshApiKeys = async () => {
    setIsRefreshingApis(true);
    apiConfigManager.refreshApiKeys();
    await loadApiStatuses();
    toast.success('API configuration refreshed');
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('apiKeysRefreshed'));
  };

  const openApiSetup = () => {
    onClose();
    // Switch to API setup tab
    const event = new CustomEvent('switchToTab', { detail: 'api-setup' });
    window.dispatchEvent(event);
  };

  const clearCache = () => {
    try {
      // Clear localStorage cache
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('forest-explorer-cache-') || key.includes('cache')) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="fixed right-4 top-16 w-[500px] max-h-[80vh] bg-card border rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <h3>Settings</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : saveStatus === 'success' ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                ) : saveStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="w-full grid grid-cols-4 m-4">
              <TabsTrigger value="notifications" className="gap-1">
                <Bell className="w-3 h-3" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="display" className="gap-1">
                <Globe className="w-3 h-3" />
                Display
              </TabsTrigger>
              <TabsTrigger value="apis" className="gap-1">
                <Key className="w-3 h-3" />
                APIs
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-1">
                <Shield className="w-3 h-3" />
                Privacy
              </TabsTrigger>
            </TabsList>

            <div className="p-4">
              <TabsContent value="notifications" className="space-y-4">
                <div>
                  <h4 className="mb-3">Notification Preferences</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="fire-alerts">Fire Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified about fire detections</p>
                      </div>
                      <Switch
                        id="fire-alerts"
                        checked={settings.notifications.fireAlerts}
                        onCheckedChange={(checked) => 
                          handleSettingChange('notifications', 'fireAlerts', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="deforestation-alerts">Deforestation Alerts</Label>
                        <p className="text-sm text-muted-foreground">Forest loss notifications</p>
                      </div>
                      <Switch
                        id="deforestation-alerts"
                        checked={settings.notifications.deforestationAlerts}
                        onCheckedChange={(checked) => 
                          handleSettingChange('notifications', 'deforestationAlerts', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="biodiversity-alerts">Biodiversity Alerts</Label>
                        <p className="text-sm text-muted-foreground">Species monitoring updates</p>
                      </div>
                      <Switch
                        id="biodiversity-alerts"
                        checked={settings.notifications.biodiversityAlerts}
                        onCheckedChange={(checked) => 
                          handleSettingChange('notifications', 'biodiversityAlerts', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="weather-alerts">Weather Alerts</Label>
                        <p className="text-sm text-muted-foreground">Extreme weather conditions</p>
                      </div>
                      <Switch
                        id="weather-alerts"
                        checked={settings.notifications.weatherAlerts}
                        onCheckedChange={(checked) => 
                          handleSettingChange('notifications', 'weatherAlerts', checked)
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={settings.notifications.emailNotifications}
                        onCheckedChange={(checked) => 
                          handleSettingChange('notifications', 'emailNotifications', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="display" className="space-y-4">
                <div>
                  <h4 className="mb-3">Display Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="satellite-layer">Satellite Layer</Label>
                        <p className="text-sm text-muted-foreground">Show satellite imagery</p>
                      </div>
                      <Switch
                        id="satellite-layer"
                        checked={settings.display.showSatelliteLayer}
                        onCheckedChange={(checked) => 
                          handleSettingChange('display', 'showSatelliteLayer', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="no-mock">Real data only</Label>
                        <p className="text-sm text-muted-foreground">Disable all mock fallbacks</p>
                      </div>
                      <Switch
                        id="no-mock"
                        checked={noMock}
                        onCheckedChange={(checked) => setNoMock(Boolean(checked))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="alert-overlay">Alert Overlay</Label>
                        <p className="text-sm text-muted-foreground">Show alert markers on map</p>
                      </div>
                      <Switch
                        id="alert-overlay"
                        checked={settings.display.showAlertOverlay}
                        onCheckedChange={(checked) => 
                          handleSettingChange('display', 'showAlertOverlay', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-refresh">Auto Refresh</Label>
                        <p className="text-sm text-muted-foreground">Automatically update data</p>
                      </div>
                      <Switch
                        id="auto-refresh"
                        checked={settings.display.autoRefresh}
                        onCheckedChange={(checked) => 
                          handleSettingChange('display', 'autoRefresh', checked)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                      <Input
                        id="refresh-interval"
                        type="number"
                        value={settings.display.refreshInterval}
                        onChange={(e) => 
                          handleSettingChange('display', 'refreshInterval', parseInt(e.target.value))
                        }
                        min={60}
                        max={3600}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="apis" className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4>API Configuration</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={refreshApiKeys} disabled={isRefreshingApis}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingApis ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button variant="outline" size="sm" onClick={openApiSetup}>
                        <Key className="w-4 h-4 mr-2" />
                        Manage Keys
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm">
                        {apiConfigManager.shouldUseLiveData() 
                          ? '🟢 Live data mode - Using real API data where available'
                          : '🟡 Mock data mode - Add API keys to enable live data'
                        }
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5>Service Status</h5>
                        <span className="text-xs text-muted-foreground">
                          {Object.values(apiStatuses).filter((status: any) => status.success).length}/
                          {Object.keys(apiStatuses).length} Connected
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(apiStatuses).map(([service, status]: [string, any]) => {
                          const serviceNames: Record<string, string> = {
                            openweather: 'OpenWeather API',
                            nasa_firms: 'NASA FIRMS',
                            nasa_gibs: 'NASA GIBS',
                            global_forest_watch: 'Global Forest Watch',
                            gbif: 'GBIF Biodiversity',
                            sentinel_hub: 'Sentinel Hub'
                          };
                          
                          const requiresKey = ['openweather', 'nasa_firms', 'sentinel_hub'].includes(service);
                          
                          return (
                            <div key={service} className="flex items-center justify-between p-2 bg-background/50 rounded">
                              <div className="flex items-center gap-2">
                                {status.success ? (
                                  <Wifi className="w-4 h-4 text-green-500" />
                                ) : (
                                  <WifiOff className="w-4 h-4 text-red-500" />
                                )}
                                <div>
                                  <span className="text-sm font-medium">{serviceNames[service]}</span>
                                  {requiresKey && !status.configured && (
                                    <p className="text-xs text-muted-foreground">API key required</p>
                                  )}
                                  {status.error && (
                                    <p className="text-xs text-red-500">{status.error}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {requiresKey && (
                                  <Badge variant={status.configured ? "default" : "secondary"} className="text-xs">
                                    {status.configured ? 'Configured' : 'No Key'}
                                  </Badge>
                                )}
                                <Badge 
                                  variant={status.success ? "default" : "destructive"} 
                                  className="gap-1 text-xs"
                                >
                                  {status.success ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                  {status.success ? 'Online' : 'Offline'}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {Object.keys(apiStatuses).length === 0 && (
                        <div className="text-center p-4 text-muted-foreground">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                          <p className="text-sm">Loading API status...</p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <Key className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Need API Keys?
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Click "Manage Keys" to add your API keys and enable live data from satellites, weather services, and biodiversity databases.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-4">
                <div>
                  <h4 className="mb-3">Privacy & Security</h4>
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm">
                        Your data is processed locally and stored securely. Location data is used only for forest monitoring purposes.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full">
                        <Database className="w-4 h-4 mr-2" />
                        Export Data
                      </Button>
                      <Button variant="outline" className="w-full" onClick={clearCache}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Clear Cache
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}