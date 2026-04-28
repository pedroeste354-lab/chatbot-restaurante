import nodemailer from 'nodemailer';

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function send(subject, html) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  const transporter = createTransporter();
  if (!transporter) return;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function notifyReserva(reserva) {
  await send(
    `🍽️ Nueva reserva — ${reserva.nombre}`,
    `<h2>Nueva reserva</h2>
     <p><b>Nombre:</b> ${reserva.nombre}</p>
     <p><b>Fecha:</b> ${reserva.fecha} a las ${reserva.hora}</p>
     <p><b>Personas:</b> ${reserva.personas}</p>
     ${reserva.nota ? `<p><b>Nota:</b> ${reserva.nota}</p>` : ''}`,
  );
}

export async function notifyOrder(order) {
  const items = JSON.parse(order.items || '[]')
    .map(i => `<li>${i.nombre} x${i.cantidad} — ${i.precio}</li>`)
    .join('');
  await send(
    `🛒 Nuevo pedido — ${order.cliente_nombre}`,
    `<h2>Nuevo pedido</h2>
     <p><b>Cliente:</b> ${order.cliente_nombre} (${order.cliente_email})</p>
     <p><b>Tipo:</b> ${order.tipo}${order.direccion ? ` — ${order.direccion}` : ''}</p>
     <p><b>Pago:</b> ${order.pago}</p>
     <ul>${items}</ul>
     <p><b>Total:</b> ${order.total}€</p>`,
  );
}
