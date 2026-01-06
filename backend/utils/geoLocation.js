import axios from "axios";

export class GeolocationService {
  static async getAddressFromCoordinates(latitude, longitude) {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            lat: latitude,
            lon: longitude,
            format: "json",
          },
          headers: {
            "User-Agent": "TrainerSyncApp/1.0 (contact@example.com)",
          },
        }
      );

      if (response.data && response.data.display_name) {
        return response.data.display_name;
      }

      return `${latitude}, ${longitude}`;
    } catch (error) {
      console.error("Geolocation error:", error.message);
      return `${latitude}, ${longitude}`;
    }
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
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

  
  static isWithinRadius(
    userLat,
    userLon,
    officeLat,
    officeLon,
    radiusKm = 0.5
  ) {
    const distance = this.calculateDistance(
      userLat,
      userLon,
      officeLat,
      officeLon
    );
    return distance <= radiusKm;
  }
}
