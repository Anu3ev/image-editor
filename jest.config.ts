import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/specs/**/*.test.ts',
    '<rootDir>/specs/**/*.spec.ts'
  ],
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  transform: {
    '\\.ts$': 'ts-jest'
  },
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid)/)'
  ]
}

export default config
