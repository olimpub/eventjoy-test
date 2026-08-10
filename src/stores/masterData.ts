import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export const useMasterDataStore = defineStore('masterData', {
  state: () => ({
    version: localStorage.getItem('masterDataVersion') ? parseInt(localStorage.getItem('masterDataVersion') as string, 10) : 0,
    eventTypes: JSON.parse(localStorage.getItem('md_eventTypes') || '[]'),
    eventTypeGroups: JSON.parse(localStorage.getItem('md_eventTypeGroups') || '[]'),
    notificationTypes: JSON.parse(localStorage.getItem('md_notificationTypes') || '[]'),
    roleTypes: JSON.parse(localStorage.getItem('md_roleTypes') || '[]'),
    roles: JSON.parse(localStorage.getItem('md_roles') || '[]'),
    loginIdentifierTypes: JSON.parse(localStorage.getItem('md_loginIdentifierTypes') || '[]'),
    userStatuses: JSON.parse(localStorage.getItem('md_userStatuses') || '[]'),
    chatThreadTypes: JSON.parse(localStorage.getItem('md_chatThreadTypes') || '[]'),
    eventStatuses: JSON.parse(localStorage.getItem('md_eventStatuses') || '[]'),
    eventUserStatuses: JSON.parse(localStorage.getItem('md_eventUserStatuses') || '[]'),
    labels: JSON.parse(localStorage.getItem('md_labels') || '[]'), // TODO: backend integráció (címkék/tag-ek master adata)
  }),

  getters: {
    getRoleNameById: (state) => (id: number) => {
      const numId = Number(id);
      const role = state.roles.find((r: any) => 
        Number(r.id) === numId || 
        Number(r.RoleID) === numId || 
        Number(r.ID) === numId || 
        Number(r.EventRoleID) === numId ||
        Number(r.EventRoleId) === numId ||
        Number(r.RoleId) === numId ||
        String(r.id) === String(id) ||
        String(r.RoleID) === String(id) ||
        String(r.ID) === String(id)
      );
      if (role) {
        const name = role.RoleName || role.Name || role.Title || role.name || role.roleName || role.EventRoleName;
        if (name) return name;
      }
      const fallbackRoles: Record<number, string> = {
        1: 'Szervező',
        2: 'Résztvevő',
        3: 'Játékos',
        4: 'Szponzor',
        5: 'Előadó',
        6: 'Szekcióvezető',
        7: 'Játékmester',
        8: 'Vendég',
        9: 'Munkatárs',
        10: 'Házigazda'
      };
      return fallbackRoles[numId] || 'Résztvevő';
    },
    getRoleColorById: (state) => (id: number) => {
      const numId = Number(id);
      const role = state.roles.find((r: any) => 
        Number(r.id) === numId || 
        Number(r.RoleID) === numId || 
        Number(r.ID) === numId || 
        Number(r.EventRoleID) === numId ||
        Number(r.EventRoleId) === numId ||
        Number(r.RoleId) === numId ||
        String(r.id) === String(id) ||
        String(r.RoleID) === String(id) ||
        String(r.ID) === String(id)
      );
      if (role && role.RoleTypeID) {
        const roleType = state.roleTypes.find((rt: any) => Number(rt.id) === Number(role.RoleTypeID));
        if (roleType && (roleType.ColorHex || roleType.ColorCode)) {
          return roleType.ColorHex || roleType.ColorCode;
        }
      }
      const fallbackColors: Record<number, string> = {
        1: '#a855f7', // Szervező - purple
        2: '#34d399', // Résztvevő - green
        3: '#34d399', // Játékos - green
        4: '#f68b29', // Szponzor - orange
        5: '#f68b29', // Előadó - orange
        6: '#60a5fa', // Szekcióvezető - blue
        7: '#38bdf8', // Játékmester - sky blue
        8: '#34d399', // Vendég - green
        9: '#38bdf8', // Munkatárs - sky blue
        10: '#a855f7' // Házigazda - purple
      };
      return fallbackColors[numId] || '#34d399';
    },
    getEventUserStatusName: (state) => (id: number) => {
      const status = state.eventUserStatuses.find((s: any) => s.id === id);
      return status ? status.StatusName : 'Ismeretlen';
    }
  },
  actions: {
    async checkAndSync(serverVersion: number) {
      try {
        const response = await api.get('/api/master/data');
        const data = response.data;
        
        this.version = serverVersion;
        this.eventTypes = data.EventTypes || [];
        this.eventTypeGroups = data.EventTypeGroups || [];
        this.notificationTypes = data.NotificationTypes || [];
        this.roleTypes = data.RoleTypes || [];
        this.roles = data.Roles || data.roles || data.EventRoles || data.eventRoles || [];
        this.loginIdentifierTypes = data.LoginIdentifierTypes || [];
        this.userStatuses = data.UserStatuses || [];
        this.chatThreadTypes = data.ChatThreadTypes || [];
        this.eventStatuses = data.EventStatuses || [];
        this.eventUserStatuses = data.EventUserStatuses || [];

        localStorage.setItem('masterDataVersion', serverVersion.toString());
        localStorage.setItem('md_eventTypes', JSON.stringify(this.eventTypes));
        localStorage.setItem('md_eventTypeGroups', JSON.stringify(this.eventTypeGroups));
        localStorage.setItem('md_notificationTypes', JSON.stringify(this.notificationTypes));
        localStorage.setItem('md_roleTypes', JSON.stringify(this.roleTypes));
        localStorage.setItem('md_roles', JSON.stringify(this.roles));
        localStorage.setItem('md_loginIdentifierTypes', JSON.stringify(this.loginIdentifierTypes));
        localStorage.setItem('md_userStatuses', JSON.stringify(this.userStatuses));
        localStorage.setItem('md_chatThreadTypes', JSON.stringify(this.chatThreadTypes));
        localStorage.setItem('md_eventStatuses', JSON.stringify(this.eventStatuses));
        localStorage.setItem('md_eventUserStatuses', JSON.stringify(this.eventUserStatuses));
        
        console.log('Master Data szinkronizálva! Új verzió:', serverVersion);
      } catch (error) {
        console.error('Hiba a Master Data szinkronizálásakor', error);
      }
    }
  }
});
