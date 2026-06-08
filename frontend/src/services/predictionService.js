import { apiClient } from './apiClient';

export async function getPredictionReport() {
  const response = await apiClient.get('/predictions/report/');
  return response.data;
}
