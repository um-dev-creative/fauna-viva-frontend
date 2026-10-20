// Karma configuration for `ng test`: Chrome headless, and a coverage gate of 85 % that every source file counts towards
// (see scripts/check-coverage-files.mjs: karma only reports the files a spec imports, so that script makes sure none is missing).
const path = require('node:path');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: { jasmine: { random: true }, clearContext: false },
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: {
      dir: path.join(__dirname, 'coverage/fauna-viva-frontend'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcovonly' }, { type: 'json-summary' }],
      check: { global: { statements: 85, branches: 85, functions: 85, lines: 85 } },
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: { ChromeHeadlessNoSandbox: { base: 'ChromeHeadless', flags: ['--no-sandbox'] } },
    restartOnFileChange: true,
  });
};
