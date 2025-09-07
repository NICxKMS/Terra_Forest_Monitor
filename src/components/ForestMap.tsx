import React, { useState, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ZoomIn, ZoomOut, RotateCcw, Layers, AlertTriangle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ForestRegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  healthScore: number;
  deforestationRate: number;
  biodiversityIndex: number;
  alertLevel: 'low' | 'medium' | 'high';
}

const mockForestRegions: ForestRegion[] = [
  {
    id: '1',
    name: 'Amazon Basin',
    lat: -3.4653,
    lng: -62.2159,
    healthScore: 72,
    deforestationRate: 2.3,
    biodiversityIndex: 94,
    alertLevel: 'high'
  },
  {
    id: '2',
    name: 'Congo Basin',
    lat: -0.228,
    lng: 15.8277,
    healthScore: 81,
    deforestationRate: 1.2,
    biodiversityIndex: 87,
    alertLevel: 'medium'
  },
  {
    id: '3',
    name: 'Boreal Forest',
    lat: 64.2008,
    lng: -153.4937,
    healthScore: 89,
    deforestationRate: 0.3,
    biodiversityIndex: 76,
    alertLevel: 'low'
  },
  {
    id: '4',
    name: 'Southeast Asian Rainforest',
    lat: 1.3521,
    lng: 103.8198,
    healthScore: 65,
    deforestationRate: 3.1,
    biodiversityIndex: 91,
    alertLevel: 'high'
  }
];

export function ForestMap() {
  const [selectedRegion, setSelectedRegion] = useState<ForestRegion | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showSatelliteLayer, setShowSatelliteLayer] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <Card className="h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <h2>Global Forest Monitor</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={showSatelliteLayer ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSatelliteLayer(!showSatelliteLayer)}
          >
            <Layers className="w-4 h-4 mr-2" />
            Satellite
          </Button>
          <Button
            variant={showAlerts ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[500px]">
        {/* Map Controls */}
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Interactive Map */}
        <div className="flex-1 relative bg-slate-100 rounded-lg overflow-hidden">
          <div 
            ref={mapRef}
            className="w-full h-full relative"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* Background satellite imagery */}
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1639461426283-1ef93a8327c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYXRlbGxpdGUlMjBlYXJ0aCUyMGZvcmVzdCUyMG1vbml0b3Jpbmd8ZW58MXx8fHwxNzU3MjAyNjI0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Global satellite view"
              className={`w-full h-full object-cover ${showSatelliteLayer ? 'opacity-100' : 'opacity-50'}`}
            />
            
            {/* Forest Region Markers */}
            {mockForestRegions.map((region) => (
              <div
                key={region.id}
                className="absolute cursor-pointer"
                style={{
                  left: `${((region.lng + 180) / 360) * 100}%`,
                  top: `${((90 - region.lat) / 180) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => setSelectedRegion(region)}
              >
                <div className="relative">
                  <div className={`w-4 h-4 rounded-full ${getAlertColor(region.alertLevel)} animate-pulse`} />
                  {showAlerts && region.alertLevel !== 'low' && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                      <Badge variant="destructive" className="text-xs">
                        {region.alertLevel.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Region Details Panel */}
        {selectedRegion && (
          <Card className="w-80 p-4">
            <h3 className="mb-3">{selectedRegion.name}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Health Score</span>
                <Badge variant={selectedRegion.healthScore > 80 ? "default" : selectedRegion.healthScore > 60 ? "secondary" : "destructive"}>
                  {selectedRegion.healthScore}%
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deforestation Rate</span>
                <span>{selectedRegion.deforestationRate}%/year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Biodiversity Index</span>
                <span>{selectedRegion.biodiversityIndex}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alert Level</span>
                <Badge variant={selectedRegion.alertLevel === 'low' ? 'default' : selectedRegion.alertLevel === 'medium' ? 'secondary' : 'destructive'}>
                  {selectedRegion.alertLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <Button className="w-full mt-4" size="sm">
              View Detailed Analysis
            </Button>
          </Card>
        )}
      </div>
    </Card>
  );
}