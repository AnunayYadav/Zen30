// Interface extension to handle iOS 13+ permission request
interface DeviceMotionEventiOS extends DeviceMotionEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export const PedometerService = {
  isSupported: () => typeof window !== 'undefined' && 'DeviceMotionEvent' in window,
  
  // iOS 13+ requires explicit permission triggered by a user interaction
  requestPermission: async (): Promise<PermissionState> => {
    // Cast the global DeviceMotionEvent to our custom interface to check for requestPermission
    const MotionEvent = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<PermissionState> };

    if (typeof MotionEvent.requestPermission === 'function') {
      try {
        const state = await MotionEvent.requestPermission();
        return state;
      } catch (e) {
        console.error("Pedometer permission error:", e);
        return 'denied';
      }
    }
    return 'granted';
  },

  start: (onStep: () => void) => {
    let lastMag = 0;
    let lastStepTime = 0;
    
    const handleMotion = (e: DeviceMotionEvent) => {
      // accelerationIncludingGravity is standard, but check for null
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      
      const { x, y, z } = acc;
      if (x === null || y === null || z === null) return;
      
      // Calculate magnitude of acceleration vector
      // Gravity is ~9.8 m/s^2. Walking adds acceleration.
      const mag = Math.sqrt(x*x + y*y + z*z);
      
      // Basic Peak Detection Algorithm
      // Threshold > 11.5 detects the "bounce" of a step (gravity + movement)
      // Delay check (350ms) prevents double counting a single step
      if (mag > 11.5 && lastMag <= 11.5 && (Date.now() - lastStepTime > 350)) {
        lastStepTime = Date.now();
        onStep();
      }
      lastMag = mag;
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }
};