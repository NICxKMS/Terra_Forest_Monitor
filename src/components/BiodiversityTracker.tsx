import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Search, Filter, Camera, MapPin, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { mockDataService } from '../services/mockDataService';

interface Species {
  id: string;
  name: string;
  scientificName: string;
  status: 'stable' | 'declining' | 'critically_endangered' | 'recovering';
  population: number;
  trend: number;
  habitat: string;
  lastSeen: string;
  confidence: number;
  imageUrl: string;
}

const mockSpecies: Species[] = [
  {
    id: '1',
    name: 'Sumatran Orangutan',
    scientificName: 'Pongo abelii',
    status: 'critically_endangered',
    population: 14000,
    trend: -3.2,
    habitat: 'Southeast Asian Rainforest',
    lastSeen: '2 days ago',
    confidence: 94,
    imageUrl: 'https://images.unsplash.com/photo-1729534988762-a6f62ef9ed8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjBjYW5vcHklMjBhZXJpYWwlMjB2aWV3fGVufDF8fHx8MTc1NzIwMjYyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: '2',
    name: 'Amazon River Dolphin',
    scientificName: 'Inia geoffrensis',
    status: 'declining',
    population: 25000,
    trend: -1.8,
    habitat: 'Amazon Basin',
    lastSeen: '5 days ago',
    confidence: 87,
    imageUrl: 'https://images.unsplash.com/photo-1729534988762-a6f62ef9ed8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjBjYW5vcHklMjBhZXJpYWwlMjB2aWV3fGVufDF8fHx8MTc1NzIwMjYyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: '3',
    name: 'Mountain Gorilla',
    scientificName: 'Gorilla beringei beringei',
    status: 'recovering',
    population: 1000,
    trend: 2.1,
    habitat: 'Congo Basin',
    lastSeen: '1 day ago',
    confidence: 96,
    imageUrl: 'https://images.unsplash.com/photo-1729534988762-a6f62ef9ed8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjBjYW5vcHklMjBhZXJpYWwlMjB2aWV3fGVufDF8fHx8MTc1NzIwMjYyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: '4',
    name: 'Boreal Caribou',
    scientificName: 'Rangifer tarandus caribou',
    status: 'stable',
    population: 34000,
    trend: 0.3,
    habitat: 'Boreal Forest',
    lastSeen: '3 days ago',
    confidence: 91,
    imageUrl: 'https://images.unsplash.com/photo-1729534988762-a6f62ef9ed8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjBjYW5vcHklMjBhZXJpYWwlMjB2aWV3fGVufDF8fHx8MTc1NzIwMjYyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  }
];

const biodiversityTrends = [
  { month: 'Jan', species: 2340, endangered: 234, stable: 1856, recovering: 250 },
  { month: 'Feb', species: 2355, endangered: 238, stable: 1860, recovering: 257 },
  { month: 'Mar', species: 2342, endangered: 245, stable: 1845, recovering: 252 },
  { month: 'Apr', species: 2328, endangered: 251, stable: 1830, recovering: 247 },
  { month: 'May', species: 2315, endangered: 258, stable: 1815, recovering: 242 },
  { month: 'Jun', species: 2301, endangered: 265, stable: 1798, recovering: 238 },
];

export function BiodiversityTracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [habitatFilter, setHabitatFilter] = useState('all');
  const [species, setSpecies] = useState<Species[]>(mockSpecies);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSpeciesData = async () => {
      setLoading(true);
      try {
        // Use mock data service for reliable demo
        const biodiversityData = mockDataService.getBiodiversityData();
        
        // Convert to component interface with images
        const convertedSpecies: Species[] = biodiversityData.map((speciesData, index) => ({
          id: speciesData.id,
          name: speciesData.name,
          scientificName: speciesData.scientificName,
          status: speciesData.status,
          population: speciesData.population,
          trend: speciesData.trend,
          habitat: speciesData.habitat,
          lastSeen: formatLastSeen(speciesData.lastSeen),
          confidence: Math.round(speciesData.confidence),
          imageUrl: mockSpecies[index % mockSpecies.length]?.imageUrl || mockSpecies[0].imageUrl
        }));
        
        setSpecies(convertedSpecies);
      } catch (error) {
        console.log('Error fetching species data:', error);
        setSpecies(mockSpecies);
      } finally {
        setLoading(false);
      }
    };

    fetchSpeciesData();
  }, []);

  const formatLastSeen = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critically_endangered': return 'destructive';
      case 'declining': return 'secondary';
      case 'stable': return 'default';
      case 'recovering': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <span className="w-4 h-4 text-gray-400">−</span>;
  };

  const filteredSpecies = species.filter(species => {
    const matchesSearch = species.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         species.scientificName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || species.status === statusFilter;
    const matchesHabitat = habitatFilter === 'all' || species.habitat.includes(habitatFilter);
    return matchesSearch && matchesStatus && matchesHabitat;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Species</p>
              <p className="text-2xl mt-1">2,301</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">-40 from last month</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Endangered</p>
              <p className="text-2xl mt-1">265</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">+7 from last month</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Stable</p>
              <p className="text-2xl mt-1">1,798</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600">●</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">-17 from last month</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Recovering</p>
              <p className="text-2xl mt-1">238</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">-4 from last month</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biodiversity Trends Chart */}
        <Card className="p-6">
          <h3 className="mb-4">Biodiversity Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={biodiversityTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="species" stroke="#3b82f6" strokeWidth={2} name="Total Species" />
              <Line type="monotone" dataKey="endangered" stroke="#dc2626" strokeWidth={2} name="Endangered" />
              <Line type="monotone" dataKey="recovering" stroke="#16a34a" strokeWidth={2} name="Recovering" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Species Status Distribution */}
        <Card className="p-6">
          <h3 className="mb-4">Species Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={biodiversityTrends.slice(-1)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="stable" fill="#22c55e" name="Stable" />
              <Bar dataKey="endangered" fill="#dc2626" name="Endangered" />
              <Bar dataKey="recovering" fill="#3b82f6" name="Recovering" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Species List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3>Species Monitoring</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search species..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="declining">Declining</SelectItem>
                <SelectItem value="critically_endangered">Critically Endangered</SelectItem>
                <SelectItem value="recovering">Recovering</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpecies.map((species) => (
            <Card key={species.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <ImageWithFallback
                  src={species.imageUrl}
                  alt={species.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="truncate">{species.name}</h4>
                    {getStatusIcon(species.trend)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 italic">{species.scientificName}</p>
                  <Badge variant={getStatusColor(species.status)} className="mb-2">
                    {species.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Population</span>
                  <span>{species.population.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trend</span>
                  <span className={species.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                    {species.trend > 0 ? '+' : ''}{species.trend}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Confidence</span>
                  <span>{species.confidence}%</span>
                </div>
                <Progress value={species.confidence} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{species.habitat}</span>
                  </div>
                  <div className="flex items-center">
                    <Camera className="w-3 h-3 mr-1" />
                    <span>{species.lastSeen}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}