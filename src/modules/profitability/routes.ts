import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/profitability',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'event/:id/manage',
        name: 'profitability-organizer',
        component: () => import('src/modules/profitability/pages/OrganizerPage.vue'),
      },
      {
        path: 'event/:id/contribute',
        name: 'profitability-gamemaster',
        component: () => import('src/modules/profitability/pages/GameMasterPage.vue'),
      },
      {
        path: 'event/:id/participants',
        name: 'profitability-participants',
        component: () => import('src/modules/profitability/pages/ParticipantsPage.vue'),
      },
      {
        path: 'event/:id/game',
        name: 'profitability-game',
        component: () => import('src/modules/profitability/pages/GamePage.vue'),
      },
      {
        path: 'event/:id/results',
        name: 'profitability-results',
        component: () => import('src/modules/profitability/pages/ResultsPage.vue'),
      },
      {
        path: 'event/:id',
        name: 'profitability-event-detail',
        component: () => import('src/modules/profitability/pages/PlayerPage.vue'),
      },
    ],
  },
];

export default routes;
