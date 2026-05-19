import TextManager from '../../../src/editor/text-manager'
import { BackgroundTextbox } from '../../../src/editor/text-manager/background-textbox'

export const createRestoredTemplateLikeTextbox = ({
  left = 0.25,
  top = 0.2,
  width = 137,
  scaleX = 1,
  scaleY = 1,
  originX = 'left',
  originY = 'top'
}: {
  left?: number
  top?: number
  width?: number
  scaleX?: number
  scaleY?: number
  originX?: 'left' | 'center' | 'right'
  originY?: 'top' | 'center' | 'bottom'
} = {}): BackgroundTextbox => {
  const textbox = new BackgroundTextbox('69\nЧасов музыки', {
    width,
    left,
    top,
    scaleX,
    scaleY,
    originX,
    originY,
    fontFamily: 'Exo 2',
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 1.16,
    textAlign: 'center',
    fill: '#333333',
    backgroundColor: '#EBE4ED',
    backgroundOpacity: 1,
    autoExpand: false,
    paddingTop: 21,
    paddingRight: 12,
    paddingBottom: 30,
    paddingLeft: 12,
    radiusTopLeft: 24,
    radiusTopRight: 24,
    radiusBottomRight: 24,
    radiusBottomLeft: 24
  })

  const textValue = textbox.text ?? ''
  const secondLineStart = textValue.indexOf('\n') + 1

  textbox.setSelectionStyles({
    fontFamily: 'Open Sans',
    fontSize: 24,
    fill: '#333333',
    fontWeight: 'normal'
  }, secondLineStart, textValue.length)
  textbox.lineFontDefaults = {
    1: {
      fontFamily: 'Open Sans',
      fontSize: 24
    }
  }
  textbox.setCoords()

  return textbox
}

export const createRestoredStandaloneTemplateTextbox = ({
  left = 0.03209876543209877,
  top = 0.04351851851851852,
  width = 758,
  originX = 'left',
  originY = 'top'
}: {
  left?: number
  top?: number
  width?: number
  originX?: 'left' | 'center' | 'right'
  originY?: 'top' | 'center' | 'bottom'
} = {}): BackgroundTextbox => {
  const textbox = new BackgroundTextbox('ЖЕНСКАЯ СУМКА ИЗ КОЖИ БЛА БЛА БЛА БЛА БЛАБЛА БЛА БЛА БЛА', {
    width,
    left,
    top,
    originX,
    originY,
    fontFamily: 'Open Sans',
    fontSize: 72,
    fontWeight: 'normal',
    lineHeight: 1.16,
    textAlign: 'center',
    fill: '#333333',
    backgroundOpacity: 1,
    autoExpand: false,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    radiusTopLeft: 0,
    radiusTopRight: 0,
    radiusBottomRight: 0,
    radiusBottomLeft: 0
  })

  textbox.textCaseRaw = 'женская сумка из кожи'
  textbox.uppercase = true
  textbox.setCoords()

  return textbox
}

export const createTemplateLikeTextbox = ({
  textManager,
  left = 281,
  top = 352
}: {
  textManager: TextManager
  left?: number
  top?: number
}): BackgroundTextbox => {
  const textbox = textManager.addText({
    text: '69\nЧасов музыки',
    autoExpand: false,
    fontFamily: 'Exo 2',
    fontSize: 36,
    bold: true,
    lineHeight: 1.16,
    align: 'center',
    color: '#333333',
    backgroundColor: '#EBE4ED',
    backgroundOpacity: 1,
    paddingTop: 21,
    paddingRight: 12,
    paddingBottom: 30,
    paddingLeft: 12,
    radiusTopLeft: 24,
    radiusTopRight: 24,
    radiusBottomRight: 24,
    radiusBottomLeft: 24,
    width: 333,
    left,
    top
  }) as BackgroundTextbox

  const textValue = textbox.text ?? ''
  const secondLineStart = textValue.indexOf('\n') + 1

  textbox.setSelectionStyles({
    fontFamily: 'Open Sans',
    fontSize: 24,
    fill: '#333333',
    fontWeight: 'normal'
  }, secondLineStart, textValue.length)
  textbox.lineFontDefaults = {
    1: {
      fontFamily: 'Open Sans',
      fontSize: 24
    }
  }
  textbox.setCoords()

  return textbox
}
