import { api } from 'src/boot/axios';
import { nullableNumericId, pickDataset, unwrapApiPayload } from 'src/utils/apiPayload';

export type InviteNextStep =
  | 'enter_code'
  | 'open_event'
  | 'account_conflict'
  | 'already_accepted'
  | string;

export interface InviteSnapshot {
  nextStep: InviteNextStep;
  invitationUid: string;
  invitationId: number | null;
  identityValue: string;
  identityDisplay: string;
  firstName: string;
  lastName: string;
  eventId: number | null;
  eventTitle: string;
  roleName: string;
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstInvitationRow(payload: Record<string, unknown>): Record<string, unknown> | null {
  const rows = pickDataset(
    payload,
    'InvitationData',
    'invitationData',
    'Invitation',
    'Invitations',
    'Result2',
    'Result3'
  );
  if (rows.length) {
    const row = asRecord(rows[0]);
    if (row) return row;
  }
  return (
    asRecord(payload.InvitationData) ||
    asRecord(payload.Invitation) ||
    asRecord(payload)
  );
}

function pickString(row: Record<string, unknown> | null, ...keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const val = row[key];
    if (val === undefined || val === null) continue;
    const text = String(val).trim();
    if (text) return text;
  }
  return '';
}

function normalizeNextStep(value: unknown): InviteNextStep {
  const step = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (step === 'enter_code' || step === 'entercode') return 'enter_code';
  if (step === 'open_event' || step === 'openevent') return 'open_event';
  if (step === 'account_conflict' || step === 'accountconflict') return 'account_conflict';
  if (step === 'already_accepted' || step === 'alreadyaccepted') return 'already_accepted';
  return step || 'enter_code';
}

export function parseInvitePayload(raw: unknown, fallbackUid = ''): InviteSnapshot {
  const payload = unwrapApiPayload(raw);
  const invite = firstInvitationRow(payload);
  const eventRow =
    asRecord(payload.Event) ||
    asRecord(invite?.Event) ||
    asRecord(pickDataset(payload, 'Events', 'events')[0]);

  const identityValue =
    pickString(
      invite,
      'UserEmail',
      'EmailAddress',
      'Email',
      'UserPhone',
      'PhoneNumber',
      'Phone',
      'IdentityValue'
    ) || pickString(payload, 'UserEmail', 'EmailAddress', 'UserPhone', 'IdentityValue');

  const identityDisplay =
    pickString(invite, 'EmailMasked', 'UserEmailMasked', 'MaskedEmail') || identityValue;

  const eventId =
    nullableNumericId(invite?.EventID ?? invite?.eventID ?? invite?.EventId) ??
    nullableNumericId(eventRow?.id ?? eventRow?.ID ?? eventRow?.EventID) ??
    nullableNumericId(payload.EventID ?? payload.eventID);

  const nextStep = normalizeNextStep(
    payload.NextStep ??
      payload.nextStep ??
      invite?.NextStep ??
      invite?.nextStep ??
      'enter_code'
  );

  return {
    nextStep,
    invitationUid:
      pickString(invite, 'InvitationUID', 'invitationUID', 'InvitationUid', 'UID', 'Uid') ||
      fallbackUid,
    invitationId: nullableNumericId(invite?.id ?? invite?.ID ?? invite?.InvitationID),
    identityValue,
    identityDisplay,
    firstName: pickString(invite, 'FirstName', 'firstName'),
    lastName: pickString(invite, 'LastName', 'lastName'),
    eventId,
    eventTitle:
      pickString(eventRow, 'Title', 'EventName', 'Name') ||
      pickString(invite, 'EventTitle', 'EventName', 'Title') ||
      'Esemény',
    roleName:
      pickString(invite, 'RoleName', 'EventRoleName', 'roleName') ||
      pickString(asRecord(invite?.EventRole), 'RoleName', 'Name') ||
      pickString(asRecord(payload.EventRole), 'RoleName', 'Name') ||
      'Résztvevő',
    raw: payload,
  };
}

export async function fetchInviteByUid(uid: string): Promise<InviteSnapshot> {
  const response = await api.get(`/api/invite/${encodeURIComponent(uid)}`);
  return parseInvitePayload(response.data, uid);
}
