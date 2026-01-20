/**
 * Custom hook for haptic feedback on mobile devices
 * Uses the Vibration API when available
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const hapticPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 20],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
  selection: 5,
};

export function useHaptic() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = (type: HapticType = 'light') => {
    if (!isSupported) return false;
    
    try {
      const pattern = hapticPatterns[type];
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  };

  const light = () => trigger('light');
  const medium = () => trigger('medium');
  const heavy = () => trigger('heavy');
  const success = () => trigger('success');
  const warning = () => trigger('warning');
  const error = () => trigger('error');
  const selection = () => trigger('selection');

  return {
    isSupported,
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
  };
}

// Standalone function for use outside React components
export function triggerHaptic(type: HapticType = 'light') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false;
  
  try {
    const pattern = hapticPatterns[type];
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}
