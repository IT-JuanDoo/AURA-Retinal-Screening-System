/**
 * Date utility functions for AURA system
 * All dates are formatted in Vietnam timezone (UTC+7)
 */

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format date to Vietnamese locale with UTC+7 timezone
 */
export const formatDateVN = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return dateObj.toLocaleDateString('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    ...options,
  });
};

/**
 * Format date and time to Vietnamese locale with UTC+7 timezone
 */
export const formatDateTimeVN = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return dateObj.toLocaleString('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
};

/**
 * Format time only to Vietnamese locale with UTC+7 timezone
 */
export const formatTimeVN = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return dateObj.toLocaleTimeString('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
};

/**
 * Get current date in Vietnam timezone
 */
export const getCurrentDateVN = (): Date => {
  const now = new Date();
  // Convert to Vietnam timezone
  const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
  return vietnamTime;
};

/**
 * Format date for display with relative time (Hôm nay, Hôm qua, etc.)
 */
export const formatDateRelativeVN = (dateString?: string): string => {
  if (!dateString) return 'Không xác định';
  
  const date = new Date(dateString);
  const today = getCurrentDateVN();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time to compare dates only
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Hôm nay';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Hôm qua';
  } else {
    return formatDateVN(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
};

/**
 * Format date for ISO string (YYYY-MM-DD) in Vietnam timezone
 */
export const formatDateISO = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  // Get date in Vietnam timezone
  const vnDate = new Date(dateObj.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
  const year = vnDate.getFullYear();
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
