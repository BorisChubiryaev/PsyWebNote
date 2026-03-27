import { addMinutes } from 'date-fns';
import type { Language } from '../i18n';
import type { Appointment } from '../types';

const PROD_ID = '-//PsyWebNote//iOS Calendar Export//EN';

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toUTCICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function makeStartDate(appointment: Appointment): Date {
  return new Date(`${appointment.date}T${appointment.time}:00`);
}

function buildEvent(appointment: Appointment, language: Language): string {
  const start = makeStartDate(appointment);
  const end = addMinutes(start, appointment.duration);
  const stamp = new Date();

  const summary = language === 'en'
    ? `Session: ${appointment.clientName}`
    : `Сессия: ${appointment.clientName}`;

  const modeLine = appointment.isOnline
    ? (language === 'en' ? 'Format: Online' : 'Формат: Онлайн')
    : (language === 'en' ? 'Format: In person' : 'Формат: Очно');

  const linkLine = appointment.meetingLink
    ? `\n${language === 'en' ? 'Meeting link' : 'Ссылка на встречу'}: ${appointment.meetingLink}`
    : '';

  return [
    'BEGIN:VEVENT',
    `UID:${appointment.id}@psywebnote.app`,
    `DTSTAMP:${toUTCICSDate(stamp)}`,
    `DTSTART:${toUTCICSDate(start)}`,
    `DTEND:${toUTCICSDate(end)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(modeLine + linkLine)}`,
    appointment.meetingLink ? `URL:${escapeICS(appointment.meetingLink)}` : '',
    'END:VEVENT',
  ].filter(Boolean).join('\r\n');
}

export function buildAppointmentsIcs(
  appointments: Appointment[],
  language: Language,
): string {
  const events = [...appointments]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .map(appointment => buildEvent(appointment, language));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PROD_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function downloadIcs(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
