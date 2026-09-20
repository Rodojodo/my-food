import type { WeekPlan, ShoppingItem, Recipe, CalendarEvent, SemesterPlan, DayOfWeek } from '../types/types';
import { downloadICS } from '../utils/icsGenerator';
import { addDays } from 'date-fns';

// ============================================================
// Google Calendar Integration (GIS OAuth2)
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;

let tokenClient: any;
let accessToken: string | null = null;

export function initGoogleAuth(clientId: string): void {
  if (typeof google === 'undefined') {
    console.warn('Google Identity Services SDK not loaded');
    return;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    callback: (tokenResponse: any) => {
      if (tokenResponse?.access_token) {
        accessToken = tokenResponse.access_token;
      }
    },
  });
}

async function ensureAuth(): Promise<string> {
  if (accessToken) return accessToken;
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Auth not initialized. Call initGoogleAuth first.'));
      return;
    }
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(new Error(resp.error));
      } else {
        accessToken = resp.access_token;
        resolve(resp.access_token);
      }
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function addShoppingEvent(weekPlan: WeekPlan, items: ShoppingItem[]): Promise<string> {
  const token = await ensureAuth();

  const event = {
    summary: `🛒 Shopping - Week ${weekPlan.weekNumber}`,
    description: `<b>Shopping List for Week ${weekPlan.weekNumber}</b><br><br>${items.map(item => `• ${item.amount || ''} ${item.unit || ''} ${item.name}`).join('<br>')}`,
    start: { date: weekPlan.startDate },
    end: { date: weekPlan.startDate },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 60 }],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`Calendar API error: ${response.status}`);
  const data = await response.json();
  return data.htmlLink;
}

export async function addCookingEvent(recipe: Recipe, date: Date, servings: number): Promise<string> {
  const token = await ensureAuth();

  const endDate = new Date(date);
  endDate.setMinutes(endDate.getMinutes() + (recipe.totalTime || 60));
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const ingredientsList = recipe.ingredients
    .map(i => `• ${i.amount} ${i.unit} ${i.name}`)
    .join('<br>');

  const methodList = recipe.method
    .map(s => `${s.stepNumber}. ${s.instruction}`)
    .join('<br>');

  const event = {
    summary: `🍳 Cook: ${recipe.name}`,
    description: `
      <b>${recipe.name}</b><br><br>
      <b>Servings:</b> ${servings}<br>
      <b>Total Time:</b> ${recipe.totalTime} min<br><br>
      <b>Ingredients:</b><br>${ingredientsList}<br><br>
      <b>Method:</b><br>${methodList}
      ${recipe.sourceUrl ? `<br><br><a href="${recipe.sourceUrl}">View original recipe</a>` : ''}
    `.trim(),
    start: { dateTime: date.toISOString(), timeZone: tz },
    end: { dateTime: endDate.toISOString(), timeZone: tz },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 30 }],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`Calendar API error: ${response.status}`);
  const data = await response.json();
  return data.htmlLink;
}

// ============================================================
// ICS Export Functions
// ============================================================

const DAY_OFFSETS: Record<DayOfWeek, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
};

export function exportWeekToICS(weekPlan: WeekPlan, recipes: Recipe[], items: ShoppingItem[]): void {
  const events: CalendarEvent[] = [];
  const weekStart = new Date(weekPlan.startDate);

  // Shopping event
  const shoppingDesc = items
    .filter(i => !i.checked)
    .map(i => `${i.amount || ''} ${i.unit || ''} ${i.name}`.trim())
    .join('\n');

  events.push({
    title: `🛒 Shopping - Week ${weekPlan.weekNumber}`,
    description: shoppingDesc,
    startDate: weekStart,
    endDate: weekStart,
  });

  // Cooking events for each meal slot
  for (const slot of weekPlan.mealSlots) {
    if (!slot.recipeId) continue;
    const recipe = recipes.find(r => r.id === slot.recipeId);
    if (!recipe) continue;

    const dayOffset = DAY_OFFSETS[slot.dayOfWeek] || 0;
    const cookDate = addDays(weekStart, dayOffset);
    cookDate.setHours(18, 0, 0, 0); // Default 6 PM

    const endDate = new Date(cookDate);
    endDate.setMinutes(endDate.getMinutes() + (recipe.totalTime || 60));

    const desc = [
      `Servings: ${slot.servings}`,
      '',
      'Ingredients:',
      ...recipe.ingredients.map(i => `- ${i.amount} ${i.unit} ${i.name}`),
      '',
      'Method:',
      ...recipe.method.map(s => `${s.stepNumber}. ${s.instruction}`),
    ].join('\n');

    events.push({
      title: `🍳 Cook: ${recipe.name}`,
      description: desc,
      startDate: cookDate,
      endDate,
    });
  }

  downloadICS(events, `week-${weekPlan.weekNumber}-plan.ics`);
}

export function exportSemesterToICS(
  _semesterPlan: SemesterPlan,
  weekPlans: WeekPlan[],
  recipes: Recipe[]
): void {
  const events: CalendarEvent[] = [];

  for (const weekPlan of weekPlans) {
    const weekStart = new Date(weekPlan.startDate);

    for (const slot of weekPlan.mealSlots) {
      if (!slot.recipeId) continue;
      const recipe = recipes.find(r => r.id === slot.recipeId);
      if (!recipe) continue;

      const dayOffset = DAY_OFFSETS[slot.dayOfWeek] || 0;
      const cookDate = addDays(weekStart, dayOffset);
      cookDate.setHours(18, 0, 0, 0);

      const endDate = new Date(cookDate);
      endDate.setMinutes(endDate.getMinutes() + (recipe.totalTime || 60));

      events.push({
        title: `🍳 Cook: ${recipe.name}`,
        description: recipe.method.map(s => `${s.stepNumber}. ${s.instruction}`).join('\n'),
        startDate: cookDate,
        endDate,
      });
    }
  }

  downloadICS(events, `semester-meal-plan.ics`);
}
