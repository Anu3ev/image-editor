import { test, expect } from '../../fixtures/editor.fixture'
import {
  CUSTOM_LOCALIZATION_CONTENT,
  CUSTOM_LANGUAGE_RESOURCES,
  CUSTOM_LANGUAGE_EXPECTATIONS,
  CUSTOM_NOTIFICATION_RESOURCES,
  LOCALIZATION_EXAMPLES,
  LOCALIZATION_ERROR_EXPECTATIONS,
  LOCALIZATION_MISSING_CONTAINER,
  LOCALIZATION_NOTIFICATION_DIAGNOSTICS,
  LOCALIZATION_NOTIFICATION_MESSAGES,
  LOCALIZATION_RESIZE_IMAGE,
  LOCALIZATION_RESIZED_DIMENSIONS,
  LOCALIZATION_WORKER_ACTION,
  RUSSIAN_OVERRIDE_RESOURCES,
  RUSSIAN_TOOLBAR_EXPECTATIONS
} from '../../fixtures/data/localization.data'

test.describe('Editor initialization language', () => {
  for (const example of LOCALIZATION_EXAMPLES) {
    test(`renders ${example.language} default text and toolbar labels`, async({ editorModel }) => {
      const containerId = `localized-${example.language}`
      await editorModel.localization.create({ containerId, language: example.language })

      expect(await editorModel.localization.addText({ containerId })).toBe(example.newText)
      expect(await editorModel.localization.toolbarLabels(containerId)).toContain(example.duplicate)
      expect(await editorModel.localization.optionActionLabels(containerId)).toContain(example.duplicate)
    })

    test(`keeps initialization errors English with the ${example.language} UI`, async({ editorModel }) => {
      const message = await editorModel.localization.missingContainerError({
        containerId: LOCALIZATION_MISSING_CONTAINER,
        language: example.language
      })

      expect(message).toBe(LOCALIZATION_ERROR_EXPECTATIONS.missingContainer)
    })

    test(`keeps real worker errors English with the ${example.language} UI`, async({ editorModel }) => {
      const containerId = `worker-${example.language}`
      await editorModel.localization.create({ containerId, language: example.language })

      expect(await editorModel.localization.workerError({
        containerId,
        action: LOCALIZATION_WORKER_ACTION
      })).toBe(LOCALIZATION_ERROR_EXPECTATIONS.unknownWorkerAction)
    })
  }

  test('uses English when no language is supplied', async({ editorModel }) => {
    const containerId = 'default-language'
    await editorModel.localization.create({ containerId })

    expect(await editorModel.localization.addText({ containerId })).toBe(LOCALIZATION_EXAMPLES[0].newText)
    expect(await editorModel.localization.toolbarLabels(containerId)).toContain(LOCALIZATION_EXAMPLES[0].duplicate)
  })

  test('falls back to English for an unsupported language', async({ editorModel }) => {
    const containerId = 'unsupported-language'
    await editorModel.localization.create({ containerId, language: 'zz-ZZ' })

    expect(await editorModel.localization.addText({ containerId })).toBe(LOCALIZATION_EXAMPLES[0].newText)
    expect(await editorModel.localization.toolbarLabels(containerId)).toContain(LOCALIZATION_EXAMPLES[0].duplicate)
  })

  test('keeps simultaneous English and Russian instances independent', async({ editorModel }) => {
    const english = 'isolated-english'
    const russian = 'isolated-russian'
    await editorModel.localization.create({ containerId: english, language: 'en' })
    await editorModel.localization.create({ containerId: russian, language: 'ru' })

    expect(await editorModel.localization.addText({ containerId: russian })).toBe(LOCALIZATION_EXAMPLES[1].newText)
    expect(await editorModel.localization.addText({ containerId: english })).toBe(LOCALIZATION_EXAMPLES[0].newText)
    expect(await editorModel.localization.toolbarLabels(english)).toContain(LOCALIZATION_EXAMPLES[0].duplicate)
    expect(await editorModel.localization.toolbarLabels(russian)).toContain(LOCALIZATION_EXAMPLES[1].duplicate)
  })

  test('preserves caller-provided labels and text, including empty text', async({ editorModel }) => {
    const containerId = 'custom-content'
    await editorModel.localization.create({
      containerId,
      language: 'pt-BR',
      customLanguages: CUSTOM_LANGUAGE_RESOURCES,
      toolbar: {
        actions: [{ handle: 'copyPaste', name: CUSTOM_LOCALIZATION_CONTENT.toolbarLabel }]
      }
    })

    expect(await editorModel.localization.addText({
      containerId,
      text: CUSTOM_LOCALIZATION_CONTENT.text
    })).toBe(CUSTOM_LOCALIZATION_CONTENT.text)
    expect(await editorModel.localization.toolbarLabels(containerId)).toEqual([CUSTOM_LOCALIZATION_CONTENT.toolbarLabel])
    expect(await editorModel.localization.addText({
      containerId,
      text: CUSTOM_LOCALIZATION_CONTENT.emptyText
    })).toBe(CUSTOM_LOCALIZATION_CONTENT.emptyText)
  })

  test('restores authored Russian text unchanged in an English editor', async({ editorModel }) => {
    const russian = 'persisted-russian'
    const english = 'restored-english'
    await editorModel.localization.create({ containerId: russian, language: 'ru' })
    await editorModel.localization.addText({
      containerId: russian,
      text: CUSTOM_LOCALIZATION_CONTENT.persistedText
    })
    const initialState = await editorModel.localization.saveState(russian)

    await editorModel.localization.create({ containerId: english, language: 'en', initialState })

    expect(await editorModel.localization.textContents(english)).toEqual([CUSTOM_LOCALIZATION_CONTENT.persistedText])
    expect(await editorModel.localization.addText({ containerId: english })).toBe(LOCALIZATION_EXAMPLES[0].newText)
    expect(await editorModel.localization.textContents(english)).toEqual([
      CUSTOM_LOCALIZATION_CONTENT.persistedText,
      LOCALIZATION_EXAMPLES[0].newText
    ])
  })

  test('preserves custom HTML labels for toolbar actions without icons', async({ editorModel }) => {
    const containerId = 'custom-html-label'
    await editorModel.localization.create({
      containerId,
      language: 'ru',
      toolbar: {
        actions: [{ handle: 'custom', name: CUSTOM_LOCALIZATION_CONTENT.toolbarHtml }]
      }
    })
    await editorModel.localization.addText({ containerId })

    expect(await editorModel.localization.toolbarLabels(containerId)).toEqual([
      CUSTOM_LOCALIZATION_CONTENT.toolbarHtmlText
    ])
  })

  test('resolves a custom regional language through its base language and English fallback', async({ editorModel }) => {
    const containerId = 'custom-regional-language'
    await editorModel.localization.create({
      containerId,
      language: 'pt-BR',
      customLanguages: CUSTOM_LANGUAGE_RESOURCES
    })

    expect(await editorModel.localization.addText({ containerId })).toBe(CUSTOM_LANGUAGE_EXPECTATIONS.newText)
    const labels = await editorModel.localization.toolbarLabels(containerId)
    expect(labels).toContain(CUSTOM_LANGUAGE_EXPECTATIONS.duplicate)
    expect(labels).toContain(CUSTOM_LANGUAGE_EXPECTATIONS.delete)
    expect(labels).toContain(CUSTOM_LANGUAGE_EXPECTATIONS.lockFallback)
    expect(await editorModel.localization.optionActionLabels(containerId)).toContain(CUSTOM_LANGUAGE_EXPECTATIONS.duplicate)
  })

  test('keeps initialization errors English with custom UI translations', async({ editorModel }) => {
    expect(await editorModel.localization.missingContainerError({
      containerId: LOCALIZATION_MISSING_CONTAINER,
      language: 'pt-BR',
      customLanguages: CUSTOM_LANGUAGE_RESOURCES
    })).toBe(LOCALIZATION_ERROR_EXPECTATIONS.missingContainer)
  })

  test('deep-merges a partial Russian override without losing built-in siblings', async({ editorModel }) => {
    const containerId = 'custom-russian-override'
    await editorModel.localization.create({
      containerId,
      language: 'ru',
      customLanguages: RUSSIAN_OVERRIDE_RESOURCES
    })

    expect(await editorModel.localization.addText({ containerId })).toBe(LOCALIZATION_EXAMPLES[1].newText)
    const labels = await editorModel.localization.toolbarLabels(containerId)
    expect(labels).toContain(RUSSIAN_TOOLBAR_EXPECTATIONS.overriddenDelete)
    expect(labels).toContain(RUSSIAN_TOOLBAR_EXPECTATIONS.duplicate)
  })

  test('isolates custom UI resources while keeping both instances’ worker errors English', async({ editorModel }) => {
    const custom = 'isolated-custom-resources'
    const builtin = 'isolated-builtin-resources'
    await editorModel.localization.create({
      containerId: custom,
      language: 'ru',
      customLanguages: RUSSIAN_OVERRIDE_RESOURCES
    })
    await editorModel.localization.create({ containerId: builtin, language: 'ru' })
    await editorModel.localization.addText({ containerId: custom })
    await editorModel.localization.addText({ containerId: builtin })

    expect(await editorModel.localization.toolbarLabels(custom)).toContain(RUSSIAN_TOOLBAR_EXPECTATIONS.overriddenDelete)
    expect(await editorModel.localization.toolbarLabels(builtin)).toContain(RUSSIAN_TOOLBAR_EXPECTATIONS.delete)
    expect(await editorModel.localization.customLanguageResources(custom)).toEqual(RUSSIAN_OVERRIDE_RESOURCES)
    expect(await editorModel.localization.customLanguageResources(builtin)).toBeUndefined()
    for (const containerId of [custom, builtin]) {
      expect(await editorModel.localization.workerError({
        containerId,
        action: LOCALIZATION_WORKER_ACTION
      })).toBe(LOCALIZATION_ERROR_EXPECTATIONS.unknownWorkerAction)
    }
  })
})

test.describe('Localized user notifications', () => {
  test('keeps export diagnostics English and user messages local to each instance', async({ editorModel }) => {
    const english = 'export-notification-english'
    const russian = 'export-notification-russian'
    await test.step('Create simultaneous English and Russian editors', async() => {
      await editorModel.localization.create({ containerId: english, language: 'en' })
      await editorModel.localization.create({ containerId: russian, language: 'ru' })
    })

    for (const example of [
      { containerId: russian, userMessage: LOCALIZATION_NOTIFICATION_MESSAGES.ru.noSelection },
      { containerId: english, userMessage: LOCALIZATION_NOTIFICATION_MESSAGES.en.noSelection }
    ]) {
      await test.step(`Read the failed export notification from ${example.containerId}`, async() => {
        const snapshot = await editorModel.localization.exportWithoutSelection(example.containerId)
        expect(snapshot.failed).toBe(true)
        expect(snapshot.events).toHaveLength(1)
        expect(snapshot.events[0]).toMatchObject({
          ...LOCALIZATION_NOTIFICATION_DIAGNOSTICS.noSelection,
          userMessage: example.userMessage
        })
        expect(snapshot.buffer).toEqual([{ type: 'editor:error', ...snapshot.events[0] }])
      })
    }
  })

  test('reports a localized crop error for a selected text object', async({ editorModel }) => {
    const containerId = 'crop-notification-russian'
    await editorModel.localization.create({ containerId, language: 'ru' })
    await editorModel.localization.addText({ containerId })

    const snapshot = await editorModel.localization.cropInvalidSelection(containerId)

    expect(snapshot.failed).toBe(true)
    expect(snapshot.events).toHaveLength(1)
    expect(snapshot.events[0]).toMatchObject({
      ...LOCALIZATION_NOTIFICATION_DIAGNOSTICS.invalidCrop,
      userMessage: LOCALIZATION_NOTIFICATION_MESSAGES.ru.invalidCrop
    })
    expect(snapshot.buffer).toEqual([{ type: 'editor:error', ...snapshot.events[0] }])
  })

  test('localizes the real resize warning and interpolates its bounds', async({ editorModel }) => {
    const containerId = 'resize-notification-russian'
    await editorModel.localization.create({ containerId, language: 'ru' })

    const snapshot = await test.step('Resize a raster image through the public image manager', async() => {
      return editorModel.localization.resizeImage({ containerId, ...LOCALIZATION_RESIZE_IMAGE })
    })

    await test.step('Check the resized bitmap and both public notification channels', () => {
      expect(snapshot).toMatchObject(LOCALIZATION_RESIZED_DIMENSIONS)
      expect(snapshot.events).toHaveLength(1)
      expect(snapshot.events[0]).toMatchObject({
        ...LOCALIZATION_NOTIFICATION_DIAGNOSTICS.resizeMax,
        userMessage: LOCALIZATION_NOTIFICATION_MESSAGES.ru.resizeMax
      })
      expect(snapshot.buffer).toEqual([{ type: 'editor:warning', ...snapshot.events[0] }])
    })
  })

  test('uses partial custom notification resources and falls back to English for missing keys', async({ editorModel }) => {
    const containerId = 'custom-notification-language'
    await editorModel.localization.create({
      containerId,
      language: 'pt-BR',
      customLanguages: CUSTOM_NOTIFICATION_RESOURCES
    })

    await test.step('Read the custom export notification with its original English diagnostic', async() => {
      const snapshot = await editorModel.localization.exportWithoutSelection(containerId)
      expect(snapshot.failed).toBe(true)
      expect(snapshot.events).toHaveLength(1)
      expect(snapshot.events[0]).toMatchObject({
        ...LOCALIZATION_NOTIFICATION_DIAGNOSTICS.noSelection,
        userMessage: LOCALIZATION_NOTIFICATION_MESSAGES.customNoSelection
      })
    })

    await test.step('Read the English fallback for an untranslated crop notification', async() => {
      await editorModel.localization.addText({ containerId })
      const snapshot = await editorModel.localization.cropInvalidSelection(containerId)
      expect(snapshot.failed).toBe(true)
      expect(snapshot.events).toHaveLength(1)
      expect(snapshot.events[0]).toMatchObject({
        ...LOCALIZATION_NOTIFICATION_DIAGNOSTICS.invalidCrop,
        userMessage: LOCALIZATION_NOTIFICATION_MESSAGES.en.invalidCrop
      })
      expect(await editorModel.localization.customLanguageResources(containerId)).toEqual(CUSTOM_NOTIFICATION_RESOURCES)
    })
  })
})
