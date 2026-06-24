import { ANALYTICS_SNAPSHOT_PATH, ANALYTICS_SOCKET_PATH } from '../features/analytics/constants';
import { apiClient } from './apiClient';
import { buildDateRangeParams } from './params';
import { buildSocketUrl } from './websocket';

// snapshot มุมมอง "วันนี้" (KPI + charts ทั้งหมด) — โครงเดียวกับที่ WS push
export async function getAnalyticsSnapshot() {
  const response = await apiClient.get(ANALYTICS_SNAPSHOT_PATH);
  return response.data;
}

export function getAnalyticsSocketUrl() {
  return buildSocketUrl(ANALYTICS_SOCKET_PATH);
}

export async function getAnalyticsKpiSummary(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/kpi-summary/', {
    params: buildDateRangeParams(preset, dateFrom, dateTo),
  });
  return response.data;
}

export async function getAnalyticsThroughput(preset = 'today', groupBy = 'day', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/throughput/', {
    params: { ...buildDateRangeParams(preset, dateFrom, dateTo), group_by: groupBy },
  });
  return response.data;
}

// ปริมาณรถเข้า แยกตามประเภทรถ (สำหรับกราฟเส้นหลายเส้น)
export async function getAnalyticsThroughputByTruckType(preset = 'today', groupBy = 'day', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/throughput-by-truck-type/', {
    params: { ...buildDateRangeParams(preset, dateFrom, dateTo), group_by: groupBy },
  });
  return response.data;
}

// รถเข้า/ออก รายชั่วโมง แยกตามประเภทรถ ({ in: [...], out: [...] })
export async function getAnalyticsHourlyInOut(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/hourly-in-out/', {
    params: buildDateRangeParams(preset, dateFrom, dateTo),
  });
  return response.data;
}

// การกระจายเวลารวมตามช่วงเวลา (box plot: min/q1/median/q3/max ต่อ period)
export async function getAnalyticsTimeDistribution(preset = 'today', groupBy = 'day', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/time-distribution/', {
    params: { ...buildDateRangeParams(preset, dateFrom, dateTo), group_by: groupBy },
  });
  return response.data;
}

// การกระจายเวลา 5 ช่วง แยกตามประเภทรถ (box plot) — { phases: { wait_call: {...}, ... } }
export async function getAnalyticsPhaseDistribution(preset = 'today', groupBy = 'day', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/phase-distribution/', {
    params: { ...buildDateRangeParams(preset, dateFrom, dateTo), group_by: groupBy },
  });
  return response.data;
}

export async function getAnalyticsQueueDistribution(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/queue-distribution/', {
    params: buildDateRangeParams(preset, dateFrom, dateTo),
  });
  return response.data;
}

export async function getAnalyticsProductVolume(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/product-volume/', {
    params: buildDateRangeParams(preset, dateFrom, dateTo),
  });
  return response.data;
}

export async function getAnalyticsAvgTimeByTruckType(preset = 'today', groupBy = 'day', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/avg-time-by-truck-type/', {
    params: { ...buildDateRangeParams(preset, dateFrom, dateTo), group_by: groupBy },
  });
  return response.data;
}

export async function getAnalyticsNotificationSummary(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/notification-summary/', {
    params: buildDateRangeParams(preset, dateFrom, dateTo),
  });
  return response.data;
}
