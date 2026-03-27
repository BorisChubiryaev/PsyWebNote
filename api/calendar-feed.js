/**
 * PsyWebNote — Vercel Serverless Function
 * GET /api/calendar-feed?token=<cal_token>
 *
 * Returns an ICS calendar feed for the user identified by cal_token.
 * This URL can be used as a webcal:// subscription link in Apple Calendar / iOS Calendar.
 *
 * Security: cal_token is a random 32-byte hex string stored in profiles table.
 * No JWT required — the token itself is the credential (like a read-only API key).
 */

import { createClient } from '@supabase/supabase-js';

// Supabase service-role client (server-side only, never exposed to browser)
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

function escapeICS(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toUTCICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function foldLine(line) {
  // RFC 5545: fold lines longer than 75 octets
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (offset === 0) {
      parts.push(bytes.slice(0, 75).toString('utf8'));
      offset = 75;
    } else {
      parts.push(' ' + bytes.slice(offset, offset + 74).toString('utf8'));
      offset += 74;
    }
  }
  return parts.join('\r\n');
}

function buildEvent(apt) {
  const start = new Date(`${apt.date}T${apt.time}:00`);
  const durationMs = (apt.duration || 60) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  const stamp = new Date();

  const summary = `Session: ${apt.client_name}`;
  const modeLine = apt.is_online ? 'Format: Online' : 'Format: In person';
  const linkLine = apt.meeting_link ? `\nMeeting link: ${apt.meeting_link}` : '';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${apt.id}@psywebnote.app`,
    `DTSTAMP:${toUTCICSDate(stamp)}`,
    `DTSTART:${toUTCICSDate(start)}`,
    `DTEND:${toUTCICSDate(end)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(modeLine + linkLine)}`,
  ];

  if (apt.meeting_link) {
    lines.push(`URL:${escapeICS(apt.meeting_link)}`);
  }

  // Alarm: 15 minutes before
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS('Session reminder: ' + apt.client_name)}`,
    'END:VALARM'
  );

  lines.push('END:VEVENT');
  return lines.map(foldLine).join('\r\n');
}

function buildICS(appointments) {
  const sorted = [...appointments].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
  );

  const events = sorted.map(buildEvent);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PsyWebNote//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:PsyWebNote Sessions',
    'X-WR-TIMEZONE:UTC',
    'X-PUBLISHED-TTL:PT1H',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export default async function handler(req, res) {
  // CORS — allow any origin since this is a public calendar feed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string' || token.length < 32) {
    return res.status(400).json({ error: 'Invalid or missing token' });
  }

  try {
    const supabase = getSupabase();

    // 1. Find user by cal_token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('cal_token', token)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    const userId = profile.id;

    // 2. Fetch all non-cancelled appointments for this user
    const { data: appointments, error: aptsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (aptsError) {
      console.error('[calendar-feed] appointments error:', aptsError.message);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }

    const icsContent = buildICS(appointments || []);

    // Set headers for ICS response
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="psywebnote-calendar.ics"');
    // Cache for 1 hour — iOS Calendar will re-fetch periodically
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    return res.status(200).send(icsContent);
  } catch (err) {
    console.error('[calendar-feed] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
