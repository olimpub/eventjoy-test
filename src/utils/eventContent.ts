import { api } from 'src/boot/axios';
import { combineDateTimeToUtcIso } from 'src/components/event-wizard/types';
import { throwIfApiFailed } from 'src/utils/apiPayload';
import type { EventProgramDraft } from 'src/utils/eventProgram';

/**
 * POST /event/content/save → spSaveEventContent(@Json)
 * Most: programlista. Később ugyanitt EventImageUrl — a FE azt még nem küldi.
 */
export interface EventContentSavePayload {
  EventID: number;
  Programs: Array<{
    id: number | null;
    ProgramDateTime: string;
    ProgramName: string;
  }>;
}

export function buildEventContentSavePayload(
  eventId: number,
  drafts: EventProgramDraft[]
): EventContentSavePayload {
  const programs: EventContentSavePayload['Programs'] = [];
  for (const draft of drafts) {
    const name = draft.name.trim();
    if (!name) continue;
    if (!draft.date || !draft.time) throw new Error('Minden programnak kell dátum és időpont.');
    const when = combineDateTimeToUtcIso(draft.date, draft.time);
    if (!when) throw new Error('Érvénytelen program időpont.');
    programs.push({
      id: draft.id,
      ProgramDateTime: when,
      ProgramName: name,
    });
  }
  programs.sort((a, b) => a.ProgramDateTime.localeCompare(b.ProgramDateTime));
  return { EventID: eventId, Programs: programs };
}

export async function saveEventContent(payload: EventContentSavePayload): Promise<void> {
  if (payload.EventID == null || !Number.isFinite(payload.EventID)) {
    throw new Error('Hiányzik az esemény.');
  }
  const response = await api.post('/event/content/save', payload);
  throwIfApiFailed(response.data, 'A programok mentése sikertelen.');
}
