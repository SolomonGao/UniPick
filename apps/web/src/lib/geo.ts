/**
 * 地理位置工具函数
 * 用于处理距离计算和模糊位置显示
 */

// 地球半径
const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MILES = 3959;

/**
 * 计算两点之间的距离（Haversine公式）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'km' | 'miles' = 'miles'
): number {
  const R = unit === 'miles' ? EARTH_RADIUS_MILES : EARTH_RADIUS_KM;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * 格式化距离显示
 */
export function formatDistance(distanceMiles: number): string {
  if (distanceMiles < 0.1) {
    return `${Math.round(distanceMiles * 5280)} ft`;
  } else if (distanceMiles < 1) {
    return `${distanceMiles.toFixed(2)} miles`;
  } else if (distanceMiles < 10) {
    return `${distanceMiles.toFixed(1)} miles`;
  } else {
    return `${Math.round(distanceMiles)} miles`;
  }
}

/**
 * 获取模糊位置描述（隐私保护）
 * 1 mile 内显示模糊位置
 */
export function getFuzzyLocation(distanceMiles: number): string {
  if (distanceMiles < 0.5) {
    return 'Very close (within 0.5 miles)';
  } else if (distanceMiles < 1) {
    return 'Within 1 mile';
  } else if (distanceMiles < 2) {
    return 'Within 2 miles';
  } else if (distanceMiles < 5) {
    return 'Within 5 miles';
  } else if (distanceMiles < 10) {
    return 'Within 10 miles';
  } else if (distanceMiles < 25) {
    return 'Within 25 miles';
  } else {
    return `${Math.round(distanceMiles)} miles away`;
  }
}

/**
 * 获取位置显示文本
 * 优先使用后端返回的模糊位置，如果没有则自己计算
 */
export function getLocationDisplay(
  item: {
    location_fuzzy?: string;
    distance?: number;
    distance_display?: string;
    location_name?: string;
  },
  userLocation?: { lat: number; lng: number }
): string {
  // 优先使用后端返回的模糊位置
  if (item.location_fuzzy) {
    return item.location_fuzzy;
  }
  
  // 如果有距离信息，显示模糊距离
  if (item.distance !== undefined && item.distance !== null) {
    // 后端返回的是 km，转换为 miles
    const distanceMiles = item.distance * 0.621371;
    return getFuzzyLocation(distanceMiles);
  }
  
  // 如果有位置名称，显示简化版
  if (item.location_name) {
    // 只显示主要部分，保护隐私
    const parts = item.location_name.split(',');
    if (parts.length > 2) {
      return parts.slice(0, 2).join(',');
    }
    return item.location_name;
  }
  
  return 'Location not specified';
}

/**
 * 判断是否应该显示精确位置
 * 只有在用户自己的商品或者距离较远时才显示
 */
export function shouldShowExactLocation(
  distanceMiles: number,
  isOwner: boolean
): boolean {
  // 如果是自己的商品，可以显示精确位置
  if (isOwner) return true;
  
  // 如果距离超过 1 mile，可以显示更精确的位置
  return distanceMiles > 1;
}

/**
 * 从浏览器获取当前位置
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * 保存用户位置到 localStorage
 */
export function saveUserLocation(lat: number, lng: number): void {
  localStorage.setItem('unipick_user_location', JSON.stringify({ lat, lng, timestamp: Date.now() }));
}

/**
 * 从 localStorage 获取用户位置
 */
export function getUserLocation(): { lat: number; lng: number } | null {
  const saved = localStorage.getItem('unipick_user_location');
  if (!saved) return null;
  
  try {
    const location = JSON.parse(saved);
    // 检查是否过期（24小时）
    const age = Date.now() - location.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('unipick_user_location');
      return null;
    }
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}
