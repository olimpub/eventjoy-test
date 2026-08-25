import { useMasterDataStore } from 'src/stores/masterData';
import { eventTypeHasPtaFlag, eventTypeIdOf as typeIdOf } from './ptaData';

export { eventTypeHasPtaFlag };

/** Csak fallback, amíg a típus nincs a masterben. A döntés: EventTypes.PTAFlg. */
export const PTA_EVENT_TYPE_ID = 46;

export function eventTypeIdOf(event: Record<string, unknown> | null | undefined): number | null {
  return typeIdOf(event);
}

export function isProfitabilityEventType(eventTypeId: number | string | null | undefined): boolean {
  if (eventTypeId == null || eventTypeId === '') return false;
  const n = Number(eventTypeId);
  if (!Number.isFinite(n)) return false;
  const type = useMasterDataStore().getEventTypeById(n);
  if (type) return eventTypeHasPtaFlag(type as Record<string, unknown>);
  return n === PTA_EVENT_TYPE_ID;
}
