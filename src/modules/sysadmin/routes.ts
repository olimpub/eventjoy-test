import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('layouts/SysadminLayout.vue'),
    meta: { sysadmin: true },
    children: [
      { path: '', name: 'sysadmin-dashboard', component: () => import('./pages/DashboardPage.vue') },
      { path: 'sysadmin', name: 'sysadmin-hub', component: () => import('./pages/HubPage.vue') },
      { path: 'users', name: 'sysadmin-users', component: () => import('./pages/UsersPage.vue') },
      { path: 'tickets', name: 'sysadmin-tickets', component: () => import('./pages/TicketsPage.vue') },
      {
        path: 'tickets/:ticketId',
        name: 'sysadmin-ticket',
        component: () => import('./pages/TicketDetailPage.vue'),
      },
      {
        path: 'logs/error',
        name: 'sysadmin-logs-error',
        component: () => import('./pages/ErrorLogsPage.vue'),
      },
      {
        path: 'logs/data-change',
        name: 'sysadmin-logs-data-change',
        component: () => import('./pages/DataChangeLogsPage.vue'),
      },
      {
        path: 'versions',
        name: 'sysadmin-versions',
        component: () => import('./pages/ReleaseNotesPage.vue'),
      },
      {
        path: 'soon/:section',
        name: 'sysadmin-soon',
        component: () => import('./pages/ComingSoonPage.vue'),
      },
    ],
  },
];

export default routes;
