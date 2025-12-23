/**
 * Utility functions for date formatting
 */

/**
 * Format a date to YYYY-MM-DD format (date only, no time)
 * Accepts Date object, ISO string, or date string
 */
export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof date === 'string') {
      // Check if it's already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // If it contains 'T', split and take only the date part
      if (date.includes('T')) {
        return date.split('T')[0];
      }
    }
    
    // Convert to Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Format as YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Parse a date string (YYYY-MM-DD) and ensure it's in the correct format
 * Returns empty string if invalid
 */
export function parseDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Try to format it
  return formatDateOnly(dateString);
}

