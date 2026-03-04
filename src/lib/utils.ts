// Utility helper functions

/**
 * Generate a consistent color for a project based on its ID or name
 */
export const generateProjectColor = (seed: string | number): string => {
  const colors = [
    "#667eea", // Purple
    "#f56565", // Red
    "#48bb78", // Green
    "#4299e1", // Blue
    "#ed8936", // Orange
    "#9f7aea", // Purple variant
    "#38b2ac", // Teal
    "#ed64a6", // Pink
    "#ecc94b", // Yellow
    "#4fd1c5", // Cyan
    "#fc8181", // Light red
    "#68d391", // Light green
  ];

  const str = typeof seed === "string" ? seed : seed.toString();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Parse YYYY-MM-DD string to Date
 */
export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr + "T00:00:00");
};

/**
 * Get friendly date label (Today, Yesterday, Tomorrow, or formatted date)
 */
export const getDateLabel = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (formatDate(date) === formatDate(today)) return "Today";
  if (formatDate(date) === formatDate(yesterday)) return "Yesterday";
  if (formatDate(date) === formatDate(tomorrow)) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

/**
 * Calculate total hours for an array of entries
 */
export const calculateTotalHours = (
  entries: Array<{ hours: number }>,
): number => {
  return entries.reduce((sum, entry) => sum + entry.hours, 0);
};

/**
 * Group entries by date
 */
export const groupEntriesByDate = <T extends { date: string }>(
  entries: T[],
): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();

  entries.forEach((entry) => {
    const existing = grouped.get(entry.date) || [];
    grouped.set(entry.date, [...existing, entry]);
  });

  return grouped;
};

/**
 * Get date range array
 */
export const getDateRange = (startDate: Date, days: number): Date[] => {
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
};

/**
 * Check if date is weekend
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDate(date) === formatDate(today);
};

/**
 * Clamp a number between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Format hours display (e.g., 2.5 -> "2.5h", 1 -> "1h")
 */
export const formatHours = (hours: number): string => {
  return `${hours}h`;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

/**
 * Sort entries by date and time
 */
export const sortEntries = <T extends { date: string; created_at?: string }>(
  entries: T[],
): T[] => {
  return [...entries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;

    if (a.created_at && b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }

    return 0;
  });
};
