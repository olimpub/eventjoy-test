import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { useMasterDataStore } from './masterData';
import { useEventStore } from './event';
import { useCommunicationStore } from './communication';
import { signalRService } from 'src/services/signalrService';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    settings: null as any,
    billingAddress: null as any,
    eventTypePreferences: [] as any[],
    labelPreferences: [] as any[],
    loginIdentifiers: [] as any[],
    token: localStorage.getItem('token') || '',
    role: null as 'admin' | 'facilitator' | 'player' | null,
    emailCheckResult: null as { UserExists: boolean; HasPassword: boolean; StatusID: number } | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.role === 'admin',
  },
  actions: {
    async checkIdentity(identityValue: string) {
      try {
        const response = await api.post('/api/auth/check-identity', { IdentityValue: identityValue });
        this.emailCheckResult = response.data.Result2;
        return this.emailCheckResult;
      } catch (error) {
        console.error('Identity check failed', error);
        throw error;
      }
    },
    
    async passwordLogin(payload: { IdentityValue: string; Password: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/api/auth/password-login', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Password login failed', error);
        throw error;
      }
    },

    async register(payload: { IdentityValue: string; Password: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/api/auth/register', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Registration failed', error);
        throw error;
      }
    },

    async verifyOtp(payload: { IdentityValue: string; ValidationCode: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/api/auth/verify-otp', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('OTP Verification failed', error);
        throw error;
      }
    },

    async socialLogin(payload: { Provider: string; ProviderId: string; EmailAddress?: string; FirstName?: string; LastName?: string; DeviceId: string; DeviceName?: string }) {
      try {
        const response = await api.post('/api/auth/social-login', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Social Login failed', error);
        throw error;
      }
    },

    // -------------------------------------------------------------------------
    // HIDEGINDÍTÁS (BOOT DATA) - A Kétágú betöltés
    // -------------------------------------------------------------------------
    async fetchBootData() {
      try {
        // 1. Lépés: A felhasználó saját mikro-környezete
        const userRes = await api.get('/api/user/data');
        const userData = userRes.data;

        // User Data lementése
        this.user = userData.User;
        this.settings = userData.Settings;
        this.billingAddress = userData.BillingAddress;
        this.eventTypePreferences = userData.EventTypePreferences;
        this.labelPreferences = userData.LabelPreferences;
        this.loginIdentifiers = userData.LoginIdentifiers;

        // Communication Data lementése
        const commStore = useCommunicationStore();
        if (userData.Notifications) commStore.setNotifications(userData.Notifications);
        if (userData.ChatThreads) commStore.setChatThreads(userData.ChatThreads);

        // 2. Lépés: Események és Törzsadatok betöltése PÁRHUZAMOSAN!
        const eventStore = useEventStore();
        const masterDataStore = useMasterDataStore();
        
        const parallelTasks = [
          api.get('/api/event/data').then(res => eventStore.setEventData(res.data))
        ];

        // Hívjuk a master datát, ha a verzió változott vagy ha a roles még üres
        parallelTasks.push(masterDataStore.checkAndSync(userData.MasterDataVersion || 1));

        // Várjuk meg, amíg lejön az esemény gráf és a törzsadat
        await Promise.all(parallelTasks);

        // 3. Lépés: Csatlakozás a valós idejű WebSocketre (vagy legalább a Service)
        signalRService.startConnection();


        return true;
      } catch (error) {
        console.error('Hiba a Boot Data letöltésekor', error);
        throw error;
      }
    },

    setToken(token: string) {
      this.token = token;
      localStorage.setItem('token', token);
    },
    logout() {
      this.user = null;
      this.token = '';
      this.role = null;
      this.emailCheckResult = null;
      localStorage.removeItem('token');
      signalRService.stopConnection();
    },
  },
});
