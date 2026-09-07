import { computed, ref } from 'vue';

export type NotificationCategory = 'events' | 'system';

export interface AppNotification {
  id: number;
  category: NotificationCategory;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  icon: string;
  to?: string;
}

export const previewNotifications = ref<AppNotification[]>([
  {
    id: 1,
    category: 'events',
    title: 'Helyszín változás',
    body: 'A plenáris előadás a B terembe került át. Kérjük fáradj oda az új kezdéshez!',
    time: '10 perce',
    unread: true,
    icon: 'sym_r_event',
    to: '/feed',
  },
  {
    id: 2,
    category: 'events',
    title: 'Jegyvásárlás',
    body: 'Sikeresen megvásároltad a VIP belépőjegyet az OlimPub Kvízre.',
    time: '2 órája',
    unread: true,
    icon: 'sym_r_local_activity',
    to: '/my-events',
  },
  {
    id: 3,
    category: 'events',
    title: 'Új előadó',
    body: 'Dr. Horváth Elemér is csatlakozott a holnapi IoT kerekasztalhoz.',
    time: 'Tegnap',
    unread: false,
    icon: 'sym_r_campaign',
    to: '/feed',
  },
  {
    id: 4,
    category: 'events',
    title: 'Csoport frissítés',
    body: 'Az OlimPub Kvíz Csoport új eseményt hirdetett: Tavaszi Kvíz Bajnokság.',
    time: 'Hétfő',
    unread: false,
    icon: 'sym_r_groups',
    to: '/feed',
  },
  {
    id: 5,
    category: 'system',
    title: 'Karbantartás',
    body: 'Pénteken hajnalban 2:00 és 4:00 között rendszerkarbantartás lesz.',
    time: 'Márc. 12.',
    unread: false,
    icon: 'sym_r_build',
  },
]);

export const unreadNotificationCount = computed(
  () => previewNotifications.value.filter((n) => n.unread).length
);

export function markAllNotificationsRead() {
  previewNotifications.value = previewNotifications.value.map((n) => ({ ...n, unread: false }));
}

export function markNotificationRead(id: number) {
  previewNotifications.value = previewNotifications.value.map((n) =>
    n.id === id ? { ...n, unread: false } : n
  );
}
