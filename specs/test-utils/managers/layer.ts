export const createTestObjects = (ids: number[]) => ids.map((id) => ({ id: `obj${id}` })) as any[]

export const getObjectOrder = (objects: any[]) => objects.map((obj) => parseInt(obj.id.replace('obj', '')))
