import React, { useState, useEffect, useCallback } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import { MapPin, Search, X, Navigation } from 'lucide-react';
import { MAPBOX_ACCESS_TOKEN } from '../lib/constants';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  locationName: string;
  onChange: (lat: number, lng: number, name: string) => void;
}

interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}

// Virginia Tech 默认位置
const DEFAULT_LOCATION = {
  lat: 37.2294,
  lng: -80.4139,
  name: 'Virginia Tech Campus'
};

export default function LocationPicker({ 
  latitude, 
  longitude, 
  locationName, 
  onChange 
}: LocationPickerProps) {
  const [viewState, setViewState] = useState<ViewState>({
    latitude: latitude || DEFAULT_LOCATION.lat,
    longitude: longitude || DEFAULT_LOCATION.lng,
    zoom: 15
  });
  const [markerPosition, setMarkerPosition] = useState({
    lat: latitude || DEFAULT_LOCATION.lat,
    lng: longitude || DEFAULT_LOCATION.lng
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 反向地理编码：坐标 → 地址名称
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!MAPBOX_ACCESS_TOKEN) return;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return 'Selected Location';
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return 'Selected Location';
    }
  }, []);

  // 搜索地址
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !MAPBOX_ACCESS_TOKEN) return;

    setIsLoading(true);
    setError(null);

    try {
      // 添加 proximity 参数优先返回 VT 附近的结果
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&proximity=-80.4139,37.2294&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const name = data.features[0].place_name;
        
        setViewState({ latitude: lat, longitude: lng, zoom: 16 });
        setMarkerPosition({ lat, lng });
        onChange(lat, lng, name);
      } else {
        setError('Location not found. Please try a different search term.');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 地图点击移动标记
  const handleMapClick = useCallback(async (e: mapboxgl.MapLayerMouseEvent) => {
    const { lat, lng } = e.lngLat;
    setMarkerPosition({ lat, lng });
    
    const name = await reverseGeocode(lat, lng);
    onChange(lat, lng, name);
  }, [onChange, reverseGeocode]);

  // 标记拖拽结束
  const handleMarkerDragEnd = useCallback(async (e: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = e.lngLat;
    setMarkerPosition({ lat, lng });
    
    const name = await reverseGeocode(lat, lng);
    onChange(lat, lng, name);
  }, [onChange, reverseGeocode]);

  // 浏览器定位成功
  const handleGeolocate = useCallback(async (e: { coords: { latitude: number; longitude: number } }) => {
    const { latitude: lat, longitude: lng } = e.coords;
    setMarkerPosition({ lat, lng });
    
    const name = await reverseGeocode(lat, lng);
    onChange(lat, lng, name);
  }, [onChange, reverseGeocode]);

  // 如果没有配置 Mapbox token，显示降级界面
  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">交易地点</label>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">地图功能未配置</span>
          </div>
          <input
            type="text"
            value={locationName}
            onChange={(e) => onChange(latitude, longitude, e.target.value)}
            placeholder="例如: VT Library, Blacksburg"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            当前使用文本输入。配置 PUBLIC_MAPBOX_TOKEN 后可启用地图选点功能。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        交易地点 <span className="text-red-500">*</span>
      </label>
      
      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search location (e.g., Squires Student Center)"
          className="w-full pl-10 pr-20 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <button
          type="submit"
          disabled={isLoading || !searchQuery.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? '...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="text-red-500 text-sm flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* 地图容器 */}
      <div className="relative h-[300px] rounded-xl overflow-hidden border border-gray-200">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={handleMapClick}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <GeolocateControl 
            position="top-right" 
            onGeolocate={handleGeolocate}
            trackUserLocation
          />
          
          <Marker
            latitude={markerPosition.lat}
            longitude={markerPosition.lng}
            draggable
            onDragEnd={handleMarkerDragEnd}
            anchor="bottom"
          >
            <div className="relative">
              <MapPin className="w-8 h-8 text-orange-600 drop-shadow-lg" fill="currentColor" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-600 rounded-full opacity-50" />
            </div>
          </Marker>
        </Map>

        {/* 提示文字 */}
        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-gray-600 shadow-sm">
          <div className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            Click map or drag pin to set location. Click 📍 to use your current position.
          </div>
        </div>
      </div>

      {/* 已选位置显示 */}
      {locationName && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
          <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <span className="font-medium">Selected:</span> {locationName}
          </div>
        </div>
      )}
    </div>
  );
}
