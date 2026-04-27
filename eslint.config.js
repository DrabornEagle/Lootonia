// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'archive/**',
      '_cleanup_archive/**',
      '_cleanup_reports/**',
      '_repo_hygiene_archive/**',
      'audit/**',
      'docs/audits/**',
      'docs/project/**',
      'phase21_dashboard_manual_fix/**',
      'lootonia_phase1_db_patchpack/**',
      'lootonia_phase9_drop_codes_column_hotfix/**',
      '.phase0_1b_backup_*/**',
    ],
  },
]);
