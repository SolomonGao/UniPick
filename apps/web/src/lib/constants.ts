// 统一的 API 配置
export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8000';
export const MAPBOX_ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN || '';

// API 端点
export const API_ENDPOINTS = {
  base: API_BASE_URL,
  items: `${API_BASE_URL}/api/v1/items`,
  predictPrice: `${API_BASE_URL}/predict-price`,
  moderation: `${API_BASE_URL}/api/v1/moderation`,
} as const;
