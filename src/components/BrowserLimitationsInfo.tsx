import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Info, 
  Server, 
  Globe, 
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { apiConfigManager } from '../services/apiConfigManager';
import { serverSideDataService } from '../services/serverSideDataService';

type ServiceKey = 'nasa_gibs' | 'nasa_firms' | 'global_forest_watch' | 'openweather' | 'gbif';

interface BrowserLimitationsInfoProps {
  isVisible: boolean;
  onClose: () => void;
}

export function BrowserLimitationsInfo({ isVisible, onClose }: BrowserLimitationsInfoProps) {
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [statuses, setStatuses] = useState<Record<ServiceKey, { connected: boolean; error?: string; latencyMs?: number; endpoint?: string }>>({
    nasa_gibs: { connected: false },
    nasa_firms: { connected: false },
    global_forest_watch: { connected: false },
    openweather: { connected: false },
    gbif: { connected: false },
  });

  useEffect(() => {
    if (!isVisible) return;
    const load = async () => {
      try {
        setLoading(true);
        apiConfigManager.refreshApiKeys();
        const [health, svc] = await Promise.all([
          serverSideDataService.checkServerHealth().catch(() => ({ success: false })),
          apiConfigManager.getApiStatuses().catch(() => ({} as any))
        ]);
        setServerOnline(Boolean((health as any)?.success));
        setStatuses((prev) => ({
          ...prev,
          nasa_gibs: svc['nasa_gibs'] || prev.nasa_gibs,
          nasa_firms: svc['nasa_firms'] || prev.nasa_firms,
          global_forest_watch: svc['global_forest_watch'] || prev.global_forest_watch,
          openweather: svc['openweather'] || prev.openweather,
          gbif: svc['gbif'] || prev.gbif,
        }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isVisible]);

  if (!isVisible) return null;

  const rows = [
    {
      key: 'nasa_gibs' as ServiceKey,
      name: 'NASA GIBS (Satellite Imagery)',
      reasonOk: 'CORS-friendly for tile requests',
      reasonBlocked: 'Tile service unreachable',
    },
    {
      key: 'nasa_firms' as ServiceKey,
      name: 'NASA FIRMS (Fire Data)',
      reasonOk: 'Available via server proxy or user API key',
      reasonBlocked: 'Requires server-side access (CORS)',
    },
    {
      key: 'global_forest_watch' as ServiceKey,
      name: 'Global Forest Watch',
      reasonOk: 'Available via server proxy',
      reasonBlocked: 'Blocked in browser (CORS)',
    },
    {
      key: 'openweather' as ServiceKey,
      name: 'OpenWeather API',
      reasonOk: 'CORS-supported with API key',
      reasonBlocked: 'API key not configured or unreachable',
    },
    {
      key: 'gbif' as ServiceKey,
      name: 'GBIF Biodiversity',
      reasonOk: 'Open API with CORS support',
      reasonBlocked: 'Temporarily unreachable',
    },
  ];

  const noMock = apiConfigManager.isNoMockEnabled();
  const configured = apiConfigManager.getConfiguredApis();

  const testAgain = async () => {
    try {
      setLoading(true);
      const svc = await apiConfigManager.getApiStatuses();
      const health = await serverSideDataService.checkServerHealth().catch(() => ({ success: false }));
      setServerOnline(Boolean((health as any)?.success));
      setStatuses((prev) => ({
        ...prev,
        nasa_gibs: svc['nasa_gibs'] || prev.nasa_gibs,
        nasa_firms: svc['nasa_firms'] || prev.nasa_firms,
        global_forest_watch: svc['global_forest_watch'] || prev.global_forest_watch,
        openweather: svc['openweather'] || prev.openweather,
        gbif: svc['gbif'] || prev.gbif,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3>Environment & API Status</h3>
                <p className="text-sm text-muted-foreground">Live checks based on your configuration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={testAgain} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Test again
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This app runs in the browser. Some APIs block direct requests due to CORS. {serverOnline ? (
                <span>Server proxy is <strong>online</strong>, enabling additional live APIs.</span>
              ) : (
                <span>Server proxy is <strong>offline</strong>, so some APIs may be unavailable directly from the browser.</span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4>API Availability Status</h4>
            <div className="space-y-2">
              {rows.map((api, index) => {
                const st = statuses[api.key];
                const ok = Boolean(st?.connected);
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    {ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{api.name}</span>
                        <Badge variant={ok ? 'default' : 'secondary'}>{ok ? 'Available' : 'Browser Blocked'}</Badge>
                        {typeof st?.latencyMs === 'number' && (
                          <span className="text-xs text-muted-foreground">{Math.round(st.latencyMs)}ms</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{ok ? api.reasonOk : (st?.error || api.reasonBlocked)}</p>
                      {st?.endpoint && (
                        <p className="text-xs text-muted-foreground truncate">{st.endpoint}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h4>Current Data Sources</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {statuses.nasa_gibs.connected ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span>Satellite imagery tiles from NASA GIBS</span>
              </div>
              <div className="flex items-center gap-2">
                {statuses.openweather.connected ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span>Weather data (OpenWeather)</span>
              </div>
              <div className="flex items-center gap-2">
                {statuses.gbif.connected ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span>Biodiversity data (GBIF)</span>
              </div>
              <div className="flex items-center gap-2">
                {(statuses.nasa_firms.connected || statuses.global_forest_watch.connected) ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span>Forest alerts (NASA FIRMS / Global Forest Watch)</span>
              </div>
            </div>
          </div>

          <Alert>
            <Server className="w-4 h-4" />
            <AlertDescription>
              <strong>Server-side Proxy:</strong> {serverOnline ? 'Online' : 'Offline'} • Data mode: {noMock ? 'Live only' : 'Live + Mock'}. Configured APIs: {configured.length > 0 ? configured.join(', ') : 'none'}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4>✅ Production Solutions Included</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span><strong>Server-side API Proxy:</strong> Supabase Edge Functions ready</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-500" />
                <span><strong>Serverless Functions:</strong> Deployed via worker/edge endpoints</span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-green-500" />
                <span><strong>Webhook System:</strong> Automated data updates with caching</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Deploy Now:</strong> Run `supabase functions deploy` to enable live API access and remove browser CORS limitations.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              This platform blends live data with mock fallbacks depending on configuration
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Got it
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  const event = new CustomEvent('switchToTab', { detail: 'api-setup' });
                  window.dispatchEvent(event);
                  onClose();
                }}
              >
                Configure APIs
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}