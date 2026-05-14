/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { EditorObjectInfo } from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

type UngroupedObjectsInfo = {
  activeObjectType?: string
  objectIds: string[]
}

export class GroupingModel {
  private readonly page: Page

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

    await waitForCanvasRender({ page: this.page })

    return group as EditorObjectInfo
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

    await waitForCanvasRender({ page: this.page })

    return ungrouped as UngroupedObjectsInfo
  }
}
