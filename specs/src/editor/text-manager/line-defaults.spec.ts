import { createTextManagerTestSetup } from '../../../test-utils/text/manager-setup'

describe('lineFontDefaults', () => {
  describe('updateText', () => {
    it('сохраняет стиль строки при частичном изменении шрифта', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Первая строка\nВторая строка',
        fontFamily: 'Arial',
        fontSize: 32
      })

      textbox.isEditing = true
      textbox.selectionStart = 1
      textbox.selectionEnd = 4

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          fontFamily: 'Roboto',
          fontSize: 40
        }
      })

      const { lineFontDefaults } = textbox

      expect(lineFontDefaults?.[0]).toMatchObject({
        fontFamily: 'Roboto',
        fontSize: 40
      })
      expect(lineFontDefaults?.[1]).toBeUndefined()
    })

    it('запоминает стиль всей строки для дальнейшего ввода', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'LineOne\nLineTwo',
        fontFamily: 'Arial',
        fontSize: 32,
        color: '#111111'
      })

      const firstLineLength = 'LineOne'.length
      textbox.isEditing = true
      textbox.selectionStart = 0
      textbox.selectionEnd = firstLineLength

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          bold: true,
          color: '#ff0000',
          fontFamily: 'Roboto',
          fontSize: 40,
          italic: true,
          strokeColor: '#00ff00',
          strokeWidth: 2,
          strikethrough: true,
          underline: true
        }
      })

      const { lineFontDefaults } = textbox

      expect(lineFontDefaults?.[0]).toMatchObject({
        fontFamily: 'Roboto',
        fontSize: 40,
        fontStyle: 'italic',
        fontWeight: 'bold',
        fill: '#ff0000',
        linethrough: true,
        stroke: '#00ff00',
        strokeWidth: 2,
        underline: true
      })
      expect(lineFontDefaults?.[1]).toBeUndefined()
    })

    it('не запоминает стиль части строки как стиль всей строки', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'LineOne\nLineTwo',
        fontFamily: 'Arial',
        fontSize: 32,
        color: '#111111'
      })

      textbox.isEditing = true
      textbox.selectionStart = 1
      textbox.selectionEnd = 4

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          bold: true,
          color: '#ff0000',
          italic: true,
          strokeColor: '#00ff00',
          strokeWidth: 2,
          strikethrough: true,
          underline: true
        }
      })

      const selectionStyles = textbox.getSelectionStyles(1, 4)

      expect(selectionStyles).toHaveLength(3)
      selectionStyles.forEach((style) => {
        expect(style).toMatchObject({
          fill: '#ff0000',
          fontStyle: 'italic',
          fontWeight: 'bold',
          linethrough: true,
          stroke: '#00ff00',
          strokeWidth: 2,
          underline: true
        })
      })
      expect(textbox.lineFontDefaults?.[0]).toBeUndefined()
      expect(textbox.lineFontDefaults?.[1]).toBeUndefined()
    })

    it('при внешнем обновлении текста растягивает стиль строки на все символы нового текста', () => {
      const {
        canvas,
        textManager
      } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'AA',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })

      textbox.lineFontDefaults = {
        0: {
          fontFamily: 'Exo 2',
          fontSize: 36,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#ff8800',
          linethrough: true,
          stroke: '#333333',
          strokeWidth: 1,
          underline: true
        }
      }

      canvas.fire('text:changed', { target: textbox })

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          text: 'AAAA'
        }
      })

      expect(textbox.lineFontDefaults?.[0]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
      expect(Object.keys(textbox.styles?.[0] ?? {})).toHaveLength(4)
      expect(textbox.styles?.[0]?.[0]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
      expect(textbox.styles?.[0]?.[3]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
    })

    it('при внешнем обновлении текста удаляет lineFontDefaults строк которые исчезли', () => {
      const {
        canvas,
        textManager
      } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'FIRST\nSECOND',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })

      textbox.lineFontDefaults = {
        1: {
          fontFamily: 'Oswald',
          fontSize: 24,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#ff8800',
          linethrough: true,
          stroke: '#333333',
          strokeWidth: 1,
          underline: true
        }
      }

      canvas.fire('text:changed', { target: textbox })

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          text: 'FIRST'
        }
      })

      expect(textbox.text).toBe('FIRST')
      expect(Object.keys(textbox.lineFontDefaults ?? {})).toHaveLength(0)
      expect(textbox.styles?.[1]).toBeUndefined()
    })

    it('с флагом syncLineStylesWithText=false оставляет текущие стили без пересчёта под новый текст', () => {
      const {
        canvas,
        textManager
      } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'AA',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })

      textbox.lineFontDefaults = {
        0: {
          fontFamily: 'Exo 2',
          fontSize: 36,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#ff8800',
          linethrough: true,
          stroke: '#333333',
          strokeWidth: 1,
          underline: true
        }
      }

      canvas.fire('text:changed', { target: textbox })

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        syncLineStylesWithText: false,
        style: {
          text: 'AAAA'
        }
      })

      expect(textbox.lineFontDefaults?.[0]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
      expect(Object.keys(textbox.styles?.[0] ?? {})).toHaveLength(2)
      expect(textbox.styles?.[0]?.[3]).toBeUndefined()
    })
  })

  describe('text:changed', () => {
    it('дополняет пропущенные стили строки и удаляет лишние индексы', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'aaa\nbb\nccc',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })

      textbox.lineFontDefaults = {
        2: {
          fontFamily: 'Arial',
          fontSize: 28,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#111111',
          linethrough: true,
          stroke: '#222222',
          strokeWidth: 3,
          underline: true
        }
      }
      textbox.styles = {
        2: {
          0: { fontSize: 28, fill: '#ff0000' },
          1: { fontSize: 28 },
          10: { fontSize: 28 },
          foo: { fontSize: 28 }
        }
      }

      canvas.fire('text:changed', { target: textbox })

      const lineStyles = textbox.styles?.[2]

      expect(lineStyles).toBeDefined()
      expect(lineStyles?.[0]).toMatchObject({
        fontSize: 28,
        fill: '#ff0000',
        fontFamily: 'Arial',
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#222222',
        strokeWidth: 3,
        underline: true
      })
      expect(lineStyles?.[1]).toMatchObject({
        fontSize: 28,
        fill: '#111111',
        fontFamily: 'Arial',
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#222222',
        strokeWidth: 3,
        underline: true
      })
      expect(lineStyles?.[2]).toMatchObject({
        fontSize: 28,
        fill: '#111111',
        fontFamily: 'Arial',
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#222222',
        strokeWidth: 3,
        underline: true
      })
      expect(lineStyles?.[10]).toBeUndefined()
      expect(lineStyles?.['foo']).toBeUndefined()
    })

    it('сохраняет стиль пустой строки для дальнейшего ввода', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'FIRST\nSECOND',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })
      textbox.lineFontDefaults = {
        0: {
          fontFamily: 'Exo 2',
          fontSize: 36,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#ff8800',
          linethrough: true,
          stroke: '#333333',
          strokeWidth: 1,
          underline: true
        }
      }

      textbox.text = '\nSECOND'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.styles?.[0]?.[0]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
      expect(textbox.lineFontDefaults?.[0]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
    })

    it('переносит стиль последней строки на новую непустую строку', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'FIRST',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })
      textbox.lineFontDefaults = {
        0: {
          fontFamily: 'Exo 2',
          fontSize: 36,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#ff8800',
          linethrough: true,
          stroke: '#333333',
          strokeWidth: 1,
          underline: true
        }
      }
      textbox.__lineDefaultsPrevText = textbox.text ?? ''

      textbox.text = 'FIRST\nSECOND'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.lineFontDefaults?.[1]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
      expect(Object.keys(textbox.styles?.[1] ?? {})).toHaveLength('SECOND'.length)
      expect(textbox.styles?.[1]?.[0]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
      expect(textbox.styles?.[1]?.['SECOND'.length - 1]).toMatchObject({
        fill: '#ff8800',
        fontFamily: 'Exo 2',
        fontSize: 36,
        fontStyle: 'italic',
        fontWeight: 'bold',
        linethrough: true,
        stroke: '#333333',
        strokeWidth: 1,
        underline: true
      })
    })

    it('удаляет стиль строки, если строку удалили вместе с переносом', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'FIRST\nSECOND\nTHIRD',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })
      textbox.lineFontDefaults = {
        1: {
          fontFamily: 'Oswald',
          fontSize: 24,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#ff8800',
          linethrough: true,
          stroke: '#333333',
          strokeWidth: 1,
          underline: true
        }
      }
      textbox.__lineDefaultsPrevText = textbox.text ?? ''

      textbox.text = 'FIRST\nTHIRD'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.lineFontDefaults?.[1]).toBeUndefined()
    })
  })
})
