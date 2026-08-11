/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { EditorObjectInfo } from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

/** Состояние canvas после разгруппировки текущей группы. */
type UngroupedObjectsInfo = {
  activeObjectType?: string
  objectIds: string[]
}

/** Действия над постоянными Fabric-группами через публичные менеджеры редактора. */
export class GroupingModel {
  private readonly page: Page

  /** Создаёт модель действий над группами для указанной Playwright-страницы. */
  constructor(page: Page) {
    this.page = page
  }

  /** Группирует текущее выделение через публичный API GroupingManager. */
  async groupActiveSelection(): Promise<EditorObjectInfo> {
    const group = await this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const result = editor.groupingManager.group()
      if (!result) return null

      return helpers.serializeEditorObject(result.group)
    })

    expect(group, 'должна создаться группа из текущего выделения').not.toBeNull()
    expect(group?.type, 'активный объект после группировки должен быть group').toBe('group')

    if (!group) throw new Error('Не удалось создать группу из текущего выделения')

    await waitForCanvasRender({ page: this.page })

    return group
  }

  /** Выбирает единственную верхнеуровневую Fabric-группу с указанным id. */
  async selectGroup({ id }: { id: string }): Promise<EditorObjectInfo> {
    const group = await this.page.evaluate((targetId) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const matches = editor.canvas.getObjects()
        .filter((object: { id?: unknown }) => object.id === targetId)

      if (matches.length !== 1) return null

      const target = matches[0]
      const children = target.getObjects?.()
      if (
        target.type !== 'group'
        || target.group
        || target.parent
        || !Array.isArray(children)
      ) return null

      editor.canvas.setActiveObject(target)
      editor.canvas.requestRenderAll()

      return helpers.serializeEditorObject(target)
    }, id)

    expect(group, `должна существовать верхнеуровневая группа ${id}`).not.toBeNull()
    expect(group?.type, 'выбранный объект должен быть обычной Fabric-группой').toBe('group')
    expect(group?.id, 'должна быть выбрана группа с запрошенным id').toBe(id)

    if (!group) throw new Error(`Не удалось выбрать верхнеуровневую группу ${id}`)

    await waitForCanvasRender({ page: this.page })

    return group
  }

  /** Устанавливает абсолютный угол верхнеуровневой группы через TransformManager. */
  async setAngle({
    angle,
    id
  }: {
    angle: number
    id: string
  }): Promise<EditorObjectInfo> {
    await this.selectGroup({ id })

    const group = await this.page.evaluate(({ targetAngle, targetId }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      const children = target?.getObjects?.()

      if (
        target?.id !== targetId
        || target.type !== 'group'
        || target.group
        || target.parent
        || !Array.isArray(children)
      ) return null

      editor.transformManager.setAngle(target, targetAngle)

      return helpers.serializeEditorObject(target)
    }, { targetAngle: angle, targetId: id })

    expect(group, `должна существовать верхнеуровневая группа ${id}`).not.toBeNull()
    expect(group?.id, 'угол должен измениться у запрошенной группы').toBe(id)
    expect(group?.angle, 'группа должна получить запрошенный угол').toBeCloseTo(angle, 5)

    if (!group) throw new Error(`Не удалось повернуть верхнеуровневую группу ${id}`)

    await waitForCanvasRender({ page: this.page })

    return group
  }

  /** Разгруппировывает текущую группу через публичный API GroupingManager. */
  async ungroupActiveGroup(): Promise<UngroupedObjectsInfo> {
    const ungrouped = await this.page.evaluate(() => {
      const { editor } = window as any

      const result = editor.groupingManager.ungroup()
      if (!result) return null

      return {
        activeObjectType: editor.canvas.getActiveObject()?.type,
        objectIds: result.ungroupedObjects
          .map((object: { id?: unknown }) => object.id)
          .filter((id: unknown) => typeof id === 'string')
      }
    })

    expect(ungrouped, 'текущая группа должна разгруппироваться').not.toBeNull()
    expect(ungrouped?.objectIds.length, 'после ungroup должны вернуться дочерние объекты').toBeGreaterThan(0)

    if (!ungrouped) throw new Error('Не удалось разгруппировать текущую группу')

    await waitForCanvasRender({ page: this.page })

    return ungrouped
  }
}
