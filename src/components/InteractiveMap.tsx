import React, { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle, TreePine, Navigation, Map as MapIcon, Satellite } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { enhancedForestDataService } from "../services/enhancedForestDataService";

interface ForestRegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  healthScore: number;
  deforestationRate: number;
  biodiversityIndex: number;
  alertLevel: "low" | "medium" | "high" | "critical";
  fireRisk: number;
  temperature: number;
  precipitation: number;
  area: number;
  forestCover: number;
}

interface Alert {
  id: string;
  type: "fire" | "deforestation" | "biodiversity";
  severity: "low" | "medium" | "high" | "critical";
  lat: number;
  lng: number;
  title: string;
  description: string;
  timestamp: string;
}

const iconColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const createCircleIcon = (color: string, size: number = 16) =>
  L.divIcon({
    className: "",
    html: `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}22"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 0.8 });
  }, [lat, lng, zoom]);
  return null;
}

export function InteractiveMap() {
  const [selectedRegion, setSelectedRegion] = useState<ForestRegion | null>(null);
  const [regions, setRegions] = useState<ForestRegion[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeLayer, setActiveLayer] = useState("osm");
  const [showAlerts, setShowAlerts] = useState(true);
  const [showForestCover, setShowForestCover] = useState(true);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState<number>(2);

  useEffect(() => {
    const load = async () => {
      try {
        const [forestRegions, forestAlerts] = await Promise.all([
          enhancedForestDataService.getForestRegions(),
          enhancedForestDataService.getForestAlerts(),
        ]);
        setRegions(forestRegions);
        setAlerts(
          forestAlerts.map((alert) => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            lat: alert.coordinates?.lat || 0,
            lng: alert.coordinates?.lng || 0,
            title: alert.location || "Unknown Location",
            description: alert.description,
            timestamp: alert.timestamp,
          }))
        );
      } catch {
        setRegions([]);
        setAlerts([]);
      }
    };
    load();
  }, []);

  const baseLayerUrl = useMemo(() => {
    if (activeLayer === "osm") return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    if (activeLayer === "satellite") return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }, [activeLayer]);

  const focusOnRegion = (region: ForestRegion) => {
    setCenter([region.lat, region.lng]);
    setZoom(6);
    setSelectedRegion(region);
  };

  const getRegionIcon = (level: string) => createCircleIcon(iconColors[level] || iconColors.low, 18);
  const getAlertIcon = (severity: string) => createCircleIcon(iconColors[severity] || iconColors.low, 12);

  return (
    <Card className="h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2>Global Forest Map</h2>
          <p className="text-sm text-muted-foreground">Interactive world map with forest monitoring data</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeLayer} onValueChange={setActiveLayer}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="osm">
                <div className="flex items-center gap-2"><MapIcon className="w-4 h-4" /> Street</div>
              </SelectItem>
              <SelectItem value="satellite">
                <div className="flex items-center gap-2"><Satellite className="w-4 h-4" /> Satellite</div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showAlerts ? "default" : "outline"} size="sm" onClick={() => setShowAlerts(!showAlerts)}>
            <AlertTriangle className="w-4 h-4 mr-2" /> Alerts ({alerts.length})
          </Button>
          <Button variant={showForestCover ? "default" : "outline"} size="sm" onClick={() => setShowForestCover(!showForestCover)}>
            <TreePine className="w-4 h-4 mr-2" /> Forests
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[600px]">
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(18, z + 1))}><ZoomIn className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(1, z - 1))}><ZoomOut className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { setCenter([0,0]); setZoom(2); setSelectedRegion(null); }}><RotateCcw className="w-4 h-4" /></Button>
        </div>

        <div className="flex-1 relative rounded-lg overflow-hidden border">
          <MapContainer center={center} zoom={zoom} style={{ width: "100%", height: "100%" }} worldCopyJump>
            <TileLayer url={baseLayerUrl} attribution={activeLayer === "osm" ? "© OpenStreetMap" : "© Esri"} />

            {/* Regions */}
            {showForestCover && regions.map((region) => (
              <Marker key={region.id} position={[region.lat, region.lng]} icon={getRegionIcon(region.alertLevel)} eventHandlers={{ click: () => setSelectedRegion(region), dblclick: () => focusOnRegion(region) }} />
            ))}

            {/* Alerts */}
            {showAlerts && alerts.map((a) => (
              <Marker key={a.id} position={[a.lat, a.lng]} icon={getAlertIcon(a.severity)}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium mb-1">{a.title}</div>
                    <div className="text-xs text-muted-foreground mb-1">{a.description}</div>
                    <div className="text-xs">{new Date(a.timestamp).toLocaleString()}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {selectedRegion && <FlyTo lat={selectedRegion.lat} lng={selectedRegion.lng} zoom={6} />}
          </MapContainer>
        </div>

        {selectedRegion && (
          <Card className="w-80 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3>{selectedRegion.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRegion(null)}>×</Button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Health Score</div>
                  <Badge variant={selectedRegion.healthScore > 80 ? "default" : selectedRegion.healthScore > 60 ? "secondary" : "destructive"}>{selectedRegion.healthScore}%</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">Alert Level</div>
                  <Badge variant={selectedRegion.alertLevel === "low" ? "default" : selectedRegion.alertLevel === "medium" ? "secondary" : "destructive"}>{selectedRegion.alertLevel.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Forest Cover</span><span>{selectedRegion.forestCover}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Deforestation Rate</span><span>{selectedRegion.deforestationRate}%/year</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Biodiversity Index</span><span>{selectedRegion.biodiversityIndex}/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fire Risk</span><span>{selectedRegion.fireRisk}/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Temperature</span><span>{selectedRegion.temperature.toFixed(1)}°C</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Area</span><span>{(selectedRegion.area / 1000000).toFixed(1)}M km²</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Coordinates</span><span className="text-xs font-mono">{selectedRegion.lat.toFixed(3)}, {selectedRegion.lng.toFixed(3)}</span></div>
              </div>
            </div>
            <div className="space-y-2">
              <Button className="w-full" size="sm" onClick={() => focusOnRegion(selectedRegion)}><Navigation className="w-4 h-4 mr-2" />Focus on Region</Button>
              <Button variant="outline" className="w-full" size="sm">View Detailed Analysis</Button>
              <Button variant="outline" className="w-full" size="sm" onClick={() => { const event = new CustomEvent("switchToTab", { detail: "monitoring" }); window.dispatchEvent(event); }}>Live Monitor</Button>
            </div>
          </Card>
        )}
      </div>
    </Card>
  );
}