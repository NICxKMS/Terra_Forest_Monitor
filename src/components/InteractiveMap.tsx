import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  TreePine,
  Navigation,
  Globe,
  Map as MapIcon,
  Satellite,
} from "lucide-react";
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

export function InteractiveMap() {
  const [selectedRegion, setSelectedRegion] =
    useState<ForestRegion | null>(null);
  const [regions, setRegions] = useState<ForestRegion[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  // Map state
  const [zoom, setZoom] = useState(2);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
  });

  // UI state
  const [activeLayer, setActiveLayer] = useState("osm");
  const [showAlerts, setShowAlerts] = useState(true);
  const [showForestCover, setShowForestCover] = useState(true);
  const [tilesLoading, setTilesLoading] = useState(0);
  const [tilesLoaded, setTilesLoaded] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    // Reset tile loading counters when layer changes
    setTilesLoading(0);
    setTilesLoaded(0);
  }, [activeLayer, zoom, center.lat, center.lng]);

  const loadMapData = async () => {
    try {
      // Load regions and alerts with timeout to prevent hanging
      const timeout = 5000; // 5 second timeout
      const raceTimeout = (ms: number) =>
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timeout")),
            ms,
          ),
        );

      const [forestRegions, forestAlerts] = (await Promise.race(
        [
          Promise.all([
            enhancedForestDataService.getForestRegions(),
            enhancedForestDataService.getForestAlerts(),
          ]),
          raceTimeout(timeout),
        ],
      )) as [any[], any[]];

      console.log("Map data loaded successfully:", {
        regions: forestRegions.length,
        alerts: forestAlerts.length,
      });

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
        })),
      );
    } catch (error) {
      console.error(
        "Error loading map data, using mock data:",
        error,
      );
      setRegions(getMockRegions());
      setAlerts(getMockAlerts());
    }
  };

  const getMockRegions = (): ForestRegion[] => [
    {
      id: "amazon",
      name: "Amazon Basin",
      lat: -3.4653,
      lng: -62.2159,
      healthScore: 72,
      deforestationRate: 2.3,
      biodiversityIndex: 94,
      alertLevel: "high",
      fireRisk: 65,
      temperature: 28.5,
      precipitation: 2300,
      area: 6700000,
      forestCover: 85,
    },
    {
      id: "congo",
      name: "Congo Basin",
      lat: -0.228,
      lng: 15.8277,
      healthScore: 81,
      deforestationRate: 1.2,
      biodiversityIndex: 87,
      alertLevel: "medium",
      fireRisk: 45,
      temperature: 26.2,
      precipitation: 1800,
      area: 3700000,
      forestCover: 92,
    },
    {
      id: "boreal",
      name: "Boreal Forest",
      lat: 64.2008,
      lng: -153.4937,
      healthScore: 89,
      deforestationRate: 0.3,
      biodiversityIndex: 76,
      alertLevel: "low",
      fireRisk: 35,
      temperature: 13.2,
      precipitation: 400,
      area: 17000000,
      forestCover: 94,
    },
    {
      id: "southeast_asia",
      name: "Southeast Asian Rainforest",
      lat: 1.3521,
      lng: 103.8198,
      healthScore: 65,
      deforestationRate: 3.1,
      biodiversityIndex: 91,
      alertLevel: "critical",
      fireRisk: 75,
      temperature: 29.8,
      precipitation: 2500,
      area: 2500000,
      forestCover: 78,
    },
  ];

  const getMockAlerts = (): Alert[] => [
    {
      id: "alert1",
      type: "fire",
      severity: "critical",
      lat: -3.2,
      lng: -61.8,
      title: "Large Fire Detected",
      description: "High intensity fire in protected area",
      timestamp: new Date().toISOString(),
    },
    {
      id: "alert2",
      type: "deforestation",
      severity: "high",
      lat: 1.5,
      lng: 104.2,
      title: "Deforestation Alert",
      description: "Illegal clearing detected",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  // Web Mercator projection utilities
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const rad2deg = (rad: number) => rad * (180 / Math.PI);

  const latLngToPixel = useCallback(
    (lat: number, lng: number) => {
      const mapSize = 256 * Math.pow(2, zoom);
      const x = ((lng + 180) / 360) * mapSize;
      const y =
        ((1 -
          Math.log(
            Math.tan(deg2rad(lat)) + 1 / Math.cos(deg2rad(lat)),
          ) /
            Math.PI) /
          2) *
        mapSize;

      const containerWidth =
        mapContainerRef.current?.clientWidth || 800;
      const containerHeight =
        mapContainerRef.current?.clientHeight || 600;

      const centerX = ((center.lng + 180) / 360) * mapSize;
      const centerY =
        ((1 -
          Math.log(
            Math.tan(deg2rad(center.lat)) +
              1 / Math.cos(deg2rad(center.lat)),
          ) /
            Math.PI) /
          2) *
        mapSize;

      return {
        x: x - centerX + containerWidth / 2 + panOffset.x,
        y: y - centerY + containerHeight / 2 + panOffset.y,
      };
    },
    [zoom, center, panOffset],
  );

  const pixelToLatLng = useCallback(
    (x: number, y: number) => {
      const containerWidth =
        mapContainerRef.current?.clientWidth || 800;
      const containerHeight =
        mapContainerRef.current?.clientHeight || 600;
      const mapSize = 256 * Math.pow(2, zoom);

      const centerX = ((center.lng + 180) / 360) * mapSize;
      const centerY =
        ((1 -
          Math.log(
            Math.tan(deg2rad(center.lat)) +
              1 / Math.cos(deg2rad(center.lat)),
          ) /
            Math.PI) /
          2) *
        mapSize;

      const worldX =
        x + centerX - containerWidth / 2 - panOffset.x;
      const worldY =
        y + centerY - containerHeight / 2 - panOffset.y;

      const lng = (worldX / mapSize) * 360 - 180;
      const latRad = Math.atan(
        Math.sinh(Math.PI * (1 - (2 * worldY) / mapSize)),
      );
      const lat = rad2deg(latRad);

      return { lat, lng };
    },
    [zoom, center, panOffset],
  );

  // Tile calculation
  const getTileUrl = (
    layer: string,
    z: number,
    x: number,
    y: number,
  ) => {
    // Validate tile coordinates
    const maxTile = Math.pow(2, z) - 1;
    if (
      z < 0 ||
      z > 18 ||
      x < 0 ||
      x > maxTile ||
      y < 0 ||
      y > maxTile
    ) {
      return null;
    }

    try {
      switch (layer) {
        case "osm":
          return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
        case "satellite":
          return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
        case "terrain":
          return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/${z}/${y}/${x}`;
        default:
          return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      }
    } catch (error) {
      console.error("Error generating tile URL:", error);
      return null;
    }
  };

  const generateTiles = useCallback(() => {
    const containerWidth =
      mapContainerRef.current?.clientWidth || 800;
    const containerHeight =
      mapContainerRef.current?.clientHeight || 600;
    const tileSize = 256;
    const z = Math.max(0, Math.min(18, Math.floor(zoom)));

    // Clamp center coordinates to valid ranges
    const clampedLat = Math.max(
      -85.0511,
      Math.min(85.0511, center.lat),
    );
    const clampedLng = (((center.lng % 360) + 360) % 360) - 180; // Normalize to -180 to 180

    // Calculate visible world bounds using Web Mercator projection
    const mapSize = Math.pow(2, z) * tileSize;
    const worldX = ((clampedLng + 180) / 360) * mapSize;
    const worldY =
      ((1 -
        Math.log(
          Math.tan(deg2rad(clampedLat)) +
            1 / Math.cos(deg2rad(clampedLat)),
        ) /
          Math.PI) /
        2) *
      mapSize;

    // Calculate tile bounds with buffer
    const tilesNeededX =
      Math.ceil(containerWidth / tileSize) + 2;
    const tilesNeededY =
      Math.ceil(containerHeight / tileSize) + 2;

    const startX =
      Math.floor(
        (worldX - containerWidth / 2 - panOffset.x) / tileSize,
      ) - 1;
    const endX = startX + tilesNeededX;
    const startY =
      Math.floor(
        (worldY - containerHeight / 2 - panOffset.y) / tileSize,
      ) - 1;
    const endY = startY + tilesNeededY;

    const tiles = [];
    const maxTiles = Math.pow(2, z);
    const usedKeys = new Set<string>();

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        // Wrap X coordinate, clamp Y coordinate
        let tileX = x;
        while (tileX < 0) tileX += maxTiles;
        tileX = tileX % maxTiles;

        if (y >= 0 && y < maxTiles) {
          const tileKey = `${z}-${x}-${y}`;
          
          // Skip if we already have this tile key
          if (usedKeys.has(tileKey)) {
            continue;
          }
          
          const url = getTileUrl(activeLayer, z, tileX, y);
          if (url) {
            // Calculate screen position
            const screenX =
              x * tileSize -
              worldX +
              containerWidth / 2 +
              panOffset.x;
            const screenY =
              y * tileSize -
              worldY +
              containerHeight / 2 +
              panOffset.y;

            usedKeys.add(tileKey);
            tiles.push({
              key: tileKey,
              url,
              x: screenX,
              y: screenY,
              z,
              tileX,
              tileY: y,
            });
          }
        }
      }
    }

    return tiles;
  }, [zoom, center, panOffset, activeLayer]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: panOffset.x,
      offsetY: panOffset.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPanOffset({
        x: dragStart.offsetX + deltaX,
        y: dragStart.offsetY + deltaY,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    setZoom((prev) => Math.max(1, Math.min(18, prev + delta)));
  }, []);

  // Control functions
  const zoomIn = () =>
    setZoom((prev) => Math.min(18, prev + 1));
  const zoomOut = () =>
    setZoom((prev) => Math.max(1, prev - 1));

  const resetView = () => {
    setZoom(2);
    setCenter({ lat: 0, lng: 0 });
    setPanOffset({ x: 0, y: 0 });
    setSelectedRegion(null);
  };

  const focusOnRegion = (region: ForestRegion) => {
    setCenter({ lat: region.lat, lng: region.lng });
    setZoom(6);
    setPanOffset({ x: 0, y: 0 });
    setSelectedRegion(region);
  };

  const getRegionColor = (region: ForestRegion) => {
    switch (region.alertLevel) {
      case "critical":
        return "bg-red-500 border-red-700 shadow-red-500/50";
      case "high":
        return "bg-orange-500 border-orange-700 shadow-orange-500/50";
      case "medium":
        return "bg-yellow-500 border-yellow-700 shadow-yellow-500/50";
      default:
        return "bg-green-500 border-green-700 shadow-green-500/50";
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 border-red-800";
      case "high":
        return "bg-orange-500 border-orange-700";
      case "medium":
        return "bg-yellow-500 border-yellow-700";
      default:
        return "bg-green-500 border-green-700";
    }
  };

  const tiles = generateTiles();

  return (
    <Card className="h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2>Global Forest Map</h2>
          <p className="text-sm text-muted-foreground">
            Interactive world map with forest monitoring data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={activeLayer}
            onValueChange={setActiveLayer}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="osm">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4" />
                  Street
                </div>
              </SelectItem>
              <SelectItem value="satellite">
                <div className="flex items-center gap-2">
                  <Satellite className="w-4 h-4" />
                  Satellite
                </div>
              </SelectItem>
              <SelectItem value="terrain">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Terrain
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showAlerts ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts ({alerts.length})
          </Button>
          <Button
            variant={showForestCover ? "default" : "outline"}
            size="sm"
            onClick={() => setShowForestCover(!showForestCover)}
          >
            <TreePine className="w-4 h-4 mr-2" />
            Forests
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[600px]">
        {/* Map Controls */}
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <div className="w-px h-4 bg-border mx-2" />

          <div className="space-y-1 p-2 bg-muted/30 rounded text-xs">
            <div>
              Zoom:{" "}
              <span className="font-mono">
                {zoom.toFixed(1)}
              </span>
            </div>
            <div>
              Tiles:{" "}
              <span className="font-mono">{tiles.length}</span>
            </div>
            <div>
              Layer:{" "}
              <span className="font-mono">{activeLayer}</span>
            </div>
            {tilesLoading > 0 && (
              <div className="text-blue-600">
                Loading: {tilesLoading}
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="flex-1 relative bg-blue-100 dark:bg-blue-950 rounded-lg overflow-hidden border cursor-grab"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          {/* Base Layer - Grid Pattern for Reference */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
                backgroundPosition: `${panOffset.x % 40}px ${panOffset.y % 40}px`,
              }}
            />
          </div>

          {/* Map Tiles */}
          <div className="absolute inset-0">
            {tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                className="absolute pointer-events-none transition-opacity duration-300"
                style={{
                  left: tile.x,
                  top: tile.y,
                  width: 256,
                  height: 256,
                  imageRendering:
                    zoom > 8 ? "pixelated" : "auto",
                  opacity: 0,
                }}
                onLoadStart={() => {
                  setTilesLoading((prev) => prev + 1);
                }}
                onError={(e) => {
                  console.log(
                    `Tile failed to load: ${tile.url}`,
                  );
                  const img =
                    e.currentTarget as HTMLImageElement;
                  img.style.display = "none";
                  setTilesLoading((prev) =>
                    Math.max(0, prev - 1),
                  );
                }}
                onLoad={(e) => {
                  const img =
                    e.currentTarget as HTMLImageElement;
                  img.style.opacity = "1";
                  img.style.display = "block";
                  setTilesLoading((prev) =>
                    Math.max(0, prev - 1),
                  );
                  setTilesLoaded((prev) => prev + 1);
                }}
              />
            ))}
          </div>

          {/* Forest Regions */}
          {showForestCover &&
            regions.map((region) => {
              const pos = latLngToPixel(region.lat, region.lng);
              if (
                pos.x < -50 ||
                pos.y < -50 ||
                pos.x >
                  (mapContainerRef.current?.clientWidth ||
                    800) +
                    50 ||
                pos.y >
                  (mapContainerRef.current?.clientHeight ||
                    600) +
                    50
              ) {
                return null; // Don't render markers outside visible area
              }

              return (
                <div
                  key={region.id}
                  className="absolute cursor-pointer group z-10"
                  style={{
                    left: pos.x - 12,
                    top: pos.y - 12,
                  }}
                  onClick={() => setSelectedRegion(region)}
                  onDoubleClick={() => focusOnRegion(region)}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 ${getRegionColor(region)} 
                  group-hover:scale-125 transition-all duration-200 animate-pulse shadow-lg`}
                  />

                  {/* Region tooltip */}
                  <div
                    className="absolute -top-16 left-1/2 transform -translate-x-1/2 
                  bg-black/90 text-white text-xs px-3 py-2 rounded opacity-0 
                  group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl"
                  >
                    <div>{region.name}</div>
                    <div className="text-xs opacity-80">
                      Health: {region.healthScore}%
                    </div>
                    <div className="text-xs opacity-80">
                      Risk: {region.alertLevel}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Alert Markers */}
          {showAlerts &&
            alerts.map((alert) => {
              const pos = latLngToPixel(alert.lat, alert.lng);
              if (
                pos.x < -50 ||
                pos.y < -50 ||
                pos.x >
                  (mapContainerRef.current?.clientWidth ||
                    800) +
                    50 ||
                pos.y >
                  (mapContainerRef.current?.clientHeight ||
                    600) +
                    50
              ) {
                return null;
              }

              return (
                <div
                  key={alert.id}
                  className="absolute cursor-pointer group z-10"
                  style={{
                    left: pos.x - 8,
                    top: pos.y - 8,
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${getAlertColor(alert.severity)} 
                  animate-ping shadow-lg`}
                  />
                  <div
                    className={`absolute inset-0 w-4 h-4 rounded-full border-2 ${getAlertColor(alert.severity)}`}
                  />

                  {/* Alert tooltip */}
                  <div
                    className="absolute -top-20 left-1/2 transform -translate-x-1/2 
                  bg-black/95 text-white text-xs p-3 rounded-lg opacity-0 
                  group-hover:opacity-100 transition-opacity z-30 min-w-40 shadow-xl"
                  >
                    <div>{alert.title}</div>
                    <div className="text-xs opacity-80 mt-1">
                      {alert.description}
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      {new Date(
                        alert.timestamp,
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Map attribution */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-white/80 dark:bg-black/80 px-2 py-1 rounded">
            {activeLayer === "osm"
              ? "© OpenStreetMap"
              : "© Esri"}{" "}
            • Forest Explorer
            {tilesLoading > 0 && (
              <span className="ml-2 text-blue-600">
                • Loading tiles...
              </span>
            )}
          </div>

          {/* Connection status indicator */}
          {tiles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 rounded-lg p-4 text-center">
                <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                  🗺️ Initializing map tiles...
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Layer: {activeLayer} • Zoom: {zoom}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Region Details Panel */}
        {selectedRegion && (
          <Card className="w-80 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3>{selectedRegion.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRegion(null)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">
                    Health Score
                  </div>
                  <Badge
                    variant={
                      selectedRegion.healthScore > 80
                        ? "default"
                        : selectedRegion.healthScore > 60
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {selectedRegion.healthScore}%
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    Alert Level
                  </div>
                  <Badge
                    variant={
                      selectedRegion.alertLevel === "low"
                        ? "default"
                        : selectedRegion.alertLevel === "medium"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {selectedRegion.alertLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Forest Cover
                  </span>
                  <span>{selectedRegion.forestCover}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Deforestation Rate
                  </span>
                  <span>
                    {selectedRegion.deforestationRate}%/year
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Biodiversity Index
                  </span>
                  <span>
                    {selectedRegion.biodiversityIndex}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Fire Risk
                  </span>
                  <span>{selectedRegion.fireRisk}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Temperature
                  </span>
                  <span>
                    {selectedRegion.temperature.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Area
                  </span>
                  <span>
                    {(selectedRegion.area / 1000000).toFixed(1)}
                    M km²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Coordinates
                  </span>
                  <span className="text-xs font-mono">
                    {selectedRegion.lat.toFixed(3)},{" "}
                    {selectedRegion.lng.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                size="sm"
                onClick={() => focusOnRegion(selectedRegion)}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Focus on Region
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
              >
                View Detailed Analysis
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => {
                  const event = new CustomEvent("switchToTab", {
                    detail: "monitoring",
                  });
                  window.dispatchEvent(event);
                }}
              >
                Live Monitor
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Map Legend */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Low Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Critical Risk</span>
          </div>
          <div className="text-xs bg-muted px-2 py-1 rounded">
            🗺️{" "}
            {activeLayer === "osm"
              ? "Street Map"
              : activeLayer === "satellite"
                ? "Satellite View"
                : "Terrain View"}
            • Zoom: {zoom.toFixed(1)} • {regions.length} Regions
          </div>
        </div>
        <div>
          Click regions for details • Double-click to focus •
          Drag to pan • Scroll to zoom
        </div>
      </div>
    </Card>
  );
}