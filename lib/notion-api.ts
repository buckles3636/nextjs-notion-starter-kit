import { NotionAPI } from 'notion-client'
import { ExtendedRecordMap } from 'notion-types'

export const notion = patchNotionApi(
  new NotionAPI({
    apiBaseUrl: process.env.NOTION_API_BASE_URL
  })
)

function patchNotionApi(notionApi: NotionAPI): NotionAPI {
  const getPage = notionApi.getPage.bind(notionApi)
  const getPageRaw = notionApi.getPageRaw.bind(notionApi)
  const getBlocks = notionApi.getBlocks.bind(notionApi)
  const getCollectionData = notionApi.getCollectionData.bind(notionApi)

  notionApi.getPage = async (...args) => {
    const recordMap = await getPage(...args)
    return normalizeRecordMap(recordMap)
  }

  notionApi.getPageRaw = async (...args) => {
    const result = await getPageRaw(...args)
    normalizePageChunk(result)
    return result
  }

  notionApi.getBlocks = async (...args) => {
    const result = await getBlocks(...args)
    normalizePageChunk(result)
    return result
  }

  notionApi.getCollectionData = async (...args) => {
    const result = await getCollectionData(...args)
    if (result?.recordMap) {
      normalizeRecordMap(result.recordMap)
    }
    return result
  }

  return notionApi
}

function normalizePageChunk(result: { recordMap?: ExtendedRecordMap }) {
  if (result?.recordMap) {
    normalizeRecordMap(result.recordMap)
  }
}

/* Notion's public API now wraps records as `{ value: { value, role } }`.
 * react-notion-x and notion-utils expect the older `{ value, role }` shape.
 */
function normalizeRecordMap(recordMap: ExtendedRecordMap): ExtendedRecordMap {
  for (const table of [
    'block',
    'collection',
    'collection_view',
    'notion_user'
  ] as const) {
    normalizeRecordMapTable(recordMap, table)
  }

  return recordMap
}

function normalizeRecordMapTable(
  recordMap: ExtendedRecordMap,
  table: 'block' | 'collection' | 'collection_view' | 'notion_user'
): ExtendedRecordMap {
  const records = recordMap[table] as Record<string, any>

  if (!records || typeof records !== 'object') {
    return recordMap
  }

  for (const id of Object.keys(records)) {
    const record = records[id]
    const value = record?.value

    if (value?.value) {
      records[id] = {
        ...record,
        value: value.value,
        role: value.role ?? record.role
      }
    }
  }

  return recordMap
}
