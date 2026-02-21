import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import { MapPin, Search, X, Navigation, Map as MapIcon, Type } from 'lucide-react';
import { MAPBOX_ACCESS_TOKEN } from '../lib/constants';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  locationName: string;
  onChange: (lat: number, lng: number, name: string, isPrivate?: boolean) => void;
  isPrivate?: boolean;
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

// 调试日志
console.log('LocationPicker - MAPBOX_ACCESS_TOKEN:', MAPBOX_ACCESS_TOKEN ? '已配置' : '未配置');
console.log('LocationPicker - Token 格式:', MAPBOX_ACCESS_TOKEN?.startsWith('pk.') ? '有效' : '无效');

export default function LocationPicker({ 
  latitude, 
  longitude, 
  locationName, 
  onChange,
  isPrivate = false
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
  const [showMap, setShowMap] = useState(true); // 控制是否显示地图
  const [manualInput, setManualInput] = useState(locationName || '');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationPrivate, setIsLocationPrivate] = useState(isPrivate);

  // 获取用户当前位置并设置为初始位置
  useEffect(() => {
    if (!navigator.geolocation) {
      console.log('浏览器不支持地理定位，使用默认位置');
      // 使用默认位置并获取名称
      if (!locationName) {
        reverseGeocode(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng).then(name => {
          setManualInput(name);
          onChange(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, name);
        });
      }
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('获取到用户位置:', latitude, longitude);
        
        // 更新地图视图和标记位置
        setViewState({ latitude, longitude, zoom: 15 });
        setMarkerPosition({ lat: latitude, lng: longitude });
        
        // 获取位置名称
        reverseGeocode(latitude, longitude).then(name => {
          setManualInput(name);
          onChange(latitude, longitude, name);
          setIsLocating(false);
        });
      },
      (error) => {
        console.error('获取位置失败:', error);
        setIsLocating(false);
        // 使用默认位置
        if (!locationName) {
          reverseGeocode(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng).then(name => {
            setManualInput(name);
            onChange(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, name);
          });
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // 反向地理编码：坐标 → 地址名称
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn('Mapbox token not configured');
      return DEFAULT_LOCATION.name;
    }
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
      );
      
      if (!response.ok) {
        console.error('Geocoding API error:', response.status, response.statusText);
        return DEFAULT_LOCATION.name;
      }
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return DEFAULT_LOCATION.name;
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return DEFAULT_LOCATION.name;
    }
  }, []);

  // 搜索地址
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !MAPBOX_ACCESS_TOKEN) {
      setError('Please enter a location to search');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 添加 proximity 参数优先返回 VT 附近的结果
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&proximity=-80.4139,37.2294&limit=1`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const name = data.features[0].place_name;
        
        setViewState({ latitude: lat, longitude: lng, zoom: 16 });
        setMarkerPosition({ lat, lng });
        setManualInput(name);
        onChange(lat, lng, name);
      } else {
        setError('Location not found. Please try a different search term.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 文字输入位置搜索
  const handleManualInputSearch = async () => {
    if (!manualInput.trim() || !MAPBOX_ACCESS_TOKEN) {
      // 没有输入或没有token，直接保存文本
      onChange(latitude, longitude, manualInput, isLocationPrivate);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 使用 Mapbox Geocoding API 搜索地址
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(manualInput)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&proximity=-80.4139,37.2294&limit=1`
      );
      
      if (!response.ok) {
        throw new Error(`搜索失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const name = data.features[0].place_name;
        
        // 更新地图视图（如果切换到地图模式）
        setViewState({ latitude: lat, longitude: lng, zoom: 16 });
        setMarkerPosition({ lat, lng });
        setManualInput(name);
        
        // 保存带坐标的位置
        onChange(lat, lng, name, isLocationPrivate);
        
        // 显示成功提示
        setError(null);
      } else {
        // 未找到地址，只保存文本
        onChange(latitude, longitude, manualInput, isLocationPrivate);
        setError('未找到该地址的精确位置，将使用文字描述');
      }
    } catch (err: any) {
      console.error('地址搜索失败:', err);
      // 搜索失败，只保存文本
      onChange(latitude, longitude, manualInput, isLocationPrivate);
      setError('地址搜索失败，将使用文字描述保存');
    } finally {
      setIsLoading(false);
    }
  };

  // 手动输入变化（实时更新）
  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualInput(e.target.value);
  };

  // 切换位置保密
  const handlePrivacyToggle = () => {
    const newPrivacy = !isLocationPrivate;
    setIsLocationPrivate(newPrivacy);
    onChange(latitude, longitude, locationName || manualInput, newPrivacy);
  };

  // 地图点击移动标记
  const handleMapClick = useCallback(async (e: mapboxgl.MapLayerMouseEvent) => {
    const { lat, lng } = e.lngLat;
    setMarkerPosition({ lat, lng });
    
    const name = await reverseGeocode(lat, lng);
    setManualInput(name);
    onChange(lat, lng, name);
  }, [onChange, reverseGeocode]);

  // 标记拖拽结束
  const handleMarkerDragEnd = useCallback(async (e: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = e.lngLat;
    setMarkerPosition({ lat, lng });
    
    const name = await reverseGeocode(lat, lng);
    setManualInput(name);
    onChange(lat, lng, name);
  }, [onChange, reverseGeocode]);

  // 浏览器定位成功
  const handleGeolocate = useCallback(async (e: { coords: { latitude: number; longitude: number } }) => {
    const { latitude: lat, longitude: lng } = e.coords;
    setMarkerPosition({ lat, lng });
    
    const name = await reverseGeocode(lat, lng);
    setManualInput(name);
    onChange(lat, lng, name);
  }, [onChange, reverseGeocode]);

  // 检查 Mapbox token 是否有效（简单检查格式）
  const isTokenValid = MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN.startsWith('pk.');
  
  // 如果没有配置 Mapbox token，显示文本输入
  if (!isTokenValid) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          交易地点 <span className="text-red-500">*</span>
        </label>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">
              {MAPBOX_ACCESS_TOKEN ? 'Mapbox Token 无效' : '地图功能未配置'}
            </span>
          </div>
          <input
            type="text"
            value={manualInput}
            onChange={handleManualInputChange}
            placeholder="例如: VT Library, Blacksburg"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none dark:bg-gray-800 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {MAPBOX_ACCESS_TOKEN 
              ? 'Token 格式不正确。请检查 .env 文件中的 PUBLIC_MAPBOX_TOKEN。'
              : '当前使用文本输入。配置 PUBLIC_MAPBOX_TOKEN 后可启用地图选点功能。'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        交易地点 <span className="text-red-500">*</span>
      </label>
      
      {/* 切换输入方式 */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            showMap 
              ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          地图选点
        </button>
        <button
          type="button"
          onClick={() => setShowMap(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            !showMap 
              ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <Type className="w-4 h-4" />
          文字输入
        </button>
      </div>

      {showMap ? (
        <>
          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索地点（如：Squires Student Center）"
              className="w-full pl-10 pr-24 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none dark:bg-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '...' : '搜索'}
            </button>
          </form>

          {error && (
            <div className="text-red-500 text-sm flex items-center gap-1 bg-red-50 p-2 rounded-lg">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 地图容器 */}
          <div className="relative h-[300px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {(isLocating || !mapLoaded) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">{isLocating ? '获取您的位置...' : '加载地图中...'}</span>
                </div>
              </div>
            )}
            <Map
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              onClick={handleMapClick}
              onLoad={() => {
                console.log('Map loaded successfully');
                setMapLoaded(true);
              }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
              style={{ width: '100%', height: '100%' }}
              onError={(e) => {
                console.error('Mapbox error:', e);
                setError('地图加载失败，请检查网络连接或 Mapbox Token 是否有效');
                setMapLoaded(true);
              }}
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
            <div className="absolute bottom-2 left-2 right-2 bg-white dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 shadow-sm">
              <div className="flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                点击地图或拖动标记设置位置，点击 📍 使用当前位置
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 文字输入模式 */}
          <div className="relative">
            <input
              type="text"
              value={manualInput}
              onChange={handleManualInputChange}
              placeholder="例如: VT Library, Squires Student Center, Blacksburg"
              className="w-full px-3 py-2 pr-24 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none dark:bg-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              type="button"
              onClick={handleManualInputSearch}
              disabled={isLoading || !manualInput.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '搜索中...' : '搜索位置'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            输入地址后点击"搜索位置"可自动获取精确坐标。如果不搜索，将只保存文字描述。
          </p>
        </>
      )}

      {/* 位置保密选项 */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <input
          type="checkbox"
          id="location-private"
          checked={isLocationPrivate}
          onChange={handlePrivacyToggle}
          className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
        />
        <label htmlFor="location-private" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          保密交易地点（仅显示大致区域，保护隐私）
        </label>
      </div>

      {/* 已选位置显示 */}
      {locationName && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
          <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">已选位置：</span> {locationName}
          </div>
        </div>
      )}
    </div>
  );
}
