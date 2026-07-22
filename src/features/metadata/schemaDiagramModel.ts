import type { ObjectRelationship, SalesforceField, SalesforceObject } from '../../domain/blueprint'

export const SCHEMA_NODE_WIDTH = 244
export const SCHEMA_NODE_HEIGHT = 132

const MIN_CANVAS_WIDTH = 760
const MIN_CANVAS_HEIGHT = 430
const HORIZONTAL_GAP = 150
const VERTICAL_GAP = 108
const CANVAS_PADDING = 56
const MAX_COLUMNS = 4

export interface SchemaNode {
  object: SalesforceObject
  x: number
  y: number
  fieldCount: number
  relationshipCount: number
}

export interface SchemaEdge {
  relationship: ObjectRelationship
  field: SalesforceField | undefined
  child: SalesforceObject
  parent: SalesforceObject
  path: string
  labelX: number
  labelY: number
}

export interface SchemaDiagramModel {
  width: number
  height: number
  nodes: SchemaNode[]
  edges: SchemaEdge[]
}

export function createSchemaDiagramModel(
  objects: SalesforceObject[],
  fields: SalesforceField[],
  relationships: ObjectRelationship[],
): SchemaDiagramModel {
  if (!objects.length)
    return { width: MIN_CANVAS_WIDTH, height: MIN_CANVAS_HEIGHT, nodes: [], edges: [] }

  const connectionCounts = new Map<string, number>()
  relationships.forEach((relationship) => {
    connectionCounts.set(
      relationship.childObjectId,
      (connectionCounts.get(relationship.childObjectId) ?? 0) + 1,
    )
    if (relationship.parentObjectId !== relationship.childObjectId) {
      connectionCounts.set(
        relationship.parentObjectId,
        (connectionCounts.get(relationship.parentObjectId) ?? 0) + 1,
      )
    }
  })

  const orderedObjects = [...objects].sort((left, right) => {
    const connectionDifference =
      (connectionCounts.get(right.id) ?? 0) - (connectionCounts.get(left.id) ?? 0)
    return connectionDifference || left.label.localeCompare(right.label)
  })
  const columns = Math.min(MAX_COLUMNS, Math.max(1, Math.ceil(Math.sqrt(orderedObjects.length))))
  const rows = Math.ceil(orderedObjects.length / columns)
  const gridWidth = columns * SCHEMA_NODE_WIDTH + (columns - 1) * HORIZONTAL_GAP
  const gridHeight = rows * SCHEMA_NODE_HEIGHT + (rows - 1) * VERTICAL_GAP
  const width = Math.max(MIN_CANVAS_WIDTH, gridWidth + CANVAS_PADDING * 2)
  const height = Math.max(MIN_CANVAS_HEIGHT, gridHeight + CANVAS_PADDING * 2)
  const offsetX = (width - gridWidth) / 2
  const offsetY = (height - gridHeight) / 2

  const nodes = orderedObjects.map<SchemaNode>((object, index) => ({
    object,
    x: offsetX + (index % columns) * (SCHEMA_NODE_WIDTH + HORIZONTAL_GAP),
    y: offsetY + Math.floor(index / columns) * (SCHEMA_NODE_HEIGHT + VERTICAL_GAP),
    fieldCount: fields.filter((field) => field.objectId === object.id).length,
    relationshipCount: connectionCounts.get(object.id) ?? 0,
  }))
  const nodesById = new Map(nodes.map((node) => [node.object.id, node]))

  const edges = relationships.flatMap<SchemaEdge>((relationship, index) => {
    const childNode = nodesById.get(relationship.childObjectId)
    const parentNode = nodesById.get(relationship.parentObjectId)
    if (!childNode || !parentNode) return []
    const connection = relationshipConnection(childNode, parentNode, index)
    return [
      {
        relationship,
        field: fields.find((field) => field.id === relationship.fieldId),
        child: childNode.object,
        parent: parentNode.object,
        ...connection,
      },
    ]
  })

  return { width, height, nodes, edges }
}

function relationshipConnection(
  child: SchemaNode,
  parent: SchemaNode,
  index: number,
): Pick<SchemaEdge, 'path' | 'labelX' | 'labelY'> {
  if (child.object.id === parent.object.id) {
    const startX = child.x + SCHEMA_NODE_WIDTH - 34
    const startY = child.y + 10
    const loopWidth = 68 + (index % 3) * 16
    return {
      path: pathData(
        'M',
        startX,
        startY,
        'C',
        startX + loopWidth,
        startY - 54,
        startX + loopWidth,
        startY + 54,
        startX,
        startY + 78,
      ),
      labelX: startX + loopWidth - 4,
      labelY: startY + 38,
    }
  }

  const childCenterX = child.x + SCHEMA_NODE_WIDTH / 2
  const childCenterY = child.y + SCHEMA_NODE_HEIGHT / 2
  const parentCenterX = parent.x + SCHEMA_NODE_WIDTH / 2
  const parentCenterY = parent.y + SCHEMA_NODE_HEIGHT / 2
  const horizontal =
    Math.abs(parentCenterX - childCenterX) >= Math.abs(parentCenterY - childCenterY)

  if (horizontal) {
    const movingRight = parentCenterX > childCenterX
    const startX = movingRight ? child.x + SCHEMA_NODE_WIDTH : child.x
    const endX = movingRight ? parent.x : parent.x + SCHEMA_NODE_WIDTH
    const middleX = (startX + endX) / 2
    return {
      path: pathData(
        'M',
        startX,
        childCenterY,
        'C',
        middleX,
        childCenterY,
        middleX,
        parentCenterY,
        endX,
        parentCenterY,
      ),
      labelX: middleX,
      labelY: (childCenterY + parentCenterY) / 2,
    }
  }

  const movingDown = parentCenterY > childCenterY
  const startY = movingDown ? child.y + SCHEMA_NODE_HEIGHT : child.y
  const endY = movingDown ? parent.y : parent.y + SCHEMA_NODE_HEIGHT
  const middleY = (startY + endY) / 2
  return {
    path: pathData(
      'M',
      childCenterX,
      startY,
      'C',
      childCenterX,
      middleY,
      parentCenterX,
      middleY,
      parentCenterX,
      endY,
    ),
    labelX: (childCenterX + parentCenterX) / 2,
    labelY: middleY,
  }
}

function pathData(...parts: (string | number)[]) {
  return parts.join(' ')
}
