const { getConfig } = require('@salesforce/eslint-config-lwc');

module.exports = getConfig({
  overrides: [
    {
      files: ['**/__tests__/**/*.js'],
      env: {
        jest: true
      }
    }
  ]
});
