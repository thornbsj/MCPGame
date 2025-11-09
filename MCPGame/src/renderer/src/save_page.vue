<template>
  <div class="save_page">
    <div class="save_header">
      <h1>游戏存档</h1>
      <p>选择存档栏位进行加载或删除操作</p>
    </div>

    <div class="save-slots">
      <div v-for="(row, rowIndex) in chunkedSlots" :key="rowIndex" class="slot-row">
        <div v-for="slot in row" :key="slot.id" class="save-slot">
          <div
            v-if="slot.saved"
            class="slot-image"
            :style="{ backgroundImage: `url(${slot.image})` }"
          >
            <div class="slot-title">{{ slot.title }}</div>
          </div>
          <div v-else class="slot-image" style="background-color: #2a2a3a">
            <div class="empty-slot">
              <i>📁</i>
              <p>无存档数据</p>
            </div>
          </div>

          <div class="slot-info">
            <div v-if="slot.saved" class="save-time">保存时间: {{ slot.time }}</div>
            <div v-else class="save-time">暂无存档</div>
          </div>

          <!-- 存档 -->
          <div v-if="props.save_load == 'save' && slot.chosen == false" class="slot-actions">
            <button v-if="slot.saved" class="btn btn-load" @click="Confirm(slot.id)">覆盖</button>
            <button v-else class="btn btn-load" @click="saveGame(slot.id)">新建</button>

            <button v-if="slot.saved" class="btn btn-delete" @click="deleteSave(slot.id)">
              删除
            </button>
            <button v-else class="btn btn-delete" disabled>删除</button>
          </div>

          <!-- 确认覆盖存档 -->
          <div v-if="props.save_load == 'save' && slot.chosen == true" class="slot-actions">
            <button class="btn btn-load" @click="saveGame(slot.id)">确定覆盖</button>
            <button @click="unConfirm(slot.id)">取消</button>
          </div>

          <!-- 读取 -->
          <div v-if="props.save_load == 'load' && slot.chosen == false" class="slot-actions">
            <button v-if="slot.saved" class="btn btn-load" @click="Confirm(slot.id)">读取</button>
          </div>

          <!-- 确认读取 -->
          <div v-if="props.save_load == 'load' && slot.chosen == true" class="slot-actions">
            <button class="btn btn-load" @click="loadGame(slot.id)">确认读取</button>
            <button @click="unConfirm(slot.id)">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <button class="btn btn-return" @click="backToGame">返回游戏</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, inject, Ref, watch, nextTick } from 'vue'
import main_world from '../../../resources/main_world.png'
import world1 from '../../../resources/world1.png'
import world2 from '../../../resources/world2.png'
import world3 from '../../../resources/world3.png'
import world4 from '../../../resources/world4.png'
import final_world from '../../../resources/final_world.png'
import { useSharedStore } from '../../stores/shared'
import { ContentSegment } from './Infos'

const sharedStore = useSharedStore()

interface Props {
  father_page: string
  save_load: string
}
const props = defineProps<Props>()
const changePage = inject('change_page') as (page: string) => void
const current_page = inject('current_page') as Ref<string, string>
const displayedOldHistory = inject('displayedOldHistory') as Ref<(string | ContentSegment[])[]>
const set_NPC_cards = inject('set_NPC_cards') as (jsonData) => void
const scrollToBottom = inject('scrollToBottom') as () => void
const parseNPCTags = inject('parseNPCTags') as (text: string) => ContentSegment[]
const currentBackground = inject('currentBackground') as () => Promise<void>

const backToGame = () => {
  if (props.father_page === 'cover') {
    changePage('cover')
  } else {
    changePage('game')
  }
}

interface SaveSlot {
  id: number
  saved: boolean
  title: string
  time: string
  image: string
  chosen: boolean
}

// 存档数据槽位
const saveSlots: Ref<SaveSlot[]> = ref([
  { id: 1, saved: false, title: '', time: '', image: '', chosen: false },
  { id: 2, saved: false, title: '', time: '', image: '', chosen: false },
  { id: 3, saved: false, title: '', time: '', image: '', chosen: false },
  { id: 4, saved: false, title: '', time: '', image: '', chosen: false },
  { id: 5, saved: false, title: '', time: '', image: '', chosen: false },
  { id: 6, saved: false, title: '', time: '', image: '', chosen: false }
])

// 2*3
const chunkedSlots = computed(() => {
  const chunks: SaveSlot[][] = []
  for (let i = 0; i < saveSlots.value.length; i += 3) {
    chunks.push(saveSlots.value.slice(i, i + 3))
  }
  return chunks
})

const Confirm = (id) => {
  const targetSlot = saveSlots.value.find((slot) => slot.id === id)
  if (targetSlot) {
    targetSlot.chosen = true
  }
}

const unConfirm = (id) => {
  const targetSlot = saveSlots.value.find((slot) => slot.id === id)
  if (targetSlot) {
    targetSlot.chosen = false
  }
}

// 直接解析字符串并添加到 displayedOldHistory 的函数
const parseAndAddToHistory = (text: string) => {
  if (!text || text.trim() === '') return

  displayedOldHistory.value.push(parseNPCTags(text))
}

// 批量解析多个字符串
const parseAndAddMultipleToHistory = (texts: string[]) => {
  texts.forEach((text) => {
    parseAndAddToHistory(text)
  })
}

// 清空并重新设置历史记录（用于读档时完全替换）
const replaceHistoryWithParsedTexts = (texts: string[]) => {
  displayedOldHistory.value = []
  parseAndAddMultipleToHistory(texts)
}

// 后续：两边的保存应该有同步的保存，要有“回滚”机制
const loadGame = async (id) => {
  const res = await sharedStore.load(id)
  const targetSlot = saveSlots.value.find((slot) => slot.id === id)
  if (targetSlot) {
    if (res) {
      try {
        await sharedStore.loadHistory(id)
        await nextTick()
        await updateSaveSlot()
        replaceHistoryWithParsedTexts(sharedStore.display_history)
        await currentBackground()
        const response = await fetch(
          `http://${sharedStore.MCP_Server}:${sharedStore.port}/game/status`
        )
        const jsonData = await response.json()
        set_NPC_cards(jsonData)

        scrollToBottom()
        changePage('game')
      } catch (error) {
        targetSlot.title = '读取存档失败，请检查MCP服务连接与存档信息！'
      }
    } else {
      targetSlot.title = '读取存档失败，请检查MCP服务连接与存档信息！'
    }
  }
}

const saveGame = async (id) => {
  const res = await sharedStore.save(id)
  const targetSlot = saveSlots.value.find((slot) => slot.id === id)
  if (targetSlot) {
    if (res) {
      try {
        sharedStore.saveHistory(id)
        updateSaveSlot()
        targetSlot.title = '保存成功'
      } catch (error) {
        targetSlot.title = '保存存档失败，请检查MCP服务连接！'
      }
    } else {
      targetSlot.title = '保存存档失败，请检查MCP服务连接！'
    }
  }
}

const updateSaveSlot = async () => {
  await sharedStore.updateSaveSlot()
  saveSlots.value = sharedStore.saveslots
  const img_dict = new Map([
    ['奇点侦测站', main_world],
    ['齿轮', world1],
    ['源法', world2],
    ['混元', world3],
    ['黯蚀', world4],
    ['终焉', final_world]
  ])
  saveSlots.value.forEach((element) => {
    try {
      element.image = img_dict.get(element.title) ?? ''
    } catch (error) {
      element.image = ''
    }
  })
}

const deleteSave = async (id) => {
  if (confirm('确定要删除这个存档吗？此操作不可恢复。')) {
    const res = await sharedStore.delete(id)
    const targetSlot = saveSlots.value.find((slot) => slot.id === id)
    if (targetSlot) {
      if (res) {
        try {
          sharedStore.deleteHistory(id) //deleteHistory待定
          updateSaveSlot()
          targetSlot.title = '删除成功'
        } catch (error) {
          targetSlot.title = '删除存档失败，请检查MCP服务连接！'
        }
      } else {
        targetSlot.title = '删除存档失败，请检查MCP服务连接！'
      }
    }
  }
}

const isVisible = computed(() => {
  return (
    current_page.value === 'load_cover' ||
    current_page.value === 'load' ||
    current_page.value === 'save'
  )
})

watch(current_page, (newVal, oldVal) => {
  console.log(newVal.length, oldVal.length)
  if (isVisible.value) {
    // 使用 nextTick 确保 DOM 已更新
    nextTick(() => {
      updateSaveSlot()
    })
  }
})
</script>
<style>
.save_page {
  background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
  color: #fff;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  flex-direction: column;
  font-family: 'Arial', sans-serif;
  width: 100%;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.save_header {
  text-align: center;
  margin-bottom: 30px;
}

.save-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25px;
  width: 80%;
}

.slot-row {
  display: contents;
}

.save-slot {
  background: rgba(40, 40, 60, 0.8);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  width: 100%;
}

.save-slot:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 25px rgba(0, 0, 0, 0.4);
}

.slot-image {
  width: 100%;
  height: 180px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.slot-info {
  padding: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.slot-title {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #ffcc00;
}

.save-time {
  color: #aaa;
  font-size: 0.9rem;
  margin-bottom: 15px;
}

.play-time {
  color: #4ecdc4;
  margin-top: auto;
  font-size: 0.9rem;
}

.slot-actions {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
}

.btn {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.btn-load {
  background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn-delete {
  background: linear-gradient(to right, #ff758c 0%, #ff7eb3 100%);
  color: white;
}

.btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

.empty-slot {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #888;
  padding: 20px;
  text-align: center;
}

.empty-slot i {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.5;
}

.footer {
  margin-top: 40px;
  text-align: center;
}

.btn-return {
  background: linear-gradient(to right, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 30px;
  font-size: 1.1rem;
}

@media (max-width: 900px) {
  .save-slots {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .save-slots {
    grid-template-columns: 1fr;
  }
}
</style>
