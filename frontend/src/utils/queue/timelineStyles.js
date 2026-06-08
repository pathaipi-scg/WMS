export function getStepClassName(stepIndex, currentStep) {
  if (stepIndex <= currentStep) {
    return 'bg-blue-600 text-white';
  }

  return 'bg-gray-200 text-gray-400';
}


export function getStepLabelClassName(stepIndex, currentStep) {
  if (stepIndex <= currentStep) {
    return 'text-gray-900';
  }

  return 'text-gray-500';
}


export function getTimelineProgressWidth(currentStep, totalSteps) {
  const normalizedStep = Number(currentStep);
  const normalizedTotalSteps = Number(totalSteps);

  if (!Number.isFinite(normalizedStep) || normalizedStep <= 1) {
    return '0%';
  }

  if (!Number.isFinite(normalizedTotalSteps) || normalizedTotalSteps <= 1) {
    return '0%';
  }

  const progressRatio = (normalizedStep - 1) / (normalizedTotalSteps - 1);
  const clampedProgressRatio = Math.max(0, Math.min(progressRatio, 1));

  return `calc((100% - 3rem) * ${clampedProgressRatio})`;
}
