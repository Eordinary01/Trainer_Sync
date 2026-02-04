import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  /**
   * Get user's current location (COORDINATES ONLY)
   * Backend will fetch address from these coordinates
   */
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);

      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by this browser.';
        setError(errorMsg);
        setLoading(false);
        reject(new Error(errorMsg));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: parseFloat(position.coords.latitude.toFixed(6)),
            longitude: parseFloat(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy),
            timestamp: position.timestamp,
          };

          setLocation(newLocation);
          setLoading(false);
          setError(null);
          resolve(newLocation);
        },
        (error) => {
          const errorMessage = getErrorMessage(error);
          setError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          ...options,
        }
      );
    });
  };

  /**
   * Start continuous location tracking (coordinates only)
   */
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setLoading(true);
    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
        };

        setLocation(newLocation);
        setLoading(false);
        setError(null);
      },
      (error) => {
        const errorMessage = getErrorMessage(error);
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      }
    );
  };

  /**
   * Stop location tracking
   */
  const stopTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    console.log('📍 Location tracking stopped');
  };

  /**
   * Convert geolocation error codes to user-friendly messages
   */
  const getErrorMessage = (error) => {
    if (!error) return 'Unknown error occurred';

    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return 'Location access denied. Please enable location permissions in your browser settings.';
      case 2: // POSITION_UNAVAILABLE
        return 'Location information is unavailable. Please check your GPS/location services.';
      case 3: // TIMEOUT
        return 'Location request timed out. Please try again.';
      default:
        return error.message || 'An unknown error occurred while getting location.';
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return {
    location, // { latitude, longitude, accuracy, timestamp }
    loading,
    error,
    getLocation,
    startTracking,
    stopTracking,
  };
};