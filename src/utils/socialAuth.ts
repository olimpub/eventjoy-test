import axios from 'axios';
import { googleTokenLogin } from 'vue3-google-login';

export type SocialProvider = 'Google' | 'Facebook';

export interface SocialProfilePayload {
  Provider: SocialProvider;
  ProviderId: string;
  EmailAddress: string;
  FirstName?: string;
  LastName?: string;
}

export class SocialAuthError extends Error {
  cancelled: boolean;

  constructor(message: string, cancelled = false) {
    super(message);
    this.name = 'SocialAuthError';
    this.cancelled = cancelled;
  }
}

function trimName(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function requireEmail(email: unknown, provider: SocialProvider): string {
  const value = String(email ?? '').trim();
  if (!value) {
    throw new SocialAuthError(
      provider === 'Facebook'
        ? 'A fiókhoz nincs e-mail cím. Facebooknál engedélyezd az e-mailt.'
        : 'A fiókhoz nincs e-mail cím.'
    );
  }
  return value;
}

function facebookMe(): Promise<{ id?: string; email?: string; first_name?: string; last_name?: string }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.FB) {
      reject(new SocialAuthError('Hiba a Facebook inicializálása közben.'));
      return;
    }

    window.FB.login(
      (response: { authResponse?: unknown }) => {
        if (!response?.authResponse) {
          reject(new SocialAuthError('A Facebook bejelentkezés megszakítva.', true));
          return;
        }

        window.FB.api('/me', { fields: 'id,email,first_name,last_name' }, (userInfo: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
        }) => {
          if (!userInfo?.id) {
            reject(new SocialAuthError('Nem sikerült a Facebook adatok lekérése.'));
            return;
          }
          resolve(userInfo);
        });
      },
      { scope: 'public_profile,email' }
    );
  });
}

/** OAuth a loginról és az Adataim csatolásról. Nem hív EventJoy API-t. */
export async function fetchSocialProfile(provider: SocialProvider): Promise<SocialProfilePayload> {
  if (provider === 'Google') {
    const response = await googleTokenLogin();
    if (!response?.access_token) {
      throw new SocialAuthError('Nem sikerült a Google bejelentkezés.', true);
    }

    const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      params: { access_token: response.access_token },
    });
    const userInfo = userInfoRes.data as {
      sub?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
    };

    if (!userInfo?.sub) {
      throw new SocialAuthError('Nem sikerült a Google adatok lekérése.');
    }

    return {
      Provider: 'Google',
      ProviderId: String(userInfo.sub),
      EmailAddress: requireEmail(userInfo.email, 'Google'),
      FirstName: trimName(userInfo.given_name),
      LastName: trimName(userInfo.family_name),
    };
  }

  const userInfo = await facebookMe();
  return {
    Provider: 'Facebook',
    ProviderId: String(userInfo.id),
    EmailAddress: requireEmail(userInfo.email, 'Facebook'),
    FirstName: trimName(userInfo.first_name),
    LastName: trimName(userInfo.last_name),
  };
}

export function socialApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { Result1?: { ReturnDescription?: string } } };
    message?: string;
  };
  if (error instanceof SocialAuthError) return error.message;
  return err.response?.data?.Result1?.ReturnDescription || fallback;
}
