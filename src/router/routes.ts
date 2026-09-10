import { RouteRecordRaw } from 'vue-router';
import profitabilityRoutes from 'src/modules/profitability/routes';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/LoginPage.vue')
  },
  {
    path: '/invite/:uid',
    name: 'invite',
    component: () => import('pages/InvitePage.vue'),
    meta: { public: true },
  },
  {
    path: '/join/:eventUid',
    name: 'join',
    component: () => import('pages/JoinPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('pages/IndexPage.vue') },
      { path: 'feed', name: 'newsfeed', component: () => import('pages/NewsfeedPage.vue') },
      { path: 'event/:id', name: 'event_details', component: () => import('pages/EventDetailPage.vue') },
      { path: 'event/:id/manage', name: 'event_manage', component: () => import('pages/EventManagePage.vue') },
      { path: 'event/:id/contribute', name: 'event_contribute', component: () => import('pages/EventContributePage.vue') },
      { path: 'event/:id/manage/participants', name: 'event_participants', component: () => import('pages/EventParticipantsPage.vue') },
      { path: 'event/:id/manage/scan', name: 'event_ticket_scan', component: () => import('pages/EventTicketScanPage.vue') },
      { path: 'my-events', name: 'my_events', component: () => import('pages/MyEventsPage.vue') },
      { path: 'notifications', name: 'notifications', component: () => import('pages/NotificationsPage.vue') },
      { path: 'klubhub', name: 'klubhub', component: () => import('pages/KlubHubPage.vue') },
      { path: 'communities', redirect: { name: 'klubhub' } },
      { path: 'messages', name: 'messages', component: () => import('pages/MessagesPage.vue') },
      { path: 'messages/:id', name: 'chat_detail', component: () => import('pages/ChatDetailPage.vue') },
      { path: 'profile', name: 'profile', component: () => import('pages/ProfilePage.vue') }
    ],
  },

  // ProfitAbility modul útvonalai
  ...profitabilityRoutes,

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
