import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/profitability',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'event/:id',
        name: 'profitability-event-detail',
        component: () => import('src/modules/profitability/pages/EventDetailPage.vue'),
      }
    ],
  },
];

export default routes;
