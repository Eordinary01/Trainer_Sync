export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');

  const formats = {
    'YYYY-MM-DD': `${year}-${month}-${day}`,
    'DD/MM/YYYY': `${day}/${month}/${year}`,
    'DD-MM-YYYY': `${day}-${month}-${year}`,
    'DD/MM/YYYY HH:MM': `${day}/${month}/${year} ${hours}:${mins}`,
    'YYYY-MM-DD HH:MM:SS': `${year}-${month}-${day} ${hours}:${mins}:${secs}`,
    'MM/DD/YYYY': `${month}/${day}/${year}`,
    'DD MMM YYYY': `${day} ${getMonthName(d.getMonth())} ${year}`,
    'DD MMM YYYY HH:MM': `${day} ${getMonthName(d.getMonth())} ${year} ${hours}:${mins}`,
    'Full Date': `${getDayName(d.getDay(), 'full')}, ${day} ${getMonthName(d.getMonth())} ${year}`,
    'Time Ago': getTimeAgo(date),
  };

  return formats[format] || formats['DD/MM/YYYY'];
};

export const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
};

export const formatTime12Hour = (date) => {
  if (!date) return '';
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
};

export const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const formatDurationDetailed = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days}d ${remainingHours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// ✅ ADDED: Get day name function
export const getDayName = (dateOrDayIndex, format = 'short') => {
  let dayIndex;
  
  if (typeof dateOrDayIndex === 'number') {
    // If a number is provided (0-6)
    dayIndex = dateOrDayIndex;
  } else if (dateOrDayIndex instanceof Date) {
    // If a Date object is provided
    dayIndex = dateOrDayIndex.getDay();
  } else if (typeof dateOrDayIndex === 'string' || typeof dateOrDayIndex === 'object') {
    // If a date string or object is provided
    const date = new Date(dateOrDayIndex);
    if (!isNaN(date.getTime())) {
      dayIndex = date.getDay();
    } else {
      return 'Invalid Date';
    }
  } else {
    return 'Invalid Input';
  }
  
  const days = {
    short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    medium: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    min: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  };
  
  const dayFormats = days[format] || days['short'];
  return dayFormats[dayIndex] || 'Invalid Day';
};

// ✅ Helper: Get month name
const getMonthName = (monthIndex) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex] || '';
};

// ✅ Helper: Get time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

// ✅ Helper: Check if date is today
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

// ✅ Helper: Check if date is yesterday
export const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === yesterday.getDate() &&
    checkDate.getMonth() === yesterday.getMonth() &&
    checkDate.getFullYear() === yesterday.getFullYear()
  );
};

// ✅ Helper: Check if date is in the past
export const isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};

// ✅ Helper: Check if date is in the future
export const isFutureDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate > today;
};

// ✅ Helper: Get date difference in days
export const getDateDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ✅ Helper: Add days to a date
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// ✅ Helper: Format date range
export const formatDateRange = (startDate, endDate, format = 'DD/MM/YYYY') => {
  if (!startDate || !endDate) return '';
  
  const start = formatDate(startDate, format);
  const end = formatDate(endDate, format);
  
  // If same day, show date only once
  if (start === end) {
    return start;
  }
  
  return `${start} - ${end}`;
};