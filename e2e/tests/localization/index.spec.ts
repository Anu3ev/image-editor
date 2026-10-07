import { test, expect } from '../../fixtures/editor.fixture'
import {
  CUSTOM_LOCALIZATION_CONTENT,
  LOCALIZATION_EXAMPLES,
  LOCALIZATION_MISSING_CONTAINER,
  LOCALIZATION_WORKER_ACTION
} from '../../fixtures/data/localization.data'

test.describe('Editor initialization language', () => {
  for (const example of LOCALIZATION_EXAMPLES) {
    test(`renders ${example.language} default text and toolbar labels`, async({ editorModel }) => {
      const containerId = `localized-${example.language}`
      await editorModel.localization.create({ containerId, language: example.language })

      expect(await editorModel.localization.addText({ containerId })).toBe(example.newText)
      expect(await editorModel.localization.toolbarLabels(containerId)).toContain(example.duplicate)
    })

    test(`interpolates ${example.language} initialization errors`, async({ editorModel }) => {
      const message = await editorModel.localization.missingContainerError({
        containerId: LOCALIZATION_MISSING_CONTAINER,
        language: example.language
      })

      expect(message).toBe(example.missingContainer)
    })

    test(`translates real worker errors into ${example.language}`, async({ editorModel }) => {
      const containerId = `worker-${example.language}`
      await editorModel.localization.create({ containerId, language: example.language })

      expect(await editorModel.localization.workerError({
        containerId,
        action: LOCALIZATION_WORKER_ACTION
      })).toBe(example.unknownWorkerAction)
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
      language: 'ru',
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
})
