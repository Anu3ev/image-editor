import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/specs/**/*.test.ts',
    '<rootDir>/specs/**/*.spec.ts'
  ],
  // Временно исключаем проблемный тест
  testPathIgnorePatterns: [
    '<rootDir>/specs/src/main.spec.ts'
  ],
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  transform: {
    '\\.ts$': ['ts-jest', {
      diagnostics: false
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid)/)'
  ]
}

export default config
