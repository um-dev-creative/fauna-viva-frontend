'use strict';

const REQUIRED_IN_PRODUCTION = ['BACKBONE_APPLICATION_ID', 'BACKBONE_CLIENT_ID', 'BACKBONE_CLIENT_SECRET'];

/**
 * What stops the BFF from starting. Login needs the Fauna Viva application of backbone-rest and this front end's
 * application client; in production a missing one is a deployment error, not something to discover at the first login.
 * Outside production the client may be left out (backbone then decides whether it accepts a login without one), but
 * half a credential is always a mistake.
 *
 * @param {Record<string, any>} settings the values of config/constants.js
 * @returns {string[]} one message per problem; empty when the BFF may start
 */
function settingsProblems(settings) {
  const problems = [];
  if (settings.NODE_ENV === 'production') {
    for (const name of REQUIRED_IN_PRODUCTION) {
      if (!settings[name]) problems.push(`${name} is required in production`);
    }
  }
  if (Boolean(settings.BACKBONE_CLIENT_ID) !== Boolean(settings.BACKBONE_CLIENT_SECRET)) {
    problems.push('BACKBONE_CLIENT_ID and BACKBONE_CLIENT_SECRET must be set together');
  }
  if (settings.BACKBONE_CLIENT_ID && settings.BACKBONE_CLIENT_SCOPES.length === 0) {
    problems.push('BACKBONE_CLIENT_SCOPES must name at least one scope');
  }
  if (settings.NODE_ENV === 'production' && settings.BACKBONE_TLS_INSECURE) {
    problems.push('BACKBONE_TLS_INSECURE must not be set in production');
  }
  if (settings.TRUST_PROXY === true) {
    problems.push('TRUST_PROXY=true trusts any X-Forwarded-For; set the number of proxies in front (1 behind nginx) or their addresses');
  }
  return problems;
}

module.exports = { settingsProblems };
