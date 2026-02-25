const { AppError } = require('../middleware/error.middleware');

const INTEGRATION_SCOPES = {
  gmail: ['https://www.googleapis.com/auth/gmail.readonly'],
  gcal: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
};

function parseScopes(scopeValue) {
  if (!scopeValue || typeof scopeValue !== 'string') return new Set();
  return new Set(
    scopeValue
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function hasRequiredGoogleScopes(tokens, requiredScopes = []) {
  const granted = parseScopes(tokens?.scope);
  return requiredScopes.every((scope) => granted.has(scope));
}

function hasGoogleCredentials(tokens) {
  return Boolean(tokens && (tokens.access_token || tokens.refresh_token));
}

function requireGoogleIntegration(user, integrationType) {
  const scopes = INTEGRATION_SCOPES[integrationType] || [];

  if (!hasGoogleCredentials(user?.google_tokens)) {
    throw new AppError(
      'Google account is not connected. Reconnect Google and try again.',
      412,
      'GOOGLE_REAUTH_REQUIRED'
    );
  }

  if (!hasRequiredGoogleScopes(user.google_tokens, scopes)) {
    throw new AppError(
      `Missing required Google permissions for ${integrationType}. Please reconnect Google with the latest scopes.`,
      412,
      'GOOGLE_SCOPE_MISSING'
    );
  }
}

function isWhatsAppConfigured() {
  return Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_WHATSAPP_HOST);
}

function validateSourceConfig({ type, config, user }) {
  if (type === 'whatsapp') {
    if (!isWhatsAppConfigured()) {
      throw new AppError(
        'WhatsApp integration is not configured on the server. Set RAPIDAPI_KEY and RAPIDAPI_WHATSAPP_HOST.',
        412,
        'WHATSAPP_NOT_CONFIGURED'
      );
    }
    if (!config?.chatId || !String(config.chatId).trim()) {
      throw new AppError('WhatsApp source requires config.chatId', 400, 'INVALID_SOURCE_CONFIG');
    }
  }

  if (type === 'gmail' || type === 'gcal') {
    requireGoogleIntegration(user, type);
  }
}

module.exports = {
  INTEGRATION_SCOPES,
  parseScopes,
  hasRequiredGoogleScopes,
  hasGoogleCredentials,
  requireGoogleIntegration,
  isWhatsAppConfigured,
  validateSourceConfig,
};
