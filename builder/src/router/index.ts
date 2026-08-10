import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventDetailsView from '../views/EventDetailsView.vue'
import EventRegistrationView from '../views/EventRegistrationView.vue'
import EventConfirmationView from '../views/EventConfirmationView.vue'
import EventLotteryView from '../views/EventLotteryView.vue'
import EventGameView from '../views/EventGameView.vue'
import EventResultsView from '../views/EventResultsView.vue'
import EventFinalView from '../views/EventFinalView.vue'
import EventSummaryView from '../views/EventSummaryView.vue'
import EventGameMasterView from '../views/EventGameMasterView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/event/:id',
      name: 'event-details',
      component: EventDetailsView,
    },
    {
      path: '/event/:id/registration',
      name: 'event-registration',
      component: EventRegistrationView,
    },
    {
      path: '/event/:id/confirmation',
      name: 'event-confirmation',
      component: EventConfirmationView,
    },
    {
      path: '/event/:id/lottery',
      name: 'event-lottery',
      component: EventLotteryView,
    },
    {
      path: '/event/:id/game',
      name: 'event-game',
      component: EventGameView,
    },
    {
      path: '/event/:id/results',
      name: 'event-results',
      component: EventResultsView,
    },
    {
      path: '/event/:id/final',
      name: 'event-final',
      component: EventFinalView,
    },
    {
      path: '/event/:id/summary',
      name: 'event-summary',
      component: EventSummaryView,
    },
    {
      path: '/event/:id/gm',
      name: 'event-gm',
      component: EventGameMasterView,
    },
  ],
})

export default router
