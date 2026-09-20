import type { CalendarEvent } from '../types/types';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function foldLine(line: string): string {
  const maxLength = 75;
  const lines = [];
  let currentLine = line;
  while (currentLine.length > maxLength) {
    lines.push(currentLine.substring(0, maxLength));
    currentLine = ' ' + currentLine.substring(maxLength);
  }
  lines.push(currentLine);
  return lines.join('\r\n');
}

function escapeICSString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICSEvent(event: CalendarEvent): string {
  const dtStamp = formatICSDate(new Date());
  const dtStart = formatICSDate(event.startDate);
  const dtEnd = formatICSDate(event.endDate);
  const uid = Math.random().toString(36).substring(2) + Date.now().toString(36) + '@myfoodplanner.com';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICSString(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICSString(event.description)}` : null,
    event.location ? `LOCATION:${escapeICSString(event.location)}` : null,
    event.url ? `URL:${event.url}` : null,
    'END:VEVENT'
  ].filter(Boolean) as string[];

  return lines.map(foldLine).join('\r\n');
}

export function generateICSCalendar(events: CalendarEvent[]): string {
  const eventStrings = events.map(generateICSEvent);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My Food Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventStrings.flatMap(e => e.split('\r\n')),
    'END:VCALENDAR'
  ];
  return lines.join('\r\n');
}

export function downloadICS(events: CalendarEvent[], filename: string): void {
  const icsData = generateICSCalendar(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
