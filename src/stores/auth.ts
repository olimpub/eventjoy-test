import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { hasDatasetKey, isTruthyFlag, pickDataset, readIsSysadmin, readIsSysadminFromJwt, throwIfApiFailed, unwrapApiPayload, warnIfDatasetMissing } from 'src/utils/apiPayload';
import { normalizeOwnedEventTypeIds } from 'src/utils/eventTypeAccess';
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

let unauthorizedInFlight: Promise<'restored' | 'logout'> | null = null;
let suppressUnauthorized = false;

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
    ownedEventTypeIds: [] as number[],
    token: localStorage.getItem('token') || '',
    originalAdminToken: localStorage.getItem('originalAdminToken') || '',
    role: null as 'admin' | 'facilitator' | 'player' | null,
    emailCheckResult: null as { UserExists: boolean; HasPassword: boolean; StatusID: number } | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.role === 'admin',
    isSysadmin: (state) => readIsSysadmin(state.user) || readIsSysadminFromJwt(state.token),
    isImpersonating: (state) => !!state.originalAdminToken,
    currentUserId: (state) => {
      const user = state.user;
      if (!user || typeof user !== 'object') return null;
      const raw = user.id ?? user.ID ?? user.Id ?? user.UserID ?? user.userID ?? user.UserId;
      const num = Number(raw);
      return Number.isFinite(num) && num > 0 ? num : null;
    },
    currentUserDisplayName: (state) => {
      const user = state.user;
      if (!user || typeof user !== 'object') return 'felhasználó';
      const last = String(user.LastName ?? user.lastName ?? '').trim();
      const first = String(user.FirstName ?? user.firstName ?? '').trim();
      const name = `${last} ${first}`.trim();
      return name || String(user.EmailAddress ?? user.Email ?? user.email ?? 'felhasználó').trim();
    },
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
        this.beginFreshSession(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Password login failed', error);
        throw error;
      }
    },

    async register(payload: { IdentityValue: string; Password: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/auth/register', payload);
        this.beginFreshSession(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('Registration failed', error);
        throw error;
      }
    },

    async verifyOtp(payload: { IdentityValue: string; ValidationCode: string; DeviceId: string; DeviceName: string }) {
      try {
        const response = await api.post('/auth/verify-otp', payload);
        this.beginFreshSession(response.data.Result2.Token);
        return response.data;
      } catch (error) {
        console.error('OTP Verification failed', error);
        throw error;
      }
    },

    async socialLogin(payload: { Provider: string; ProviderId: string; EmailAddress?: string; FirstName?: string; LastName?: string; DeviceId: string; DeviceName?: string }) {
      try {
        const response = await api.post('/auth/social-login', payload);
        this.beginFreshSession(response.data.Result2.Token);
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

      if (hasDatasetKey(payload, 'BillingAddress', 'billingAddress', 'BillingAddresses')) {
        this.billingAddress =
          pickDataset(payload, 'BillingAddress', 'billingAddress', 'BillingAddresses') || null;
      }

      if (hasDatasetKey(payload, 'UserOrganizations', 'userOrganizations')) {
        this.userOrganizations = normalizeUserOrganizations(
          pickDataset(payload, 'UserOrganizations', 'userOrganizations')
        );
      }

      if (
        hasDatasetKey(
          payload,
          'OwnedEventTypeIDs',
          'ownedEventTypeIDs',
          'OwnedEventTypes',
          'ownedEventTypes'
        )
      ) {
        this.ownedEventTypeIds = normalizeOwnedEventTypeIds(
          pickDataset(
            payload,
            'OwnedEventTypeIDs',
            'ownedEventTypeIDs',
            'OwnedEventTypes',
            'ownedEventTypes'
          )
        );
      }

      useMasterDataStore().applyMaterialTypesFrom(payload);
    },

    async saveProfile() {
      const user = this.user && typeof this.user === 'object' ? this.user : {};
      const FirstName = String(user.FirstName ?? '').trim();
      const LastName = String(user.LastName ?? '').trim();
      const EmailAddress = String(user.EmailAddress ?? user.Email ?? '').trim();
      const billing = Array.isArray(this.billingAddress)
        ? this.billingAddress
        : this.billingAddress
          ? [this.billingAddress]
          : [];
      const identifiers = Array.isArray(this.loginIdentifiers)
        ? this.loginIdentifiers
        : this.loginIdentifiers
          ? [this.loginIdentifiers]
          : [];
      const response = await api.post('/user/save', {
        FirstName,
        LastName,
        EmailAddress,
        Email: EmailAddress,
        User: {
          ...user,
          FirstName,
          LastName,
          EmailAddress,
          Email: EmailAddress,
        },
        UserOrganizations: this.userOrganizations,
        BillingAddress: billing,
        LoginIdentifiers: identifiers,
      });
      throwIfApiFailed(response.data, 'A profil mentése sikertelen.');
      this.applyAccountDatasets(unwrapApiPayload(response.data));
      if (this.user && typeof this.user === 'object') {
        this.user = { ...this.user, FirstName, LastName, EmailAddress };
      }
      return response.data;
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
        // 9 MasterDataVersion | 10 UserOrganizations | 11 MaterialTypes | 12 OwnedEventTypeIDs
        this.user = firstRecord(userData.User ?? userData.user ?? userData.Users ?? userData.users);
        if (
          this.user &&
          !readIsSysadmin(this.user) &&
          (readIsSysadmin(userData) || readIsSysadminFromJwt(this.token))
        ) {
          this.user = { ...this.user, IsSysadmin: true };
        }
        if (readIsSysadmin(this.user) || readIsSysadminFromJwt(this.token)) {
          this.clearOriginalAdminToken();
        }
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

        this.ownedEventTypeIds = normalizeOwnedEventTypeIds(
          pickDataset(
            userData,
            'OwnedEventTypeIDs',
            'ownedEventTypeIDs',
            'OwnedEventTypes',
            'ownedEventTypes',
            'EventTypeOwners',
            'eventTypeOwners',
            'RS12',
            'Rs12',
            'ResultSet12',
            'Result12'
          )
        );

        const commStore = useCommunicationStore();
        if (userData.Notifications) commStore.setNotifications(userData.Notifications);
        if (userData.ChatThreads) commStore.setChatThreads(userData.ChatThreads);

        // 2. Lépés: Események és Törzsadatok betöltése PÁRHUZAMOSAN!
        const eventStore = useEventStore();
        const masterDataStore = useMasterDataStore();
        masterDataStore.applyMaterialTypesFrom(userData);

        const parallelTasks = [
          api.get('/event/data').then((res) => {
            eventStore.setEventData(unwrapApiPayload(res.data));
          }),
          masterDataStore.checkAndSync(Number(userData.MasterDataVersion) || 1),
        ];

        await Promise.all(parallelTasks);
        // user/data a forrás, ha a master payloadban nincs / üres a MaterialTypes
        masterDataStore.applyMaterialTypesFrom(userData);
        warnIfDatasetMissing('masterData.materialTypes', masterDataStore.materialTypes, userData);
        const { markEventCatalogFresh } = await import('src/utils/eventCatalogRefresh');
        markEventCatalogFresh();

        console.log(
          'Boot data betöltve | userOrganizations:',
          this.userOrganizations.length,
          '| organizations:',
          masterDataStore.organizations.length,
          '| materialTypes:',
          masterDataStore.materialTypes.length,
          '| ownedEventTypes:',
          this.ownedEventTypeIds.length
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
    setOriginalAdminToken(token: string) {
      this.originalAdminToken = token;
      if (token) localStorage.setItem('originalAdminToken', token);
      else localStorage.removeItem('originalAdminToken');
    },
    clearOriginalAdminToken() {
      this.originalAdminToken = '';
      localStorage.removeItem('originalAdminToken');
    },
    beginFreshSession(token: string) {
      this.clearOriginalAdminToken();
      this.setToken(token);
    },
    resetSessionData() {
      this.user = null;
      this.settings = null;
      this.billingAddress = null;
      this.eventTypePreferences = [];
      this.labelPreferences = [];
      this.loginIdentifiers = [];
      this.socialLogins = [];
      this.userOrganizations = [];
      this.ownedEventTypeIds = [];
      this.role = null;
      this.emailCheckResult = null;
      signalRService.stopConnection();
      useEventStore().$reset();
      useCommunicationStore().$reset();
    },
    async reloadSession() {
      this.resetSessionData();
      await this.fetchBootData();
    },
    async impersonate(userId: number) {
      if (this.originalAdminToken) {
        throw new Error('Már egy másik felhasználó nevében vagy.');
      }
      if (this.currentUserId != null && this.currentUserId === userId) {
        throw new Error('Saját magad nevében nem léphetsz be.');
      }
      const response = await api.post(`/sysadmin/users/${userId}/impersonate`);
      throwIfApiFailed(response.data, 'Az alias belépés sikertelen.');
      const data = unwrapApiPayload(response.data);
      const token = String(data.Token ?? data.token ?? '').trim();
      if (!token) throw new Error('Nem érkezett impersonate token.');
      const adminToken = this.token;
      this.setOriginalAdminToken(adminToken);
      this.setToken(token);
      suppressUnauthorized = true;
      try {
        await this.reloadSession();
      } catch (error) {
        this.setToken(adminToken);
        this.clearOriginalAdminToken();
        try {
          await this.reloadSession();
        } catch {
          /* keep the restored admin token even if boot fails */
        }
        throw error;
      } finally {
        suppressUnauthorized = false;
      }
      return String(data.Message ?? data.message ?? 'Sikeres alias belépés.');
    },
    async restoreAdminSession() {
      const adminToken = this.originalAdminToken;
      if (!adminToken) return false;
      suppressUnauthorized = true;
      try {
        this.setToken(adminToken);
        this.clearOriginalAdminToken();
        await this.reloadSession();
        return true;
      } finally {
        suppressUnauthorized = false;
      }
    },
    async handleUnauthorized() {
      if (suppressUnauthorized) return 'logout';
      if (unauthorizedInFlight) return unauthorizedInFlight;
      unauthorizedInFlight = (async () => {
        if (this.originalAdminToken) {
          try {
            await this.restoreAdminSession();
            if (typeof window !== 'undefined') window.location.replace('/admin');
            return 'restored' as const;
          } catch {
            this.clearOriginalAdminToken();
            this.logout();
            if (typeof window !== 'undefined') window.location.replace('/login');
            return 'logout' as const;
          }
        }
        this.logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.replace('/login');
        }
        return 'logout' as const;
      })().finally(() => {
        unauthorizedInFlight = null;
      });
      return unauthorizedInFlight;
    },
    logout() {
      this.resetSessionData();
      this.token = '';
      this.clearOriginalAdminToken();
      localStorage.removeItem('token');
    },
  },
});
