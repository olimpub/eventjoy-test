import { route } from 'quasar/wrappers';
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
    const isPublic = to.path === '/login' || to.name === 'invite' || to.meta.public === true;

    if (!isPublic && !authStore.isAuthenticated) {
      next('/login');
    } else if (!isPublic && authStore.isAuthenticated && !authStore.user) {
      try {
        await authStore.fetchBootData();
        next();
      } catch (err) {
        authStore.logout();
        next('/login');
      }
    } else if (to.path === '/login' && authStore.isAuthenticated) {
      next('/');
    } else {
      next();
    }
  });

  return Router;
});
