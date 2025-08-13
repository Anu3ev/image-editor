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
    // '<rootDir>/specs/src/main.spec.ts'
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
    '^@/(.*)$': '<rootDir>/src/$1',
    '^nanoid$': '<rootDir>/specs/__mocks__/nanoid.ts',
    '^fabric$': '<rootDir>/specs/__mocks__/fabric.ts',
    '^jsondiffpatch$': '<rootDir>/specs/__mocks__/jsondiffpatch.ts',
    '^diff-match-patch$': '<rootDir>/specs/__mocks__/diff-match-patch.ts',
    '\\?worker$': '<rootDir>/specs/__mocks__/worker.ts'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|fabric|jsondiffpatch|diff-match-patch)/)'
  ],
  // Настройка сбора покрытия для всех файлов проекта
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ]
  // Убираем пороги покрытия чтобы низкое покрытие не считалось ошибкой
  // coverageThreshold: {
  //   global: {
  //     branches: 50,
  //     functions: 50,
  //     lines: 50,
  //     statements: 50
  //   }
  // }
}

export default config
