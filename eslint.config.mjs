import antfu from '@antfu/eslint-config';

export default antfu(
  {
    formatters: true,
    react: true,
    rules: {
      'react-hooks/exhaustive-deps': 'off', // horrible rule that shouldnt exist
      'style/semi': ['warn', 'always'], // semicolons good
      'style/member-delimiter-style': ['warn', { multiline: { delimiter: 'semi' } }], // default is ugly
      'react/prefer-destructuring-assignment': 'off', // nah
      'ts/ban-types': 'off', // nah
      'ts/no-redeclare': 'off', // Some components rely on this
      'react/prefer-shorthand-boolean': 'off', // more explicit = better
      'react/no-useless-fragment': 'off', // false positives

      // Fix these later:
      'react-refresh/only-export-components': 'off',
      'unused-imports/no-unused-vars': 'off',
      'react/no-create-ref': 'off',
      'react-dom/no-missing-button-type': 'off',
      'no-case-declarations': 'off',
      'no-console': 'off',
      'no-unreachable-loop': 'off',
      'import/no-duplicates': 'off',
      'node/prefer-global/process': 'off',
    },
  },
  {
    ignores: ['**/dbschema'],
  },
);
