import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  fetchSysadminTicketMasterdata,
  fetchSysadminTickets,
  ticketStatusLabel,
} from 'src/modules/sysadmin/api';
import {
  TICKET_STATUS_FLOW,
  TICKET_STATUS_OPTIONS,
  isClosedTicketStatus,
  type TicketMasterFlow,
  type TicketMasterStatus,
} from 'src/modules/sysadmin/types';

const fallbackStatuses: TicketMasterStatus[] = TICKET_STATUS_OPTIONS.map((item) => ({
  ticketStatusId: item.value,
  statusName: item.label,
  isClosedState: item.isClosed,
}));

const fallbackFlows: TicketMasterFlow[] = Object.entries(TICKET_STATUS_FLOW).flatMap(([from, tos]) =>
  tos.map((to) => ({ fromStatusId: Number(from), toStatusId: to }))
);

export const useTicketStore = defineStore('ticket', () => {
  const statuses = ref<TicketMasterStatus[]>([]);
  const flows = ref<TicketMasterFlow[]>([]);
  const counts = ref<Record<number, number>>({});
  const loaded = ref(false);
  const loading = ref(false);
  let loadPromise: Promise<void> | null = null;

  const displayStatuses = computed(() => (statuses.value.length ? statuses.value : fallbackStatuses));
  const displayFlows = computed(() => (flows.value.length ? flows.value : fallbackFlows));
  const openStatuses = computed(() => displayStatuses.value.filter((item) => !item.isClosedState));
  const openTicketCount = computed(() =>
    openStatuses.value.reduce((sum, item) => sum + (counts.value[item.ticketStatusId] || 0), 0)
  );

  function statusById(statusId: number | null | undefined): TicketMasterStatus | undefined {
    if (statusId == null) return undefined;
    return displayStatuses.value.find((item) => item.ticketStatusId === statusId);
  }

  function statusName(statusId: number | null | undefined, fallback = ''): string {
    return statusById(statusId)?.statusName || fallback || ticketStatusLabel(statusId, fallback);
  }

  function isClosed(statusId: number | null | undefined, fallback = false): boolean {
    const match = statusById(statusId);
    if (match) return match.isClosedState;
    if (statusId != null) return isClosedTicketStatus(statusId);
    return fallback;
  }

  function nextStatuses(fromStatusId: number | null | undefined): TicketMasterStatus[] {
    if (fromStatusId == null) return [];
    const allowedIds = displayFlows.value
      .filter((flow) => flow.fromStatusId === fromStatusId)
      .map((flow) => flow.toStatusId);
    return displayStatuses.value.filter((item) => allowedIds.includes(item.ticketStatusId));
  }

  function isScheduledStatus(statusId: number | null | undefined): boolean {
    return /ütemez/i.test(statusName(statusId));
  }

  function statusCount(statusId: number | null | undefined): number {
    if (statusId == null) return 0;
    return counts.value[statusId] || 0;
  }

  function setStatusCount(statusId: number, total: number) {
    counts.value = { ...counts.value, [statusId]: total };
  }

  function formatBadge(count: number): string {
    if (count <= 0) return '';
    return count > 99 ? '99+' : String(count);
  }

  async function ensureLoaded(force = false): Promise<void> {
    if (loaded.value && !force) return;
    if (loadPromise) return loadPromise;
    loading.value = true;
    loadPromise = (async () => {
      try {
        const result = await fetchSysadminTicketMasterdata();
        if (result.statuses.length) statuses.value = result.statuses;
        if (result.flows.length) flows.value = result.flows;
      } catch {
        statuses.value = [];
        flows.value = [];
      } finally {
        loaded.value = true;
        loading.value = false;
        loadPromise = null;
      }
    })();
    return loadPromise;
  }

  async function refreshCounts(): Promise<void> {
    await ensureLoaded();
    const open = openStatuses.value;
    if (!open.length) return;
    const results = await Promise.all(
      open.map(async (item) => {
        try {
          const result = await fetchSysadminTickets({ statusId: item.ticketStatusId, skip: 0, take: 1 });
          return [item.ticketStatusId, result.totalCount] as const;
        } catch {
          return [item.ticketStatusId, counts.value[item.ticketStatusId] || 0] as const;
        }
      })
    );
    const next: Record<number, number> = { ...counts.value };
    for (const [id, total] of results) next[id] = total;
    counts.value = next;
  }

  return {
    statuses,
    flows,
    counts,
    loaded,
    loading,
    displayStatuses,
    displayFlows,
    openStatuses,
    openTicketCount,
    statusById,
    statusName,
    isClosed,
    nextStatuses,
    isScheduledStatus,
    statusCount,
    setStatusCount,
    formatBadge,
    ensureLoaded,
    refreshCounts,
  };
});
