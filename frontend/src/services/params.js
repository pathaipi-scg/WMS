/**
 * Build query params for date-range endpoints.
 * date_from / date_to are only sent for the 'custom' preset.
 */
export function buildDateRangeParams(preset, dateFrom, dateTo) {
  const params = { preset };
  if (preset === 'custom') {
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
  }
  return params;
}
