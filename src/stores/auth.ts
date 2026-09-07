import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { hasDatasetKey, isTruthyFlag, pickDataset, unwrapApiPayload, warnIfDatasetMissing } from 'src/utils/apiPayload';
import { useMasterDataStore } from './masterData';
import { useEventStore } from './event';
import { useCommunicationStore } from './communication';
import { signalRService } from 'src/services/signalrService';

/** RS 10 — tblUserOrganization (ActiveFlg = 1, UserID = current user) */
export interface UserOrganization {
  id: number;
  OrganizationID: number;
  IsPrimary: boolean;
  OrganizationUserTypeID: number | null;
  ActiveFlg?: boolean | number;
}

function userOrganizationId(row: Record<string, unknown>): number | undefined {
  const raw = row.id ?? row.ID ?? row.Id;
  if (raw === undefined || raw === null || raw === '') return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function organizationLinkId(row: Record<string, unknown>): number | undefined {
  const raw = row.OrganizationID ?? row.organizationID ?? row.OrganizationId;
  if (raw === undefined || raw === null || raw === '') return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function organizationUserTypeId(row: Record<string, unknown>): number | null {
  const raw =
    row.OrganizationUserTypeID ??
    row.organizationUserTypeID ??
    row.OrganizationUserTypeId;
  if (raw === undefined || raw === null || raw === '') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export interface SocialLogin {
  Provider: string;
  ProviderId: string;
  EmailAddress: string;
  LinkedAt?: string;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const row = value[0];
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  }
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return null;
}

function normalizeSocialLogins(rows: unknown): SocialLogin[] {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      Provider: String(row.Provider ?? row.provider ?? '').trim(),
      ProviderId: String(row.ProviderId ?? row.providerId ?? '').trim(),
      EmailAddress: String(row.EmailAddress ?? row.emailAddress ?? row.Email ?? '').trim(),
      LinkedAt: row.LinkedAt != null ? String(row.LinkedAt) : row.linkedAt != null ? String(row.linkedAt) : undefined,
    }))
    .filter((row) => row.Provider);
}

function normalizeUserOrganizations(rows: unknown): UserOrganization[] {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      id: userOrganizationId(row)!,
      OrganizationID: organizationLinkId(row)!,
      IsPrimary: isTruthyFlag(row.IsPrimary ?? row.isPrimary),
      OrganizationUserTypeID: organizationUserTypeId(row),
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter((row) => row.id !== undefined && row.OrganizationID !== undefined);
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    settings: null as any,
    billingAddress: null as any,
    eventTypePreferences: [] as any[],
    labelPreferences: [] as any[],
    loginIdentifiers: [] as any[],
    socialLogins: [] as SocialLogin[],
    userOrganizations: [] as UserOrganization[],
    token: localStorage.getItem('token') || '',
    role: null as 'admin' | 'facilitator' | 'player' | null,
    emailCheckResult: null as { UserExists: boolean; HasPassword: boolean; StatusID: number } | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.role === 'admin',
    primaryUserOrganization: (state) =>
      state.userOrganizations.find((uo) => uo.IsPrimary) || state.userOrganizations[0] || null,
    primaryOrganizationId(): number | null {
      return this.primaryUserOrganization?.OrganizationID ?? null;
    },
    primaryOrganization() {
      const orgId = this.primaryOrganizationId;
      if (orgId == null) return null;
      const masterDataStore = useMasterDataStore();
      return masterDataStore.getOrganizationById(orgId) ?? null;
    },
    primaryOrganizationUserTypeId(): number | null {
      return this.primaryUserOrganization?.OrganizationUserTypeID ?? null;
    },
    primaryOrganizationUserType() {
      const typeId = this.primaryOrganizationUserTypeId;
      if (typeId == null) return null;
      const masterDataStore = useMasterDataStore();
      return masterDataStore.getOrganizationUserTypeById(typeId) ?? null;
    },
    linkedSocial(state) {
      return (provider: string) =>
        state.socialLogins.find(
          (row) => row.Provider.toLowerCase() === provider.toLowerCase()
        ) ?? null;
    },
  },
  actions: {
    async checkIdentity(identityValue: string) {
      try {
        const response = await api.post('/auth/check-identity', { IdentityValue: identityValue });
        this.emailCheckResult = response.data.Result2;
        return this.emailCheckResult;
      } catch (error) {
        console.error('Identity check failed', error);
        throw error;
      }
    },
    
    async passwordLogin(payload: { IdentityValue: string; Password: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/auth/password-login', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Password login failed', error);
        throw error;
      }
    },

    async register(payload: { IdentityValue: string; Password: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/auth/register', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Registration failed', error);
        throw error;
      }
    },

    async verifyOtp(payload: { IdentityValue: string; ValidationCode: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/auth/verify-otp', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('OTP Verification failed', error);
        throw error;
      }
    },

    async socialLogin(payload: { Provider: string; ProviderId: string; EmailAddress?: string; FirstName?: string; LastName?: string; DeviceId: string; DeviceName?: string }) {
      try {
        const response = await api.post('/auth/social-login', payload);
        this.setToken(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Social Login failed', error);
        throw error;
      }
    },

    applyAccountDatasets(payload: Record<string, unknown>) {
      const user = firstRecord(payload.User ?? payload.user);
      if (user) this.user = user;

      if (hasDatasetKey(payload, 'SocialLogins', 'socialLogins')) {
        this.socialLogins = normalizeSocialLogins(
          pickDataset(payload, 'SocialLogins', 'socialLogins')
        );
      }

      if (hasDatasetKey(payload, 'LoginIdentifiers', 'loginIdentifiers')) {
        this.loginIdentifiers = pickDataset(payload, 'LoginIdentifiers', 'loginIdentifiers');
      }
    },

    async linkSocial(payload: {
      Provider: string;
      ProviderId: string;
      EmailAddress: string;
      FirstName?: string;
      LastName?: string;
    }) {
      const response = await api.post('/auth/link-social', payload);
      this.applyAccountDatasets(unwrapApiPayload(response.data));
      return response.data;
    },

    async unlinkSocial(provider: string) {
      const response = await api.post('/auth/unlink-social', { Provider: provider });
      this.applyAccountDatasets(unwrapApiPayload(response.data));
      return response.data;
    },

    // -------------------------------------------------------------------------
    // HIDEGINDÍTÁS (BOOT DATA) - A Kétágú betöltés
    // -------------------------------------------------------------------------
    async fetchBootData() {
      try {
        // 1. Lépés: A felhasználó saját mikro-környezete
        const userRes = await api.get('/user/data');
        const userData = unwrapApiPayload(userRes.data);

        // User Data lementése
        // spGetUserData result sets → JSON property (backend mapping):
        // 1 User | 2 Notifications | 3 ChatThreads | 4 EventTypePreferences
        // 5 LabelPreferences | 6 Settings | 7 LoginIdentifiers | 8 BillingAddress
        // 9 MasterDataVersion | 10 UserOrganizations
        this.user = firstRecord(userData.User);
        this.settings = userData.Settings ?? null;
        this.billingAddress = userData.BillingAddress ?? null;
        this.eventTypePreferences = userData.EventTypePreferences || [];
        this.labelPreferences = userData.LabelPreferences || [];
        this.loginIdentifiers = userData.LoginIdentifiers || [];
        this.socialLogins = normalizeSocialLogins(
          pickDataset(userData, 'SocialLogins', 'socialLogins')
        );
        this.userOrganizations = normalizeUserOrganizations(
          pickDataset(
            userData,
            'UserOrganizations',
            'userOrganizations',
            'UserOrganization',
            'TblUserOrganization',
            'tblUserOrganization',
            'RS10',
            'Rs10',
            'ResultSet10',
            'Result10'
          )
        );
        warnIfDatasetMissing('auth.userOrganizations', this.userOrganizations, userData);

        // Communication Data lementése
        const commStore = useCommunicationStore();
        if (userData.Notifications) commStore.setNotifications(userData.Notifications);
        if (userData.ChatThreads) commStore.setChatThreads(userData.ChatThreads);

        // 2. Lépés: Események és Törzsadatok betöltése PÁRHUZAMOSAN!
        const eventStore = useEventStore();
        const masterDataStore = useMasterDataStore();
        
        const parallelTasks = [
          api.get('/event/data').then((res) => {
            eventStore.setEventData(unwrapApiPayload(res.data));
          }),
          masterDataStore.checkAndSync(Number(userData.MasterDataVersion) || 1),
        ];

        await Promise.all(parallelTasks);
        const { markEventCatalogFresh } = await import('src/utils/eventCatalogRefresh');
        markEventCatalogFresh();

        console.log(
          'Boot data betöltve | userOrganizations:',
          this.userOrganizations.length,
          '| organizations:',
          masterDataStore.organizations.length
        );

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
      this.settings = null;
      this.billingAddress = null;
      this.eventTypePreferences = [];
      this.labelPreferences = [];
      this.loginIdentifiers = [];
      this.socialLogins = [];
      this.userOrganizations = [];
      this.token = '';
      this.role = null;
      this.emailCheckResult = null;
      localStorage.removeItem('token');
      signalRService.stopConnection();

      useEventStore().$reset();
      useCommunicationStore().$reset();
    },
  },
});
