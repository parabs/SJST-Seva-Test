
/**
 * Public frontend configuration.
 * Never store OAuth secrets, access tokens, or other secrets here.
 */
export const FRONTEND_CONFIG = {
  appName: 'SJST Seva',
  environment: 'TEST',

  // Used only to retrieve the public configuration.
  configBootstrapUrl:
    'https://script.google.com/macros/s/AKfycbxglEayhs9nPXWpa43RB5u0DpJl6FVJa9jH8XWL6H12x-ax8H4oOQD23RewCBRcxpfSjw/exec',

  assets: {
    logoPath: 'images/Logo.jpeg',
    watermarkPath: 'images/Watermark.jpeg',
  },
} as const;
