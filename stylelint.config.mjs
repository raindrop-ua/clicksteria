/** @type {import('stylelint').Config} */
export default {
  rules: {
    'rule-empty-line-before': ['always', { except: ['first-nested'], ignore: ['after-comment'] }],
    'at-rule-empty-line-before': [
      'always',
      {
        except: ['first-nested', 'blockless-after-same-name-blockless'],
        ignore: ['after-comment'],
      },
    ],
  },
};
