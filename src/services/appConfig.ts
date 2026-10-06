export const BACKEND_URL =
  'https://script.google.com/macros/s/AKfycbxglEayhs9nPXWpa43RB5u0DpJl6FVJa9jH8XWL6H12x-ax8H4oOQD23RewCBRcxpfSjw/exec';

export interface PublicAppConfig {
  environment?: string;
  timezone?: string;

  trust?: {
    code?: string;
    name?: string;
    regdNo?: string;
    email?: string;
    phone?: string;
    address?: string;
    slogan?: string;
    taxDeclaration?: string;
    donationUrl?: string;
  };

  payment?: {
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifsc?: string;
    branch?: string;
    upiId?: string;
  };

  google?: {
    spreadsheetId?: string;
  };
}

let cachedConfig: PublicAppConfig | null = null;

export async function loadAppConfig(): Promise<PublicAppConfig> {

  if (cachedConfig) {
    return cachedConfig;
  }

  const response = await fetch(
    `${BACKEND_URL}?action=get_config`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load application configuration. HTTP ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success || !result.config) {
    throw new Error(
      result.error ||
      'Backend returned invalid application configuration.'
    );
  }

  cachedConfig = result.config;

  return cachedConfig;
}

export function getAppConfigSync(): PublicAppConfig | null {
  return cachedConfig;
}
