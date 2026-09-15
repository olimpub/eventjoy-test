import { route } from 'quasar/wrappers';
import { Notify } from 'quasar';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, from, next) => {
    const { useAuthStore } = await import('src/stores/auth');
    const authStore = useAuthStore();
    const isDisplayPublic =
      to.name === 'profitability-display' &&
      (Boolean(to.query.pin) ||
        (typeof sessionStorage !== 'undefined' &&
          !!sessionStorage.getItem(`ptaDisplayToken:${String(to.params.id || '')}`)));
    const isPublic =
      to.path === '/login' ||
      to.name === 'invite' ||
      to.name === 'join' ||
      to.meta.public === true ||
      isDisplayPublic;

    const isAdminRoute = to.path === '/admin' || to.path.startsWith('/admin/');
    const wantsConsumerApp = to.query.app === '1' || to.query.app === 'true';
    const isDefaultHome = to.name === 'home' && !wantsConsumerApp;
    const allowAdminOrRedirect = () => {
      if (
        isDefaultHome &&
        authStore.isSysadmin &&
        !authStore.isImpersonating
      ) {
        next('/admin');
        return;
      }
      if (!isAdminRoute) {
        next();
        return;
      }
      if (authStore.isImpersonating && !authStore.isSysadmin) {
        next('/');
        return;
      }
      if (!authStore.isSysadmin) {
        Notify.create({
          message: 'Nincs jogosultságod',
          color: 'dark',
          textColor: 'orange-4',
          position: 'top',
          icon: 'lock',
        });
        next('/');
        return;
      }
      next();
    };

    if (!isPublic && !authStore.isAuthenticated) {
      next({ path: '/login', query: { next: to.fullPath } });
    } else if (!isPublic && authStore.isAuthenticated && !authStore.user) {
      try {
        await authStore.fetchBootData();
        allowAdminOrRedirect();
      } catch (err) {
        authStore.logout();
        next({ path: '/login', query: { next: to.fullPath } });
      }
    } else if (to.path === '/login' && authStore.isAuthenticated) {
      const { pathAfterLogin } = await import('src/utils/eventJoin');
      next(pathAfterLogin(authStore.isSysadmin, to.query.next));
    } else {
      allowAdminOrRedirect();
    }
  });

  Router.afterEach((to, from) => {
    void (async () => {
      const { connectToEventLive, disconnectEventLive, isEventLiveJoinRoute } = await import(
        'src/services/signalrService'
      );
      const { useAuthStore } = await import('src/stores/auth');
      const authStore = useAuthStore();
      if (to.name === 'profitability-display') {
        return;
      }
      if (!authStore.isAuthenticated) {
        disconnectEventLive();
        return;
      }
      if (isEventLiveJoinRoute(to.name) && to.params.id) {
        try {
          const { resolveEventLiveJoin } = await import('src/utils/eventEnter');
          const join = resolveEventLiveJoin(String(to.params.id), null, to);
          if (join) await connectToEventLive(join);
        } catch (err) {
          console.error('SignalR csatlakozás sikertelen:', err);
        }
        return;
      }
      if (isEventLiveJoinRoute(from.name) && !isEventLiveJoinRoute(to.name)) {
        disconnectEventLive();
      }

      const { isEventCatalogRefreshRoute, refreshEventCatalog } = await import(
        'src/utils/eventCatalogRefresh'
      );
      if (isEventCatalogRefreshRoute(to.name)) {
        void refreshEventCatalog();
      }
    })();
  });

  return Router;
});
