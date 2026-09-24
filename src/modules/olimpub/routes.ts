import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/olimpub/event/:id/display',
    name: 'olimpub-display',
    component: () => import('src/modules/olimpub/pages/DisplayPage.vue'),
    meta: { public: true },
  },
  {
    path: '/olimpub',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'event/:id/manage',
        name: 'olimpub-organizer',
        component: () => import('src/modules/olimpub/pages/OrganizerPage.vue'),
      },
      {
        path: 'event/:id/quizmaster',
        name: 'olimpub-quizmaster',
        component: () => import('src/modules/olimpub/pages/QuizmasterPage.vue'),
      },
      {
        path: 'event/:id/participants',
        name: 'olimpub-participants',
        component: () => import('pages/EventParticipantsPage.vue'),
      },
      {
        path: 'event/:id/scan',
        name: 'olimpub-scan',
        component: () => import('pages/EventTicketScanPage.vue'),
      },
      {
        path: 'event/:id/materials',
        name: 'olimpub-materials',
        component: () => import('pages/EventMaterialsPage.vue'),
      },
      {
        path: 'event/:id/quiz',
        name: 'olimpub-quiz',
        component: () => import('src/modules/olimpub/pages/QuizPage.vue'),
      },
      {
        path: 'event/:id/results',
        name: 'olimpub-results',
        component: () => import('src/modules/olimpub/pages/ResultsPage.vue'),
      },
      {
        path: 'event/:id',
        name: 'olimpub-player',
        component: () => import('src/modules/olimpub/pages/PlayerPage.vue'),
      },
    ],
  },
];

export default routes;
