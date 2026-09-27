export function formatRelativeDate(
  dateInput: string | number | undefined,
  lang: 'te' | 'en' = 'en'
): string {
  if (!dateInput) return lang === 'te' ? 'ఇప్పుడే' : 'Just now';

  // If already a human friendly string (e.g. "Today, 6:30 AM" or "Just now")
  if (
    typeof dateInput === 'string' &&
    !dateInput.includes('T') &&
    !dateInput.includes('-') &&
    !/^\d+$/.test(dateInput)
  ) {
    if (lang === 'te') {
      if (dateInput.toLowerCase().includes('just now')) return 'ఇప్పుడే';
      if (dateInput.toLowerCase().includes('today')) return dateInput.replace(/today/i, 'ఈ రోజు');
      if (dateInput.toLowerCase().includes('yesterday')) return dateInput.replace(/yesterday/i, 'నిన్న');
    }
    return dateInput;
  }

  let timestamp: number;
  if (typeof dateInput === 'number') {
    timestamp = dateInput;
  } else if (/^\d+$/.test(dateInput)) {
    timestamp = parseInt(dateInput, 10);
  } else {
    timestamp = new Date(dateInput).getTime();
  }

  if (isNaN(timestamp)) {
    return String(dateInput);
  }

  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 45) {
    return lang === 'te' ? 'ఇప్పుడే' : 'Just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'te' ? `${diffMin} నిమిషాల క్రితం` : `${diffMin}m ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return lang === 'te' ? `${diffHours} గంటల క్రితం` : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return lang === 'te' ? 'నిన్న' : 'Yesterday';
  }
  if (diffDays < 7) {
    return lang === 'te' ? `${diffDays} రోజుల క్రితం` : `${diffDays}d ago`;
  }

  // Format date
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return date.toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-IN', options);
}
