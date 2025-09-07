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
  AlertTriangle
} from 'lucide-react';

interface BrowserLimitationsInfoProps {
  isVisible: boolean;
  onClose: () => void;
}

export function BrowserLimitationsInfo({ isVisible, onClose }: BrowserLimitationsInfoProps) {
  if (!isVisible) return null;

  const apiStatus = [
    {
      name: 'NASA GIBS (Satellite Imagery)',
      status: 'available',
      reason: 'CORS-friendly for tile requests',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />
    },
    {
      name: 'NASA FIRMS (Fire Data)',
      status: 'blocked',
      reason: 'Requires server-side access',
      icon: <XCircle className="w-4 h-4 text-red-500" />
    },
    {
      name: 'Global Forest Watch',
      status: 'blocked',
      reason: 'CORS restrictions for browser requests',
      icon: <XCircle className="w-4 h-4 text-red-500" />
    },
    {
      name: 'OpenWeather API',
      status: 'available',
      reason: 'Supports CORS with API key',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />
    },
    {
      name: 'GBIF Biodiversity',
      status: 'available',
      reason: 'Open API with CORS support',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />
    }
  ];

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
                <h3>Browser Environment Detected</h3>
                <p className="text-sm text-muted-foreground">
                  API limitations and data sources explained
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>

          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This application is running in a browser environment. Many government APIs 
              block direct browser requests due to CORS (Cross-Origin Resource Sharing) 
              policies for security reasons.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4>API Availability Status</h4>
            <div className="space-y-2">
              {apiStatus.map((api, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  {api.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{api.name}</span>
                      <Badge variant={api.status === 'available' ? 'default' : 'secondary'}>
                        {api.status === 'available' ? 'Available' : 'Browser Blocked'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{api.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4>Current Data Sources</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>High-quality mock data for demonstration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Real satellite imagery tiles from NASA GIBS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Live weather data (if API key configured)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Real biodiversity data from GBIF</span>
              </div>
            </div>
          </div>

          <Alert>
            <Server className="w-4 h-4" />
            <AlertDescription>
              <strong>Server-side Solution Ready:</strong> This platform includes complete 
              Supabase Edge Functions that bypass browser CORS limitations. Currently running 
              in browser mode with enhanced mock data - deploy the included serverless functions 
              to enable live API access.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4>✅ Production Solutions Included</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span><strong>Server-side API Proxy:</strong> Ready to deploy with Supabase Edge Functions</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-500" />
                <span><strong>Serverless Functions:</strong> Complete API handling in `/supabase/functions/`</span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-green-500" />
                <span><strong>Webhook System:</strong> Automated data updates with caching</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Deploy Now:</strong> Run `supabase functions deploy` to enable live API access 
                and eliminate browser CORS limitations. See deployment-guide.md for details.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              This platform demonstrates real forest monitoring capabilities with mock data
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
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