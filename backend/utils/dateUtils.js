export class DateUtils {
  static getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  static getStartOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static getEndOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  static calculateWorkingHours(clockInTime, clockOutTime) {
    const start = new Date(clockInTime);
    const end = new Date(clockOutTime);
    const diffMs = end - start;
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // hours with 2 decimals
  }

  static isWorkingDay(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
  }

  static getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
  }

  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');

    const formats = {
      'YYYY-MM-DD': `${year}-${month}-${day}`,
      'DD-MM-YYYY': `${day}-${month}-${year}`,
      'YYYY-MM-DD HH:MM': `${year}-${month}-${day} ${hours}:${mins}`,
    };

    return formats[format] || formats['YYYY-MM-DD'];
  }
}