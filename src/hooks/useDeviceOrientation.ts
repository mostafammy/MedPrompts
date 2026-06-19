'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DeviceOrientationData {
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
}

export type PermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<DeviceOrientationData>({
    beta: null,
    gamma: null,
    absolute: false,
  });

  const [permission, setPermission] = useState<PermissionStatus>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if device orientation is supported and if requestPermission API exists
    const hasRequestPermission =
      typeof DeviceOrientationEvent !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    if (hasRequestPermission) {
      const savedPermission = localStorage.getItem('medprompts_gyro_permission') as PermissionStatus | null;
      if (savedPermission) {
        setPermission(savedPermission);
      } else {
        setPermission('default');
      }
    } else if (typeof window.DeviceOrientationEvent !== 'undefined') {
      // Non-iOS devices (e.g. Android) or desktops that support deviceorientation
      setPermission('granted');
    } else {
      setPermission('unsupported');
    }
  }, []);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    setOrientation({
      beta: event.beta,
      gamma: event.gamma,
      absolute: event.absolute,
    });
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permission, handleOrientation]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    const hasRequestPermission =
      typeof DeviceOrientationEvent !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    if (hasRequestPermission) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (DeviceOrientationEvent as any).requestPermission();
        if (result === 'granted') {
          setPermission('granted');
          localStorage.setItem('medprompts_gyro_permission', 'granted');
          return true;
        } else {
          setPermission('denied');
          localStorage.setItem('medprompts_gyro_permission', 'denied');
          return false;
        }
      } catch (error) {
        console.error('Failed to request device orientation permission:', error);
        setPermission('denied');
        return false;
      }
    } else if (typeof window.DeviceOrientationEvent !== 'undefined') {
      setPermission('granted');
      return true;
    } else {
      setPermission('unsupported');
      return false;
    }
  }, []);

  return { orientation, permission, requestPermission };
}
