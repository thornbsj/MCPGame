// 定义分段数据的类型
export interface TextSegment {
  type: 'text'
  content: string
}

export interface NPCRespondSegment {
  type: 'npc_respond'
  content: string
}

export interface ImageSegment {
  type: 'image'
  content: string
}
export type ContentSegment = TextSegment | NPCRespondSegment | ImageSegment
