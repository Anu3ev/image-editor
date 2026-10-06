import assert from 'node:assert/strict'
import test from 'node:test'
import { packageConsumerHarness } from './test-support/package-consumer-harness.mjs'

const tarball = '/package-consumer-test/provided.tgz'

test('Переданный tarball проверяется без повторной сборки или упаковки библиотеки', async() => {
  const harness = packageConsumerHarness({ args: ['--tarball', tarball] })
  await harness.run()
  assert.equal(harness.calls.some(({ args }) => args[0] === 'pack'), false)
  assert.equal(harness.calls.some(({ args, cwd }) => args[1] === 'build' && cwd === harness.root), false)
  const install = harness.calls.find(({ args }) => args[0] === 'install')
  assert.equal(install.args.at(-1), tarball)
  assert.equal(harness.files.get(tarball).toString(), 'original-tarball-bytes')
  assert.equal(harness.calls.filter(({ args }) => args[1] === 'typecheck').length, 4)
})

test('Локальная проверка упаковывает существующую сборку ровно один раз', async() => {
  const harness = packageConsumerHarness()
  await harness.run()
  assert.equal(harness.calls.filter(({ args }) => args[0] === 'pack').length, 1)
  assert.equal(harness.calls.some(({ args, cwd }) => args[1] === 'build' && cwd === harness.root), false)
})

for (const args of [
  ['--tarball'], ['--tarball', ''], ['--tarball', '--other'],
  ['--unknown', tarball], ['--tarball', tarball, 'extra']
]) {
  test(`Неверные аргументы отклоняются до npm: ${JSON.stringify(args)}`, async() => {
    const harness = packageConsumerHarness({ args })
    await assert.rejects(harness.run(), /Usage:/)
    assert.equal(harness.calls.length, 0)
  })
}

test('Отсутствующий переданный файл не заменяется новой упаковкой', async() => {
  const harness = packageConsumerHarness({ args: ['--tarball', '/missing.tgz'] })
  await assert.rejects(harness.run(), /ENOENT/)
  assert.equal(harness.calls.length, 0)
})

for (const [entries, message] of [
  [['package/dist/assets/worker-test.js'], /Missing root declarations/],
  [['package/dist/main.d.ts'], /Missing worker asset/]
]) {
  test(`Отсутствующее содержимое переданного пакета блокирует проверку: ${message}`, async() => {
    const harness = packageConsumerHarness({ args: ['--tarball', tarball], entries })
    await assert.rejects(harness.run(), message)
    assert.equal(harness.calls.some(({ command }) => command === 'npm'), false)
  })
}

test('Изменение переданного tarball после проверки отклоняется', async() => {
  const harness = packageConsumerHarness({ args: ['--tarball', tarball], mutateTarball: true })
  await assert.rejects(harness.run(), /Checked tarball changed/)
})

test('Ошибка consumer завершает проверку неуспешно', async() => {
  const harness = packageConsumerHarness({ args: ['--tarball', tarball], failConsumerBuild: true })
  await assert.rejects(harness.run(), /npm run build failed/)
  assert.equal(harness.calls.some(({ args }) => args[0] === 'pack'), false)
})

for (const [lockedDependencies, installedDependencies, message] of [
  [{}, { 'node_modules/fabric': { version: '7.3.1', integrity: 'expected' } }, /Unpinned consumer dependency/],
  [
    { 'node_modules/fabric': { version: '7.3.1', integrity: 'expected' } },
    { 'node_modules/fabric': { version: '8.0.0', integrity: 'expected' } },
    /Consumer dependency changed/
  ],
  [
    { 'node_modules/fabric': { version: '7.3.1', integrity: 'expected' } },
    { 'node_modules/fabric': { version: '7.3.1', integrity: 'changed' } },
    /Consumer dependency integrity changed/
  ]
]) {
  test(`Метаданные реестра не позволяют изменить зафиксированные зависимости: ${message}`, async() => {
    const harness = packageConsumerHarness({ args: ['--tarball', tarball], lockedDependencies, installedDependencies })
    await assert.rejects(harness.run(), message)
  })
}
