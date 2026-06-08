import { apiClient } from './apiClient';

function buildParams(preset, dateFrom, dateTo) {
  const params = { preset };
  if (preset === 'custom') {
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo)   params.date_to   = dateTo;
  }
  return params;
}

export async function getAnalyticsKpiSummary(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/kpi-summary/', {
    params: buildParams(preset, dateFrom, dateTo),
  });
  return response.data;
}

export async function getAnalyticsThroughput(preset = 'today', groupBy = 'day', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/throughput/', {
    params: { ...buildParams(preset, dateFrom, dateTo), group_by: groupBy },
  });
  return response.data;
}

export async function getAnalyticsQueueDistribution(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/queue-distribution/', {
    params: buildParams(preset, dateFrom, dateTo),
  });
  return response.data;
}

export async function getAnalyticsProductVolume(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/product-volume/', {
    params: buildParams(preset, dateFrom, dateTo),
  });
  return response.data;
}

export async function getAnalyticsAvgTimeByTruckType(preset = 'today', groupBy = 'day', dateFrom, dateTo) {
  const response = await apiClient.get('/analytics/avg-time-by-truck-type/', {
    params: { ...buildParams(preset, dateFrom, dateTo), group_by: groupBy },
  });
  return response.data;
}
