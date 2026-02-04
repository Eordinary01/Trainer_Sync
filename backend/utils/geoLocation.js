import axios from "axios";

/**
 * Backend GeolocationService
 * Purpose: Get human-readable address from coordinates
 * No radius checking - trainers can clock in from anywhere
 */
export class GeolocationService {
  /**
   * Get address from coordinates using free APIs
   * Tries Nominatim first, falls back to geocode.maps.co
   */
  static async getAddressFromCoordinates(latitude, longitude) {
    try {
      // Validate coordinates
      if (!this.isValidCoordinates(latitude, longitude)) {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      // Try Nominatim (OpenStreetMap) - most reliable
      try {
        const response = await axios.get(
          "https://nominatim.openstreetmap.org/reverse",
          {
            params: {
              lat: latitude,
              lon: longitude,
              format: "json",
              zoom: 18,
            },
            headers: {
              "User-Agent": "TrainerSync/1.0 (attendance-tracking)",
            },
            timeout: 5000,
          }
        );

        if (response.data?.display_name) {
          console.log("✅ Address fetched from Nominatim");
          return response.data.display_name;
        }
      } catch (nominatimError) {
        console.warn("⚠️ Nominatim failed, trying fallback...");
      }

      // Fallback to geocode.maps.co
      try {
        const fallbackResponse = await axios.get(
          "https://geocode.maps.co/reverse",
          {
            params: {
              lat: latitude,
              lon: longitude,
              format: "json",
            },
            timeout: 5000,
          }
        );

        if (fallbackResponse.data?.display_name) {
          console.log("✅ Address fetched from geocode.maps.co");
          return fallbackResponse.data.display_name;
        }
      } catch (fallbackError) {
        console.warn("⚠️ Fallback geocoding failed");
      }

      // Return coordinates if all APIs fail
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error("❌ Address fetch error:", error.message);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  /**
   * Validate if coordinates are valid
   */
  static isValidCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;

    return true;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Useful for reporting/analytics but not for clock-in restriction
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    try {
      if (
        !this.isValidCoordinates(lat1, lon1) ||
        !this.isValidCoordinates(lat2, lon2)
      ) {
        console.error("❌ Invalid coordinates provided");
        return null;
      }

      const R = 6371; // Earth's radius in kilometers

      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return parseFloat(distance.toFixed(3));
    } catch (error) {
      console.error("❌ Distance calculation error:", error.message);
      return null;
    }
  }
}