// Parses horario strings like "L-D 13:00–16:30 y 20:00–23:30. Cerrado martes."
// Returns true if the restaurant is currently open.

const DAY_MAP = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };

function parseTimeRange(str) {
  // Matches "13:00–16:30" or "13:00-16:30"
  const match = str.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return { from: match[1], to: match[2] };
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function nowInRange(from, to) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(from);
  const end = timeToMinutes(to);
  return current >= start && current <= end;
}

export function isOpen(horario) {
  if (!horario) return true; // No config → don't block
  const lower = horario.toLowerCase();

  // Check "cerrado [día]" for today
  const today = new Date().getDay(); // 0=Sun
  const closedMatch = lower.match(/cerrado\s+([a-záéíóúü]+)/i);
  if (closedMatch) {
    const closedWord = closedMatch[1];
    const dayNames = { lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6, domingo: 0 };
    if (dayNames[closedWord] === today) return false;
  }

  // Extract time ranges
  const ranges = [];
  const timeRegex = /(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/g;
  let match;
  while ((match = timeRegex.exec(horario)) !== null) {
    ranges.push({ from: match[1], to: match[2] });
  }

  if (ranges.length === 0) return true; // Can't parse → don't block
  return ranges.some(r => nowInRange(r.from, r.to));
}
