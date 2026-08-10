import { defineStore } from 'pinia';

export const useEventStore = defineStore('event', {
  state: () => ({
    events: [] as any[],
    invitations: [] as any[],
    eventLabels: [] as any[],
    labels: [] as any[],
    locations: [] as any[],
    roles: [] as any[],
    roleTickets: [] as any[],
    tickets: [] as any[],
    eventUsers: [] as any[],
    eventTypeOwners: [] as any[]
  }),
  getters: {
    // A felhasználóhoz kapcsolódó események (amiben EventUser-ként benne van)
    myEvents: (state) => {
      const myEventIds = state.eventUsers.map(eu => eu.EventID);
      return state.events.filter(e => myEventIds.includes(e.id));
    },
    activeMyEvents(): any[] {
      return this.myEvents.filter((e: any) => new Date(e.EndAtUtc) >= new Date());
    },
    pastMyEvents(): any[] {
      return this.myEvents.filter((e: any) => new Date(e.EndAtUtc) < new Date());
    },
    // Discovery (Kereső) - Minden ami publikus és jövőbeli
    discoveryEvents: (state) => {
      return state.events.filter(e => {
        const isPublic = e.PublicFlg === 1 || e.publicFlg === 1 || e.PublicFlg === true || e.publicFlg === true;
        const endDate = e.EndAtUtc || e.endAtUtc;
        const isFuture = endDate ? new Date(endDate) >= new Date() : true; // Ha nincs dátum, engedjük át
        return isPublic && isFuture;
      });
    }
  },
  actions: {
    setEventData(data: any) {
      this.events = data.Events || [];
      this.invitations = data.Invitations || [];
      this.eventLabels = data.EventLabels || [];
      this.labels = data.Labels || [];
      this.locations = data.Locations || [];
      this.roles = data.Roles || [];
      this.roleTickets = data.RoleTickets || [];
      this.tickets = data.Tickets || [];
      this.eventUsers = data.EventUsers || [];
      this.eventTypeOwners = data.EventTypeOwners || [];
    },
    
    // SignalR élő esemény státusz módosítás
    updateEventStatus(eventId: number, newStatusId: number) {
      const eventUser = this.eventUsers.find(eu => eu.EventID === eventId);
      if (eventUser) {
        eventUser.EventUserStatusID = newStatusId; 
      }
    }
  }
});
