import { PREDICTIONS_SNAPSHOT_PATH, PREDICTIONS_SOCKET_PATH } from '../features/prediction/constants';
import { apiClient } from './apiClient';
import { buildDateRangeParams } from './params';
import { buildSocketUrl } from './websocket';

// snapshot มุมมอง "วันนี้" (prediction log + metrics timeseries) — โครงเดียวกับที่ WS push
export async function getPredictionsSnapshot() {
  const response = await apiClient.get(PREDICTIONS_SNAPSHOT_PATH);
  return response.data;
}

export function getPredictionsSocketUrl() {
  return buildSocketUrl(PREDICTIONS_SOCKET_PATH);
}

// model = { model, version } | null — กรองเฉพาะโมเดลที่เลือก (เว้นว่าง = ทุกโมเดล)
function buildModelParams(model) {
  if (!model?.model) return {};
  const params = { model: model.model };
  if (model.version != null) params.version = model.version;
  return params;
}

export async function getPredictionLog(preset = 'today', dateFrom, dateTo, model = null) {
  const response = await apiClient.get('/predictions/log/', {
    params: { ...buildDateRangeParams(preset, dateFrom, dateTo), ...buildModelParams(model) },
  });
  return response.data;
}

export async function getPredictionMetricsTimeseries(preset = 'today', groupBy = 'day', dateFrom, dateTo, model = null) {
  const response = await apiClient.get('/predictions/metrics-timeseries/', {
    params: { ...buildDateRangeParams(preset, dateFrom, dateTo), group_by: groupBy, ...buildModelParams(model) },
  });
  return response.data;
}

export async function getPredictionModels(preset = 'today', dateFrom, dateTo) {
  const response = await apiClient.get('/predictions/models/', {
    params: buildDateRangeParams(preset, dateFrom, dateTo),
  });
  return response.data;
}
