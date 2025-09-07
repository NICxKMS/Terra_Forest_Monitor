import React, { useState, useEffect } from 'react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { InteractiveMap } from './components/InteractiveMap';
import { ForestAnalytics } from './components/ForestAnalytics';
import { BiodiversityTracker } from './components/BiodiversityTracker';
import { HistoricalAnalysis } from './components/HistoricalAnalysis';
import { RealTimeMonitoring } from './components/RealTimeMonitoring';
import { AuthModal } from './components/AuthModal';
import { ApiSetupGuide } from './components/ApiSetupGuide';
import { NotificationsPanel } from './components/NotificationsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { BrowserLimitationsInfo } from './components/BrowserLimitationsInfo';
import { 
  Satellite, 
  BarChart3, 
  TreePine, 
  Clock, 
  Radio, 
  Bell, 
  Settings, 
  Globe,
  TrendingDown,
  AlertTriangle,
  Leaf,
  LogOut,
  User
} from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { supabase } from './utils/supabase/client';
import { enhancedForestDataService } from './services/enhancedForestDataService';
import { apiConfigManager } from './services/apiConfigManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiStatus, setApiStatus] = useState<{ connected: number; total: number; details: Record<string, any> }>({
    connected: 0,
    total: 0,
    details: {}
  });
  const [showBrowserInfo, setShowBrowserInfo] = useState(false);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.log('Session check error:', error);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.access_token);
        }
      } catch (error) {
        console.log('Error checking session:', error);
      }
    };
    
    checkSession();
    loadNotifications();
    checkApiStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          fetchUserProfile(session.access_token);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        }
      }
    );

    // Listen for storage changes (API keys)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'forest-explorer-api-keys') {
        apiConfigManager.refreshApiKeys();
        checkApiStatus();
        loadNotifications(); // Refresh notifications to get live data
      }
    };

    // Listen for custom events
    const handleApiKeysRefreshed = () => {
      apiConfigManager.refreshApiKeys();
      checkApiStatus();
      loadNotifications();
    };

    const handleSwitchToTab = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('apiKeysRefreshed', handleApiKeysRefreshed as EventListener);
    window.addEventListener('switchToTab', handleSwitchToTab as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('apiKeysRefreshed', handleApiKeysRefreshed as EventListener);
      window.removeEventListener('switchToTab', handleSwitchToTab as EventListener);
    };
  }, []);

  const fetchUserProfile = async (accessToken: string) => {
    try {
      // Add timeout for Edge Function calls
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000);
      });

      const profilePromise = supabase.functions.invoke('forest-api/user-profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
      
      if (!error && data && data.success) {
        setUserProfile(data.data);
      } else {
        throw new Error(error?.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.log('ℹ️ Server-side user profile not available, using mock profile');
      // Use mock profile for demo
      setUserProfile({
        name: user?.email?.split('@')[0] || 'Forest Researcher',
        organization: 'Conservation Institute',
        role: 'Senior Researcher',
        source: 'mock'
      });
    }
  };

  const loadNotifications = async () => {
    try {
      // Use enhanced forest data service which switches between mock and live data
      const alerts = await enhancedForestDataService.getForestAlerts();
      const notifications = alerts.map(alert => ({
        id: alert.id,
        title: alert.description,
        description: `${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} alert in ${alert.location}`,
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp,
        location: alert.location,
        read: Math.random() > 0.7 // Some notifications are read
      }));
      
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.log('Error loading notifications:', error);
    }
  };

  const checkApiStatus = async () => {
    try {
      const configuredApis = apiConfigManager.getConfiguredApis();
      const totalApis = 6; // Total number of APIs we support
      const connectedApis = configuredApis.length;
      
      // Test connections for configured APIs
      const statusDetails: Record<string, any> = {};
      for (const api of configuredApis) {
        try {
          const result = await apiConfigManager.testApiConnection(api);
          statusDetails[api] = result;
        } catch (error) {
          statusDetails[api] = { success: false, error: 'Connection failed' };
        }
      }
      
      // Add status for APIs that don't require keys
      const publicApis = ['nasa_gibs', 'global_forest_watch', 'gbif'];
      for (const api of publicApis) {
        if (!statusDetails[api]) {
          try {
            const result = await apiConfigManager.testApiConnection(api);
            statusDetails[api] = result;
            if (result.success) {
              // Count public APIs as connected if they work
              statusDetails[api].configured = true;
            }
          } catch (error) {
            statusDetails[api] = { success: false, error: 'Connection failed' };
          }
        }
      }
      
      const actualConnected = Object.values(statusDetails).filter((status: any) => status.success).length;
      
      setApiStatus({
        connected: actualConnected,
        total: totalApis,
        details: statusDetails
      });
    } catch (error) {
      console.error('Error checking API status:', error);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const handleAuth = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    if (authenticatedUser) {
      // Get session to fetch user profile
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          fetchUserProfile(session.access_token);
        }
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl">Global Forest Explorer</h1>
                  <p className="text-sm text-muted-foreground">AI-Powered Forest Monitoring Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  apiStatus.connected > 3 ? 'bg-green-500' : 
                  apiStatus.connected > 0 ? 'bg-yellow-500' : 'bg-orange-500'
                }`} />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-sm text-muted-foreground hover:text-foreground p-1"
                  onClick={() => setShowBrowserInfo(true)}
                >
                  Browser Mode • {apiStatus.connected}/${apiStatus.total} APIs Available • Mock Data
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="relative"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs h-5 w-5 flex items-center justify-center p-0">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{userProfile?.name || user.email}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <AuthModal onAuth={handleAuth} />
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-b">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="gap-1">
                  <Radio className="w-3 h-3" />
                  Real-time Monitoring
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <TreePine className="w-3 h-3" />
                  AI Analytics
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Satellite className="w-3 h-3" />
                  Live APIs
                </Badge>
              </div>
              <h2 className="text-3xl mb-4">
                Advanced Forest Monitoring & Conservation
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Combining real-time satellite data, AI analytics, and interactive visualization to monitor and analyze the world's forests. Empowering conservationists with powerful tools for forest preservation.
              </p>
              <div className="flex items-center gap-4">
                <Button size="lg" onClick={() => setActiveTab('monitoring')}>
                  <Satellite className="w-5 h-5 mr-2" />
                  Start Monitoring
                </Button>
                <Button variant="outline" size="lg" onClick={() => setActiveTab('map')}>
                  <Globe className="w-5 h-5 mr-2" />
                  Explore Map
                </Button>
              </div>
            </div>
            <div className="relative">
              <Card className="p-6 bg-card/50 backdrop-blur-sm">
                <div className="aspect-video relative rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1639461426283-1ef93a8327c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYXRlbGxpdGUlMjBlYXJ0aCUyMGZvcmVzdCUyMG1vbml0b3Jpbmd8ZW58MXx8fHwxNzU3MjAyNjI0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Global forest monitoring from space"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-sm opacity-90">Global Forest Coverage</p>
                    <p className="text-2xl">67.2%</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="border-b bg-card/50">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forest Health</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl">75%</p>
                  <div className="flex items-center text-red-600">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm">-2.1%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Global Coverage</p>
                <p className="text-2xl">67.2%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TreePine className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Species Tracked</p>
                <p className="text-2xl">2,301</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl">147</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <Globe className="w-4 h-4" />
              Map
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2">
              <Radio className="w-4 h-4" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="biodiversity" className="gap-2">
              <TreePine className="w-4 h-4" />
              Biodiversity
            </TabsTrigger>
            <TabsTrigger value="historical" className="gap-2">
              <Clock className="w-4 h-4" />
              Historical
            </TabsTrigger>
            <TabsTrigger value="api-setup" className="gap-2">
              <Settings className="w-4 h-4" />
              API Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ForestAnalytics />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <InteractiveMap />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <RealTimeMonitoring />
          </TabsContent>

          <TabsContent value="biodiversity" className="space-y-6">
            <BiodiversityTracker />
          </TabsContent>

          <TabsContent value="historical" className="space-y-6">
            <HistoricalAnalysis />
          </TabsContent>

          <TabsContent value="api-setup" className="space-y-6">
            <ApiSetupGuide />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="mb-4">Key Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>🗺️ Real-time satellite monitoring</li>
                <li>🤖 AI-powered threat detection</li>
                <li>📊 Advanced analytics dashboard</li>
                <li>🌿 Biodiversity tracking</li>
                <li>🔄 Historical analysis tools</li>
              </ul>
            </div>
            
            <div>
              <h3 className="mb-4">Live Data Sources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>🛰️ NASA GIBS (MODIS/VIIRS)</li>
                <li>🔥 NASA FIRMS Fire Detection</li>
                <li>🌤️ OpenWeather Climate Data</li>
                <li>🌲 Global Forest Watch API</li>
                <li>🦎 GBIF Biodiversity Data</li>
                <li>📡 Sentinel Hub Imagery</li>
              </ul>
            </div>
            
            <div>
              <h3 className="mb-4">Platform Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>12 Satellites Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>847 Data Streams</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>3 Maintenance Windows</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-6 mt-6 text-center text-sm text-muted-foreground">
            <p>© 2024 Global Forest Explorer. Powered by AI and satellite technology for forest conservation.</p>
          </div>
        </div>
      </footer>

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Browser Limitations Info */}
      <BrowserLimitationsInfo
        isVisible={showBrowserInfo}
        onClose={() => setShowBrowserInfo(false)}
      />
    </div>
  );
}