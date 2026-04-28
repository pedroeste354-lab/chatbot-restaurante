const chatHistory = [];
const MAX_HISTORY = 20;

const SUGGESTIONS = {
  default:     ['📅 Reservar mesa', '🍽️ Ver la carta', '🕐 Horario', '📍 ¿Dónde estáis?'],
  reserva:     ['Para hoy', 'Para este fin de semana', 'Para 2 personas', 'Para una ocasión especial'],
  carta:       ['¿Tenéis menú del día?', '¿Opciones veganas?', '¿Precio medio?', '📅 Reservar mesa'],
  horario:     ['¿Abríis los domingos?', '¿Y en festivos?', '📅 Reservar mesa'],
  ubicacion:   ['¿Hay parking?', '¿Cómo llegar en metro?', '📅 Reservar mesa'],
  confirmacion:['¡Hasta pronto! 👋', '¿Puedo cambiar la reserva?', '🍽️ Ver la carta'],
};

function detectContext(text) {
  const t = text.toLowerCase();
  if (t.includes('reserva') || t.includes('mesa') || t.includes('nombre') || t.includes('fecha') || t.includes('hora') || t.includes('personas')) return 'reserva';
  if (t.includes('carta') || t.includes('plato') || t.includes('menú') || t.includes('comer') || t.includes('postre') || t.includes('entrante')) return 'carta';
  if (t.includes('horario') || t.includes('hora') || t.includes('abre') || t.includes('cierra')) return 'horario';
  if (t.includes('dirección') || t.includes('dónde') || t.includes('ubicación') || t.includes('llegar')) return 'ubicacion';
  if (t.includes('confirmad') || t.includes('whatsapp') || t.includes('pronto') || t.includes('hasta')) return 'confirmacion';
  return 'default';
}

function toggleChat() {
  document.getElementById('chat-widget').classList.toggle('open');
}

function openReserva() {
  document.getElementById('chat-widget').classList.add('open');
  sendChipMessage('Quiero reservar una mesa');
}

function useChip(btn) {
  const text = btn.textContent.trim().replace(/^[^\w¿¡]+/, '').trim();
  btn.closest('.chat-suggestions').remove();
  sendChipMessage(text || btn.textContent.trim());
}

function sendChipMessage(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

function addMessage(text, role) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function addTyping() {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg bot typing';
  div.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function addSuggestions(context) {
  const chips = SUGGESTIONS[context] || SUGGESTIONS.default;
  const box = document.getElementById('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = 'chat-suggestions';
  chips.forEach(label => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = label;
    btn.onclick = () => useChip(btn);
    wrap.appendChild(btn);
  });
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Remove existing suggestions
  document.querySelectorAll('.chat-suggestions').forEach(el => el.remove());

  input.value = '';
  addMessage(text, 'user');
  chatHistory.push({ role: 'user', content: text });
  if (chatHistory.length > MAX_HISTORY) chatHistory.splice(0, 2);

  const typing = addTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory.slice(0, -1) }),
    });
    const data = await res.json();
    const reply = data.reply || 'Lo siento, ha habido un error.';
    typing.remove();
    addMessage(reply, 'bot');
    chatHistory.push({ role: 'assistant', content: reply });
    addSuggestions(detectContext(reply + ' ' + text));
  } catch {
    typing.remove();
    addMessage('Error de conexión. Inténtalo de nuevo.', 'bot');
  }
}
