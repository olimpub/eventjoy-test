import { isValidPhoneNumber } from 'libphonenumber-js';
import { changeEvent } from 'src/utils/eventChange';
import { useEventStore } from 'src/stores/event';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EventUserContactInput {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
}

export function normalizeContactPhone(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export function validateEventUserContact(input: EventUserContactInput): string | null {
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const email = input.email.trim();
  const phone = normalizeContactPhone(input.phone);
  if (!lastName) return 'Add meg a családnevet.';
  if (!firstName) return 'Add meg a keresztnevet.';
  if (!email) return 'Add meg az e-mail címet.';
  if (!EMAIL_RE.test(email)) return 'Érvénytelen e-mail cím.';
  if (phone && !isValidPhoneNumber(phone, 'HU')) return 'Érvénytelen telefonszám.';
  return null;
}

export async function patchEventUserContact(args: {
  eventId: number;
  eventUserId: number;
  input: EventUserContactInput;
}): Promise<void> {
  const lastName = args.input.lastName.trim();
  const firstName = args.input.firstName.trim();
  const email = args.input.email.trim();
  const phone = normalizeContactPhone(args.input.phone);
  await changeEvent({
    EventID: args.eventId,
    Action: 'EventUser.PatchContact',
    Payload: {
      EventUserID: args.eventUserId,
      LastName: lastName,
      FirstName: firstName,
      Email: email,
      Phone: phone || null,
    },
  });
  useEventStore().applyEventUserContact(args.eventUserId, {
    LastName: lastName,
    FirstName: firstName,
    EmailAddress: email,
    PhoneNumber: phone || null,
  });
}
