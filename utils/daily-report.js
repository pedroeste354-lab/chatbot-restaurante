import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import db from '../db/database.js';
import { getConfig } from './config.js';

function getTodayReservas() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return db.prepare(
    "SELECT * FROM reservas WHERE fecha = ? ORDER BY hora ASC"
  ).all(today);
}

function buildPDF(reservas, fecha) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const config = getConfig();
    const restaurante = config.nombre || 'Restaurante';
    const totalPersonas = reservas.reduce((s, r) => s + r.personas, 0);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text(restaurante.toUpperCase(), { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666')
       .text('INFORME DE RESERVAS', { align: 'center' });
    doc.fontSize(10).text(fecha, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').lineWidth(1).stroke();
    doc.moveDown(1);

    // Summary
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111')
       .text(`Total reservas: ${reservas.length}   ·   Total personas: ${totalPersonas}`);
    doc.moveDown(1);

    if (reservas.length === 0) {
      doc.fontSize(12).font('Helvetica').fillColor('#999')
         .text('No hay reservas para hoy.', { align: 'center' });
      doc.end();
      return;
    }

    // Table header
    const col = { hora: 50, nombre: 120, personas: 310, nota: 370, estado: 490 };
    const rowH = 22;
    let y = doc.y;

    doc.rect(50, y, 495, rowH).fill('#111');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.text('HORA',     col.hora,     y + 7, { width: 65 });
    doc.text('NOMBRE',   col.nombre,   y + 7, { width: 185 });
    doc.text('PERSONAS', col.personas, y + 7, { width: 55 });
    doc.text('NOTA',     col.nota,     y + 7, { width: 115 });
    doc.text('ESTADO',   col.estado,   y + 7, { width: 55 });
    y += rowH;

    reservas.forEach((r, i) => {
      const bg = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
      doc.rect(50, y, 495, rowH).fill(bg);
      doc.fontSize(9).font('Helvetica').fillColor('#222');
      doc.text(r.hora || '—',                col.hora,     y + 7, { width: 65 });
      doc.text(r.nombre || '—',              col.nombre,   y + 7, { width: 185 });
      doc.text(String(r.personas || 0),      col.personas, y + 7, { width: 55 });
      doc.text(r.nota || '—',                col.nota,     y + 7, { width: 115, ellipsis: true });
      doc.text(r.estado || 'pendiente',      col.estado,   y + 7, { width: 55 });
      y += rowH;
    });

    // Border around table
    doc.rect(50, doc.y - reservas.length * rowH - rowH, 495, reservas.length * rowH + rowH)
       .strokeColor('#ddd').lineWidth(0.5).stroke();

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#aaa')
       .text(`Generado automáticamente · ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

    doc.end();
  });
}

export async function sendDailyReport() {
  const config = getConfig();
  const to = config.report_email;
  if (!to) return;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    console.warn('[daily-report] SMTP_USER o SMTP_PASS no configurados');
    return;
  }

  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const reservas = getTodayReservas();
  const pdfBuffer = await buildPDF(reservas, fecha);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const fechaCorta = new Date().toLocaleDateString('es-ES');
  await transporter.sendMail({
    from: `"${config.nombre || 'Restaurante'}" <${smtpUser}>`,
    to,
    subject: `Reservas del día — ${fechaCorta} (${reservas.length} reservas · ${reservas.reduce((s,r)=>s+r.personas,0)} personas)`,
    text: `Adjunto el informe de reservas para hoy, ${fecha}.`,
    attachments: [{
      filename: `reservas-${fechaCorta.replace(/\//g,'-')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  console.log(`[daily-report] Enviado a ${to} · ${reservas.length} reservas`);
}
