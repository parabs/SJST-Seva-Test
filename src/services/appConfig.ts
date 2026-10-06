/**
 * =========================================================================
 * SJST SEVA — APPLICATION CONFIGURATION
 * =========================================================================
 *
 * The Configuration Sheet is the source of truth for application
 * configuration.
 *
 * BOOTSTRAP:
 * - This URL is used ONLY to obtain the configuration.
 * - Once configuration is loaded, api.backendUrl becomes the runtime
 *   backend URL.
 *
 * IMPORTANT:
 * - Do not use BACKEND_URL throughout the application.
 * - Use getAppConfigSync()?.api?.backendUrl after configuration loads.
 */

/**
 * =========================================================================
 * BOOTSTRAP CONFIGURATION URL
 * =========================================================================
 *
 * Temporary bootstrap value required to call get_config.
 *
 * The backend returns the configured api.backendUrl from the
 * Configuration Sheet.
 */
const CONFIG_BOOTSTRAP_URL =
  'https://script.google.com/macros/s/AKfycbxglEayhs9nPXWpa43RB5u0DpJl6FVJa9jH8XWL6H12x-ax8H4oOQD23RewCBRcxpfSjw/exec';


/**
 * =========================================================================
 * PUBLIC APPLICATION CONFIGURATION
 * =========================================================================
 */

export interface PublicAppConfig {

  environment?: string;

  timezone?: string;


  /**
   * Application backend configuration.
   */
  api?: {

    backendUrl?: string;

  };


  /**
   * Trust information.
   */
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


  /**
   * Public payment information.
   */
  payment?: {

    bankName?: string;

    accountName?: string;

    accountNo?: string;

    ifsc?: string;

    branch?: string;

    upiId?: string;

  };


  /**
   * Runtime Google configuration.
   */
  google?: {

    spreadsheetId?: string;

  };

}


/**
 * =========================================================================
 * CONFIGURATION CACHE
 * =========================================================================
 */

let cachedConfig: PublicAppConfig | null = null;


/**
 * =========================================================================
 * LOAD APPLICATION CONFIGURATION
 * =========================================================================
 *
 * First call:
 *
 *   CONFIG_BOOTSTRAP_URL
 *          ↓
 *      get_config
 *          ↓
 *   Configuration Sheet
 *          ↓
 *   public.api.backendUrl
 *
 * Subsequent calls use the cached configuration.
 */

export async function loadAppConfig(): Promise<PublicAppConfig> {

  if (cachedConfig) {

    return cachedConfig;

  }


  const response = await fetch(
    `${CONFIG_BOOTSTRAP_URL}?action=get_config`
  );


  if (!response.ok) {

    throw new Error(
      `Failed to load application configuration. HTTP ${response.status}`
    );

  }


  const result = await response.json();


  if (
    !result.success ||
    !result.config
  ) {

    throw new Error(
      result.error ||
      'Backend returned invalid application configuration.'
    );

  }


  const config =
    result.config as PublicAppConfig;


  /**
   * Validate the configured backend URL.
   *
   * This prevents the application from silently running without
   * a valid backend configuration.
   */

  if (
    !config.api?.backendUrl
  ) {

    throw new Error(
      'Application configuration is missing api.backendUrl.'
    );

  }


  cachedConfig = config;


  return cachedConfig;

}


/**
 * =========================================================================
 * SYNCHRONOUS CONFIGURATION ACCESS
 * =========================================================================
 */

export function getAppConfigSync():
  PublicAppConfig | null {

  return cachedConfig;

}


/**
 * =========================================================================
 * RUNTIME BACKEND URL
 * =========================================================================
 *
 * Use this only after loadAppConfig() has completed.
 *
 * Example:
 *
 * const config = await loadAppConfig();
 *
 * const backendUrl =
 *   config.api?.backendUrl;
 */

export function getConfiguredBackendUrl():
  string {

  const backendUrl =
    cachedConfig?.api?.backendUrl?.trim();


  if (!backendUrl) {

    throw new Error(
      'Application configuration has not been loaded or api.backendUrl is missing.'
    );

  }


  return backendUrl;

}