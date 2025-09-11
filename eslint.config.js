/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */
import globals from 'globals'
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import sortKeysFix from 'eslint-plugin-sort-keys-fix'
import parser from 'vue-eslint-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['jest.config.ts', 'vite.config.*.js']
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:vue/essential',
    'plugin:vue/strongly-recommended',
    'plugin:vue/recommended',
    'airbnb-base'
  ),
  {
    plugins: {
      vue,
      'sort-keys-fix': sortKeysFix
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.jquery,
        ...globals.amd,
        ...globals.jest,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        I18n: 'readonly',
        $: 'writable',
        CodeMirror: 'readonly',
        self: 'writable',
        insYmaps: 'readonly',
        process: 'readonly'
      },

      parser,
      ecmaVersion: 2022,
      sourceType: 'module'
    },

    rules: {
      'no-prototype-builtins': 'warn',

      indent: ['error', 2, {
        FunctionDeclaration: {
          parameters: 'first'
        },

        FunctionExpression: {
          parameters: 'first'
        },

        CallExpression: {
          arguments: 'first'
        },

        ObjectExpression: 1,
        ArrayExpression: 'first'
      }],

      'linebreak-style': ['error', 'unix'],
      'no-console': 'off',
      'no-debugger': 'warn',

      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_'
      }],

      camelcase: ['warn', {
        properties: 'never',
        ignoreDestructuring: true
      }],

      'max-len': ['warn', {
        code: 120,
        ignoreComments: true
      }],

      'keyword-spacing': 'warn',
      'space-infix-ops': 'warn',
      'space-before-function-paren': ['warn', 'never'],
      'comma-spacing': 'warn',

      'brace-style': ['warn', '1tbs', {
        allowSingleLine: true
      }],

      curly: ['warn', 'multi-line', 'consistent'],

      'no-else-return': ['warn', {
        allowElseIf: false
      }],

      'operator-linebreak': 'warn',
      'block-spacing': 'warn',
      'comma-style': 'error',
      'dot-location': ['warn', 'property'],
      'func-call-spacing': 'error',
      'key-spacing': 'warn',
      'new-cap': 'warn',
      'new-parens': 'warn',
      'no-extra-parens': 'warn',
      'no-floating-decimal': 'warn',
      'no-lone-blocks': 'error',
      'no-multi-spaces': 'warn',
      'no-sequences': 'error',
      'no-template-curly-in-string': 'warn',
      'no-trailing-spaces': 'warn',
      'no-unneeded-ternary': 'error',

      'object-curly-newline': ['warn', {
        consistent: true
      }],

      'rest-spread-spacing': 'error',
      'space-before-blocks': 'warn',
      'template-curly-spacing': 'error',

      'vue/valid-v-slot': ['error', {
        allowModifiers: true
      }],

      'vue/component-name-in-template-casing': ['warn', 'kebab-case', {
        registeredComponentsOnly: false
      }],

      'vue/html-indent': ['warn', 2, {
        baseIndent: 0
      }],

      'vue/max-attributes-per-line': ['warn', {
        singleline: 100,
        multiline: 1
      }],

      'vue/no-static-inline-styles': 'warn',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': 'warn',
      'vue/no-v-text-v-html-on-component': 'off',
      'vue/v-on-function-call': ['error', 'never'],

      'vue/eqeqeq': ['warn', 'always', {
        null: 'ignore'
      }],

      'vue/object-curly-spacing': ['error', 'always'],
      'vue/prefer-separate-static-class': 1,
      'vue/require-prop-types': 2,
      'vue/no-restricted-html-elements': ['warn', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],

      'vue/no-restricted-syntax': ['warn', {
        selector: '[name=$parent]'
      }, {
        selector: '[name=$root]'
      }, {
        selector: "VElement[name='ui-text-field'] VDirectiveKey > VIdentifier[name=rules]",
        message: 'Не используем frontend валидацию'
      }],

      'vue/attributes-order': ['warn', {
        order: [
          'DEFINITION',
          'LIST_RENDERING',
          'CONDITIONALS',
          'RENDER_MODIFIERS',
          'GLOBAL',
          ['UNIQUE', 'SLOT'],
          'TWO_WAY_BINDING',
          'OTHER_DIRECTIVES',
          'ATTR_SHORTHAND_BOOL',
          'ATTR_DYNAMIC',
          'ATTR_STATIC',
          'CONTENT',
          'EVENTS'
        ],

        alphabetical: false
      }],

      'vue/order-in-components': ['warn', {
        order: [
          'el',
          'name',
          'key',
          'parent',
          'functional',
          ['delimiters', 'comments'],
          ['components', 'directives', 'filters'],
          'extends',
          'mixins',
          ['provide', 'inject'],
          'vueT',
          'ROUTER_GUARDS',
          'layout',
          'middleware',
          'validate',
          'scrollToTop',
          'transition',
          'loading',
          'inheritAttrs',
          'constants',
          'model',
          ['props', 'propsData'],
          'emits',
          'setup',
          'asyncData',
          'data',
          'fetch',
          'head',
          'computed',
          'watch',
          'watchQuery',
          'LIFECYCLE_HOOKS',
          'methods',
          ['template', 'render'],
          'renderError'
        ]
      }],

      'vue/require-explicit-emits': 'warn',

      'vue/no-unused-properties': ['warn', {
        groups: ['props', 'data', 'computed', 'methods'],
        deepData: true,
        ignorePublicMembers: true
      }],

      'vue/padding-line-between-blocks': ['warn', 'always'],
      'vue/require-name-property': 'warn',
      'vue/no-dupe-keys': 'error',
      'vue/no-deprecated-filter': 'warn',

      'vue/custom-event-name-casing': ['warn', 'kebab-case', {
        ignores: ['/^[a-z]+(?:-[a-z]+)*:[a-z]+(?:-[a-z]+)*$/u']
      }],

      'vue/prefer-template': 'warn',

      'no-restricted-syntax': ['warn', {
        selector: '[name=$parent]'
      }, {
        selector: '[name=$root]'
      }, {
        selector: ":matches(CallExpression[callee.property.name='then'], FunctionExpression[async='true']) CallExpression > MemberExpression[object.name='window'][property.name='open']",
        message: 'window.open на safari не доступен в асинхронных функциях,вместо этого используем this.$windowOpen'
      }, {
        selector: "IfStatement[test.loc.end.column<40] > BlockStatement[body] > :first-child[type='ReturnStatement'][loc.end.column<35][argument.type!='ObjectExpression'][argument.type!='ConditionalExpression'][argument.type!='ArrayExpression'][argument.type!='CallExpression']",
        message: 'Условие выхода из функции без side-эффектов должно быть без { }'
      }, {
        selector: "FunctionExpression > BlockStatement[body] > :last-child[type='IfStatement'][alternate.type='BlockStatement']",
        message: 'Используй return, вместо else'
      }, {
        selector: "UnaryExpression[operator='+']",
        message: 'Запрещено использовать + для приведения к Number - используем Number(), parseInt() или иные явные способы'
      }, {
        selector: "UnaryExpression[operator='!'] > UnaryExpression[operator='!']",
        message: 'Запрещено использовать !! для приведения к Boolean - используем Boolean(something)'
      }, {
        selector: ":matches(IfStatement > MemberExpression[object.name='array'][property.name='length'], IfStatement > LogicalExpression > MemberExpression[object.name='array'][property.name='length'],IfStatement > MemberExpression[object.name='string'][property.name='length'], IfStatement > LogicalExpression > MemberExpression[object.name='string'][property.name='length'])",
        message: "Запрещено использовать if (something.length) для проверки длины массива или строки на '> 0' - используем if (something.length > 0)"
      }, {
        selector: "IfStatement[alternate.type!='BlockStatement'][alternate!='null'][alternate.consequent.type!='BlockStatement']",
        message: 'Запрещено использовать однострочные конструкции с else или else if'
      }],

      semi: ['error', 'never'],
      'comma-dangle': ['error', 'never'],
      radix: ['error', 'as-needed'],
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'import/prefer-default-export': 'off',

      'no-restricted-imports': ['warn', {
        paths: ['lodash']
      }],

      'no-param-reassign': ['warn', {
        props: false
      }],

      'no-underscore-dangle': 'off',

      'global-require': 1,
      'arrow-parens': 1,
      eqeqeq: 1,
      'no-restricted-globals': 1,
      'no-mixed-operators': 1,
      'no-use-before-define': 1,
      'consistent-return': 1,

      'no-shadow': ['warn', {
        allow: ['state']
      }],

      'prefer-destructuring': 1,
      'no-bitwise': 1,
      'no-nested-ternary': 1,
      'no-loop-func': 1,
      'prefer-regex-literals': 1,
      'prefer-const': 1,
      'no-multi-str': 1,
      'default-case': 1,
      'no-unused-expressions': 1,
      'no-plusplus': 1,
      'no-multi-assign': 1,
      'prefer-spread': 1,
      'no-continue': 0,
      'guard-for-in': 1,
      'no-lonely-if': 1,
      'vars-on-top': 1,
      'no-var': 1,
      'import/no-cycle': 1,
      'no-new': 1,
      'class-methods-use-this': 1,
      'max-classes-per-file': 1,
      'no-void': 1,
      'block-scoped-var': 1,
      'import/no-webpack-loader-syntax': 1,
      'no-return-assign': 1,
      'no-await-in-loop': 1,
      'import/no-extraneous-dependencies': 1,
      'default-param-last': 1,
      'no-eval': 1,
      'import/no-mutable-exports': 1,
      'no-promise-executor-return': 1,
      'func-names': 0
    }
  },
  {
  // применить только к .ts (и .vue, если у вас там <script lang="ts">)
    files: ['**/*.ts', '**/*.vue'],

    // уровень «каким парсером обрабатывать»
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },

    // плагины – на верхнем уровне
    plugins: {
      '@typescript-eslint': tsPlugin
    },

    rules: {
    // подтягиваем рекомендуемые правила
      ...tsPlugin.configs.recommended.rules,
      // пример своего правила
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    // Специальная конфигурация для spec/test файлов
    files: ['**/*.spec.ts', '**/*.test.ts', '**/specs/**/*.ts'],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        ...globals.jest
      }
    },

    plugins: {
      '@typescript-eslint': tsPlugin
    },

    rules: {
      // Базовые TypeScript правила
      ...tsPlugin.configs.recommended.rules,

      // Разрешаем any в тестах для моков
      '@typescript-eslint/no-explicit-any': 'off',

      // Разрешаем доступ к приватным свойствам через bracket notation
      'dot-notation': 'off',

      // Более мягкие правила для тестов
      'max-len': ['warn', { code: 140, ignoreComments: true }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Разрешаем trailing comma в тестах
      'comma-dangle': ['error', 'never'],

      // Не требуем деструктуризацию в тестах - иногда прямое обращение понятнее
      'prefer-destructuring': 'off',

      // Разрешаем function expressions в тестах
      'func-names': 'off',

      // Более гибкие правила для объектов в тестах
      'object-curly-newline': 'off',
      'max-classes-per-file': null
    }
  }
]
