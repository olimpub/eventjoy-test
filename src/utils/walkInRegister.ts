import { isValidPhoneNumber } from 'libphonenumber-js';
import { api } from 'src/boot/axios';
import { INVITE_GROUPING_COLUMNS } from 'src/utils/inviteImport';
import type { EventGroupingAttr, EventGroupingKey } from 'src/modules/profitability/ptaData';
import {
  readApiReturnDescription,
  throwIfApiFailed,
} from 'src/utils/apiPayload';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface WalkInRegisterPayload {
  EventID: number;
  LastName: string;
  FirstName: string;
  Email: string;
  Phone: string;
  OrganizationName?: string;
  TeamName?: string;
  RegionName?: string;
  CompanyName?: string;
}

export interface WalkInFormInput {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  grouping?: Partial<Record<EventGroupingKey, string>>;
}

export function normalizeWalkInPhone(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export function validateWalkInForm(
  input: WalkInFormInput,
  grouping: EventGroupingAttr[] = []
): string | null {
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const email = input.email.trim();
  const phone = normalizeWalkInPhone(input.phone);
  if (!lastName) return 'Add meg a családnevet.';
  if (!firstName) return 'Add meg a keresztnevet.';
  if (!email) return 'Add meg az e-mail címet.';
  if (!EMAIL_RE.test(email)) return 'Érvénytelen e-mail cím.';
  if (phone && !isValidPhoneNumber(phone, 'HU')) return 'Érvénytelen telefonszám.';
  const missing = grouping
    .filter((attr) => !String(input.grouping?.[attr.key] || '').trim())
    .map((attr) => attr.label);
  if (missing.length) return `Hiányzó ${missing.join(', ')}`;
  return null;
}

export function toWalkInRegisterPayload(
  eventId: number,
  input: WalkInFormInput,
  grouping: EventGroupingAttr[] = []
): WalkInRegisterPayload {
  const enabled = new Set(grouping.map((attr) => attr.key));
  const payload: WalkInRegisterPayload = {
    EventID: eventId,
    LastName: input.lastName.trim(),
    FirstName: input.firstName.trim(),
    Email: input.email.trim(),
    Phone: normalizeWalkInPhone(input.phone),
  };
  for (const col of INVITE_GROUPING_COLUMNS) {
    if (!enabled.has(col.key)) continue;
    payload[col.jsonField] = String(input.grouping?.[col.key] || '').trim();
  }
  return payload;
}

export async function registerWalkIn(payload: WalkInRegisterPayload): Promise<string> {
  const response = await api.post('/event/invite/walkin', payload);
  throwIfApiFailed(response.data, 'A felvétel sikertelen.');
  return readApiReturnDescription(response.data) || 'Résztvevő felvéve, meghívó elküldve.';
}
