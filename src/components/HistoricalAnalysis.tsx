import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { Download, Play, Pause, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HistoricalData {
  year: number;
  forestCoverage: number;
  deforestationRate: number;
  temperature: number;
  precipitation: number;
  carbonSequestration: number;
  biodiversityIndex: number;
}

const historicalData: HistoricalData[] = [
  { year: 2000, forestCoverage: 92, deforestationRate: 0.8, temperature: 13.2, precipitation: 1200, carbonSequestration: 2.8, biodiversityIndex: 95 },
  { year: 2001, forestCoverage: 91, deforestationRate: 1.0, temperature: 13.3, precipitation: 1180, carbonSequestration: 2.7, biodiversityIndex: 94 },
  { year: 2002, forestCoverage: 90, deforestationRate: 1.1, temperature: 13.4, precipitation: 1160, carbonSequestration: 2.6, biodiversityIndex: 93 },
  { year: 2003, forestCoverage: 89, deforestationRate: 1.2, temperature: 13.6, precipitation: 1140, carbonSequestration: 2.5, biodiversityIndex: 92 },
  { year: 2004, forestCoverage: 87, deforestationRate: 1.8, temperature: 13.7, precipitation: 1120, carbonSequestration: 2.4, biodiversityIndex: 91 },
  { year: 2005, forestCoverage: 86, deforestationRate: 1.6, temperature: 13.9, precipitation: 1100, carbonSequestration: 2.3, biodiversityIndex: 90 },
  { year: 2006, forestCoverage: 85, deforestationRate: 1.4, temperature: 14.0, precipitation: 1080, carbonSequestration: 2.2, biodiversityIndex: 89 },
  { year: 2007, forestCoverage: 84, deforestationRate: 1.3, temperature: 14.2, precipitation: 1060, carbonSequestration: 2.1, biodiversityIndex: 88 },
  { year: 2008, forestCoverage: 83, deforestationRate: 1.2, temperature: 14.3, precipitation: 1040, carbonSequestration: 2.0, biodiversityIndex: 87 },
  { year: 2009, forestCoverage: 82, deforestationRate: 1.1, temperature: 14.5, precipitation: 1020, carbonSequestration: 1.9, biodiversityIndex: 86 },
  { year: 2010, forestCoverage: 81, deforestationRate: 1.2, temperature: 14.6, precipitation: 1000, carbonSequestration: 1.8, biodiversityIndex: 85 },
  { year: 2011, forestCoverage: 80, deforestationRate: 1.3, temperature: 14.8, precipitation: 980, carbonSequestration: 1.7, biodiversityIndex: 84 },
  { year: 2012, forestCoverage: 79, deforestationRate: 1.4, temperature: 14.9, precipitation: 960, carbonSequestration: 1.6, biodiversityIndex: 83 },
  { year: 2013, forestCoverage: 78, deforestationRate: 1.3, temperature: 15.1, precipitation: 940, carbonSequestration: 1.5, biodiversityIndex: 82 },
  { year: 2014, forestCoverage: 77, deforestationRate: 1.5, temperature: 15.2, precipitation: 920, carbonSequestration: 1.4, biodiversityIndex: 81 },
  { year: 2015, forestCoverage: 76, deforestationRate: 1.4, temperature: 15.4, precipitation: 900, carbonSequestration: 1.3, biodiversityIndex: 80 },
  { year: 2016, forestCoverage: 75, deforestationRate: 1.3, temperature: 15.5, precipitation: 880, carbonSequestration: 1.2, biodiversityIndex: 79 },
  { year: 2017, forestCoverage: 74, deforestationRate: 1.3, temperature: 15.7, precipitation: 860, carbonSequestration: 1.1, biodiversityIndex: 78 },
  { year: 2018, forestCoverage: 73, deforestationRate: 1.4, temperature: 15.8, precipitation: 840, carbonSequestration: 1.0, biodiversityIndex: 77 },
  { year: 2019, forestCoverage: 72, deforestationRate: 1.4, temperature: 16.0, precipitation: 820, carbonSequestration: 0.9, biodiversityIndex: 76 },
  { year: 2020, forestCoverage: 71, deforestationRate: 1.4, temperature: 16.1, precipitation: 800, carbonSequestration: 0.8, biodiversityIndex: 75 },
  { year: 2021, forestCoverage: 70, deforestationRate: 1.4, temperature: 16.3, precipitation: 780, carbonSequestration: 0.7, biodiversityIndex: 74 },
  { year: 2022, forestCoverage: 69, deforestationRate: 1.4, temperature: 16.4, precipitation: 760, carbonSequestration: 0.6, biodiversityIndex: 73 },
  { year: 2023, forestCoverage: 68, deforestationRate: 1.5, temperature: 16.6, precipitation: 740, carbonSequestration: 0.5, biodiversityIndex: 72 },
  { year: 2024, forestCoverage: 67, deforestationRate: 1.5, temperature: 16.7, precipitation: 720, carbonSequestration: 0.4, biodiversityIndex: 71 },
];

const milestones = [
  { year: 2000, event: 'UN Millennium Development Goals established', type: 'policy' },
  { year: 2008, event: 'Global Financial Crisis reduces deforestation rates', type: 'economic' },
  { year: 2015, event: 'Paris Climate Agreement signed', type: 'policy' },
  { year: 2020, event: 'COVID-19 pandemic affects monitoring', type: 'social' },
  { year: 2023, event: 'Advanced AI monitoring systems deployed', type: 'technology' },
];

export function HistoricalAnalysis() {
  const [selectedRegion, setSelectedRegion] = useState('global');
  const [timeRange, setTimeRange] = useState([2000, 2024]);
  const [selectedMetric, setSelectedMetric] = useState('forestCoverage');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackYear, setPlaybackYear] = useState(2000);

  const filteredData = historicalData.filter(d => d.year >= timeRange[0] && d.year <= timeRange[1]);

  const metricInfo = {
    forestCoverage: { name: 'Forest Coverage (%)', color: '#22c55e', trend: -25 },
    deforestationRate: { name: 'Deforestation Rate (%)', color: '#dc2626', trend: +87 },
    temperature: { name: 'Temperature (°C)', color: '#f59e0b', trend: +26 },
    precipitation: { name: 'Precipitation (mm)', color: '#3b82f6', trend: -40 },
    carbonSequestration: { name: 'Carbon Sequestration (Gt)', color: '#8b5cf6', trend: -86 },
    biodiversityIndex: { name: 'Biodiversity Index', color: '#06b6d4', trend: -25 },
  };

  const handleTimelinePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const interval = setInterval(() => {
        setPlaybackYear(prev => {
          if (prev >= timeRange[1]) {
            setIsPlaying(false);
            clearInterval(interval);
            return timeRange[0];
          }
          return prev + 1;
        });
      }, 500);
    }
  };

  const resetTimeline = () => {
    setIsPlaying(false);
    setPlaybackYear(timeRange[0]);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2>Historical Forest Analysis</h2>
          <div className="flex items-center gap-4">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="amazon">Amazon Basin</SelectItem>
                <SelectItem value="congo">Congo Basin</SelectItem>
                <SelectItem value="boreal">Boreal Forest</SelectItem>
                <SelectItem value="southeast_asia">Southeast Asia</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Time Range: {timeRange[0]} - {timeRange[1]}</label>
            <Slider
              value={timeRange}
              onValueChange={setTimeRange}
              min={2000}
              max={2024}
              step={1}
              className="mb-4"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Metric</label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(metricInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="flex items-center gap-4 mt-6">
          <Button variant="outline" size="sm" onClick={handleTimelinePlay}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={resetTimeline}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <Slider
              value={[playbackYear]}
              onValueChange={(value) => setPlaybackYear(value[0])}
              min={timeRange[0]}
              max={timeRange[1]}
              step={1}
            />
          </div>
          <Badge variant="outline">{playbackYear}</Badge>
        </div>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(metricInfo).slice(0, 3).map(([key, info]) => {
          const currentValue = filteredData[filteredData.length - 1]?.[key as keyof HistoricalData] || 0;
          const initialValue = filteredData[0]?.[key as keyof HistoricalData] || 0;
          const change = ((currentValue - initialValue) / initialValue * 100);
          
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">{info.name}</p>
                  <p className="text-2xl mt-1">{currentValue.toFixed(1)}</p>
                </div>
                <div className="flex items-center">
                  {change > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Trend Chart */}
        <Card className="p-6">
          <h3 className="mb-4">{metricInfo[selectedMetric as keyof typeof metricInfo].name} Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey={selectedMetric}
                stroke={metricInfo[selectedMetric as keyof typeof metricInfo].color}
                fill={metricInfo[selectedMetric as keyof typeof metricInfo].color}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Multi-metric Comparison */}
        <Card className="p-6">
          <h3 className="mb-4">Multi-Metric Correlation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Area yAxisId="left" type="monotone" dataKey="forestCoverage" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
              <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} />
              <Bar yAxisId="right" dataKey="deforestationRate" fill="#dc2626" opacity={0.8} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Satellite Imagery Timeline */}
        <Card className="p-6">
          <h3 className="mb-4">Satellite Imagery Evolution</h3>
          <div className="relative h-64 bg-slate-100 rounded-lg overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1729534988762-a6f62ef9ed8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjBjYW5vcHklMjBhZXJpYWwlMjB2aWV3fGVufDF8fHx8MTc1NzIwMjYyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Historical satellite view"
              className="w-full h-full object-cover"
              sizes="(min-width: 1024px) 600px, 100vw"
              width={1024}
              height={256}
            />
            <div className="absolute top-4 left-4">
              <Badge variant="secondary">{playbackYear} Satellite Data</Badge>
            </div>
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm">Forest Coverage: {filteredData.find(d => d.year === playbackYear)?.forestCoverage.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        {/* Historical Milestones */}
        <Card className="p-6">
          <h3 className="mb-4">Key Historical Events</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge variant="outline" className="shrink-0">
                  {milestone.year}
                </Badge>
                <div>
                  <p className="text-sm">{milestone.event}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {milestone.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Card className="p-6">
        <h3 className="mb-4">Correlation Analysis</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="forestCoverage" stroke="#22c55e" strokeWidth={2} name="Forest Coverage %" />
            <Line type="monotone" dataKey="biodiversityIndex" stroke="#06b6d4" strokeWidth={2} name="Biodiversity Index" />
            <Line type="monotone" dataKey="carbonSequestration" stroke="#8b5cf6" strokeWidth={2} name="Carbon Sequestration (Gt)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}