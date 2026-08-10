import { RouteRecordRaw } from 'vue-router';
import profitabilityRoutes from 'src/modules/profitability/routes';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/LoginPage.vue')
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('pages/IndexPage.vue') },
      { path: 'feed', name: 'newsfeed', component: () => import('pages/NewsfeedPage.vue') },
      { path: 'event/:id', name: 'event_details', component: () => import('pages/EventDetailPage.vue') },
      { path: 'my-events', name: 'my_events', component: () => import('pages/MyEventsPage.vue') },
      { path: 'notifications', name: 'notifications', component: () => import('pages/NotificationsPage.vue') },
      { path: 'communities', name: 'communities', component: () => import('pages/CommunitiesPage.vue') },
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
