import { onUnmounted, ref, watch, type Ref } from 'vue';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import { fetchOpLeaderboard } from './opApi';
import { mergeOpLeaderboardRows, type OpLeaderboardBoard, type OpLeaderboardRow } from './opData';

export type OpStandingsSource = OpLeaderboardBoard | 'compose' | 'extra';

export function useOpLeaderboards(
  eventId: Ref<number | null | undefined>,
  active: Ref<boolean>,
  source: Ref<OpStandingsSource>,
  roundId: Ref<number | null | undefined>
) {
  const rows = ref<OpLeaderboardRow[]>([]);
  const loaded = ref(false);
  const loading = ref(false);
  const error = ref('');
  let token = 0;

  async function reload(): Promise<boolean> {
    const id = eventId.value;
    if (!id) {
      rows.value = [];
      loaded.value = false;
      loading.value = false;
      error.value = '';
      return false;
    }
    if (source.value === 'extra') {
      rows.value = [];
      loaded.value = true;
      loading.value = false;
      error.value = '';
      return true;
    }
    const mine = ++token;
    loading.value = true;
    try {
      const next =
        source.value === 'compose'
          ? mergeOpLeaderboardRows(
              await fetchOpLeaderboard(id, 'quiz', { roundId: roundId.value }),
              await fetchOpLeaderboard(id, 'games')
            )
          : await fetchOpLeaderboard(id, source.value, { roundId: roundId.value });
      if (mine !== token) return false;
      rows.value = next;
      loaded.value = true;
      error.value = '';
      return true;
    } catch (err) {
      if (mine !== token) return false;
      error.value = readAxiosErrorMessage(err, 'Az eredmények nem olvashatók.');
      if (!loaded.value) rows.value = [];
      return false;
    } finally {
      if (mine === token) loading.value = false;
    }
  }

  watch(
    [eventId, active, source, roundId],
    () => {
      if (!active.value || !eventId.value) return;
      void reload();
    },
    { immediate: true }
  );

  onUnmounted(() => {
    token += 1;
  });

  return { rows, loaded, loading, error, reload };
}
