function escapeHtml(value = '') {
  return value.replace(/[&<>"']/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return map[char] || char;
  });
}

function normalizeUrl(value) {
  if (!value) return '';
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function linkifyText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const escaped = escapeHtml(value);
  const urlPattern = /(https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?]/gi;

  return escaped.replace(urlPattern, (match) => {
    const href = normalizeUrl(match);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });
}
