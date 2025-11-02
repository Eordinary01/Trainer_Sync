import axios from 'axios';
import { envConfig } from '../config/environment.js';

export class GeolocationService {
  static async getAddressFromCoordinates(latitude, longitude) {
    if (!envConfig.GOOGLE_MAPS_API_KEY) {
      return `${latitude}, ${longitude}`;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json`;
      const response = await axios.get(url, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: envConfig.GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }
      return `${latitude}, ${longitude}`;
    } catch (error) {
      console.error('Geolocation error:', error.message);
      return `${latitude}, ${longitude}`;
    }
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static isWithinRadius(userLat, userLon, officeLat, officeLon, radiusKm = 0.5) {
    const distance = this.calculateDistance(userLat, userLon, officeLat, officeLon);
    return distance <= radiusKm;
  }
}