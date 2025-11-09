<template>
  <div class="game-page" :style="{ backgroundImage: current_background_img }">
    <ElHeader class="Profile">
      <div class="partners">
        <Profile
          v-for="(npc, index) in teammates"
          :key="`partys-${index}`"
          :name="npc.name"
          :profile="npc.profile"
          :hp="npc.hp"
          :level="npc.level"
          :exp="npc.exp"
          :expToNextLevel="npc.expToNextLevel"
          :CON="npc.CON"
          :DEX="npc.DEX"
          :INT="npc.INT"
          :skills="npc.skills"
          :CombatAttribute="npc.CombatAttribute"
          :type="npc.type"
          :can_be_recruited="npc.can_be_recruited"
          :disabled="action_disable"
        />
      </div>
      <div class="NPCs">
        <Profile
          v-for="(npc, index) in npcs"
          :key="`npcs-${index}`"
          :name="npc.name"
          :profile="npc.profile"
          :hp="npc.hp"
          :level="npc.level"
          :exp="npc.exp"
          :expToNextLevel="npc.expToNextLevel"
          :CON="npc.CON"
          :DEX="npc.DEX"
          :INT="npc.INT"
          :skills="npc.skills"
          :CombatAttribute="npc.CombatAttribute"
          :type="npc.type"
          :can_be_recruited="npc.can_be_recruited"
          :disabled="action_disable"
        />
      </div>
    </ElHeader>
    <ElContainer class="Main">
      <div class="text-infos">
        <div class="history-container">
          <!-- 已有的历史记录显示 -->
          <div
            v-for="(record, index) in displayedOldHistory"
            :key="'old-' + index"
            class="history-record"
          >
            <template v-if="typeof record === 'string' && isImage(record)">
              <img :src="record" class="history-image" />
            </template>
            <template v-else-if="typeof record === 'string'">
              <div
                v-for="(line, lineIndex) in getDisplayLines(record)"
                :key="lineIndex"
                class="history-line"
              >
                {{ line }}
              </div>
            </template>
            <template v-else>
              <!-- 处理解析后的记录（包含 NPC_respond 标签） -->
              <div
                v-for="(segment, segmentIndex) in getDisplayLines(record)"
                :key="segmentIndex"
                :class="{
                  'history-line': segment.type === 'text',
                  'NPC-respond': segment.type === 'npc_respond',
                  'history-image-container': segment.type === 'image'
                }"
              >
                <template v-if="segment.type === 'image'">
                  <img :src="segment.lines[0]" class="history-image" />
                </template>
                <template v-else>
                  <div
                    v-for="(line, lineIndex) in segment.lines"
                    :key="lineIndex"
                    :class="{
                      'history-line': segment.type === 'text',
                      'NPC-respond': segment.type === 'npc_respond',
                      'history-image-container': segment.type === 'image'
                    }"
                  >
                    {{ line }}
                  </div>
                </template>
              </div>
            </template>
          </div>

          <!-- 新的记录逐字输出 -->
          <div v-if="currentTypingLines.length > 0" class="typing-record">
            <template v-if="isImage(currentTypingLines[0])">
              <img :src="currentTypingLines[0]" class="history-image" />
            </template>
            <template v-else>
              <div
                v-for="(line, lineIndex) in currentTypingLines"
                :key="lineIndex"
                class="typing-line"
                :class="{
                  'history-line': current_type === 'text',
                  'NPC-respond': current_type === 'npc_respond',
                  'history-image-container': current_type === 'image'
                }"
              >
                {{ line }}
              </div>
            </template>
          </div>
        </div>

        <div class="InputInfos">
          <input
            v-model="userInput"
            class="UserInput"
            :disabled="action_disable"
            @keydown.enter="send_info"
          />
          <ElRadioGroup v-model="radioValue" class="RadioGroups">
            <ElRadio label="指令模式" value="1" name="指令模式"></ElRadio>
            <ElRadio label="喊话模式" value="2" name="喊话模式"></ElRadio
          ></ElRadioGroup>
          <button class="SendInfo" :disabled="action_disable" @click="send_info">发送</button>
        </div>
      </div>
      <ElAside class="ButtonInfos">
        <div class="Enemys">
          <Profile
            v-for="(npc, index) in enemys"
            :key="`enemy-${index}`"
            :name="npc.name"
            :profile="npc.profile"
            :hp="npc.hp"
            :level="npc.level"
            :exp="npc.exp"
            :expToNextLevel="npc.expToNextLevel"
            :CON="npc.CON"
            :DEX="npc.DEX"
            :INT="npc.INT"
            :skills="npc.skills"
            :CombatAttribute="npc.CombatAttribute"
            :type="npc.type"
            :can_be_recruited="npc.can_be_recruited"
            :disabled="true"
          />
        </div>
        <div class="refresh">
          <ElButton :disabled="action_disable" @click="refresh_enemy_Btn">刷新</ElButton>
          <ElButton :disabled="action_disable" @click="BattleAgainstNonNPCs">战斗</ElButton>
        </div>
        <div class="EGO">
          <el-progress type="circle" :percentage="EGO" :format="EGOformat"></el-progress>
        </div>
        <div class="Quests">当前任务：<br />{{ quests }}</div>
        <div class="SaveLoadSettings">
          <img
            id="backpackIcon"
            class="iconButton"
            :src="backpackIcon"
            alt="setting"
            @click="openBackPack"
          />
          <img
            id="setting"
            class="iconButton"
            :src="settingIcon"
            alt="setting"
            @click="openSetting"
          />
          <img id="save" class="iconButton" :src="saveIcon" alt="setting" @click="savePage" />
          <img id="load" class="iconButton" :src="loadIcon" alt="setting" @click="loadPage" />
          <img id="home" class="iconButton" :src="home" alt="setting" @click="goCover" />
        </div>
      </ElAside>
    </ElContainer>
  </div>
</template>
<script setup lang="ts">
import { defineComponent, nextTick, Ref, ref, watch } from 'vue'
import settingIcon from '../../../resources/settings.png'
import saveIcon from '../../../resources/save.png'
import loadIcon from '../../../resources/load.png'
import backpackIcon from '../../../resources/backpack.png'
import home from '../../../resources/Home.png'
//backgrounds
import {
  ElHeader,
  ElContainer,
  ElAside,
  ElButton,
  ElRadioGroup,
  ElRadio,
  ElProgress
} from 'element-plus'
import Profile from './components/Profile.vue'
import { inject } from 'vue'
import { useSharedStore } from '../../stores/shared'
import { CharacterData } from './Character'
import { ContentSegment } from './Infos'

const sharedStore = useSharedStore()
const port = sharedStore.port
const mcp_server = sharedStore.MCP_Server

const teammates = inject<CharacterData[]>('teammates')
const npcs = inject<CharacterData[]>('npcs')
const enemys = inject<CharacterData[]>('enemys')
const change_page = inject('change_page') as (page: string) => void
const get_current_page = inject('get_current_page') as () => string
const scrollToBottom = inject('scrollToBottom') as () => void
const update_battleProcess = inject('update_battleProcess') as (process: string) => void
const new_history = inject('new_history') as Ref<string[]>
const displayedOldHistory = inject('displayedOldHistory') as Ref<(string | ContentSegment[])[]>
const EGO = inject('EGO') as Ref<number>
const quests = inject('quests') as Ref<string>
const refresh_enemy = inject('refresh_enemy') as () => Promise<void>
const currentBackground = inject('currentBackground') as () => Promise<void>
const current_background_img = inject('current_background_img') as Ref<string, string>

const isImage = inject('isImage') as (text: string) => boolean
const parseNPCTags = inject('parseNPCTags') as (text: string) => ContentSegment[]

const changePage = (page: string) => {
  if (action_disable.value == false) {
    change_page(page)
  }
}

const Command_dialogue = inject('Command_dialogue') as (
  ipt: string,
  initialize_Prompt: boolean
) => Promise<void>

const public_talk = inject('public_talk') as (ipt: string) => Promise<void>

const send_info = async () => {
  if (userInput.value.length == 0) {
    return
  }
  action_disable.value = true
  try {
    if (radioValue.value == '1') {
      await Command_dialogue(userInput.value, false)
    } else {
      await public_talk(userInput.value)
    }

    userInput.value = ''
    await currentBackground()
  } catch (error) {
    console.log(error)
  }
}

const refresh_enemy_Btn = async () => {
  action_disable.value = true
  try {
    await refresh_enemy()
  } catch (error) {
    console.log(error)
  }
  action_disable.value = false
}

const isProcessing = ref(false) // 添加处理状态标志
const messageQueue = ref<string[]>([]) // 添加消息队列
const userInput = ref('')
const radioValue = ref('1')
const action_disable = ref(false)

const BattleAgainstNonNPCs = async () => {
  await nextTick()
  try {
    const battle_process = await (await fetch(`http://${mcp_server}:${port}/game/BattleBtn`)).json()
    update_battleProcess(battle_process)
  } catch (error) {
    console.log(error)
  }
}

const openSetting = () => {
  changePage('setting')
}
const openBackPack = async () => {
  const store = useSharedStore()
  await store.update_backpack()
  changePage('backpack')
}

const savePage = () => {
  changePage('save')
}

const loadPage = () => {
  changePage('load')
}

const goCover = () => {
  changePage('cover')
}

//显示相关

// 响应式数据

const currentTypingLines = ref<string[]>([])
const currentTypingIndex = ref(0)
const currentLineIndex = ref(0)
const current_type = ref('')
const typingTimer = ref<NodeJS.Timeout | null>(null)

// 逐字输出函数 - 修改为处理多行
// 修改逐字输出函数以处理 NPC_respond 标签
const startTyping = (text: string) => {
  isProcessing.value = true

  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
  }

  // 重置状态
  currentTypingLines.value = []
  currentTypingIndex.value = 0
  currentLineIndex.value = 0

  // 如果是图片，直接显示
  if (isImage(text)) {
    currentTypingLines.value = [text]
    typingTimer.value = setTimeout(() => {
      finishTyping()
    }, 1000)
    scrollToBottom()
    return
  }

  // 解析文本中的 NPC_respond 标签
  const segments = parseNPCTags(text)

  // 将分段内容合并为带标记的字符串，用于逐字输出
  let markedText = ''
  const segmentMarkers: { start: number; end: number; type: string }[] = []

  segments.forEach((segment) => {
    const start = markedText.length
    markedText += segment.content
    const end = markedText.length

    segmentMarkers.push({
      start,
      end,
      type: segment.type
    })
  })

  current_type.value = segments[0].type ?? 'text'
  // 将文本按换行符分割
  const lines = markedText.split('\n')
  currentTypingLines.value = Array(lines.length).fill('')

  // 开始逐字输出
  const typeNextChar = () => {
    scrollToBottom()
    if (currentLineIndex.value < lines.length) {
      const currentLine = lines[currentLineIndex.value]

      if (currentTypingIndex.value < currentLine.length) {
        // 输出当前行的下一个字符
        currentTypingLines.value[currentLineIndex.value] += currentLine[currentTypingIndex.value]
        currentTypingIndex.value++
        typingTimer.value = setTimeout(typeNextChar, 15)
      } else {
        // 当前行输出完毕，移动到下一行
        currentLineIndex.value++
        currentTypingIndex.value = 0

        if (currentLineIndex.value < lines.length) {
          // 继续输出下一行
          typingTimer.value = setTimeout(typeNextChar, 15)
        } else {
          // 所有行输出完毕
          finishTyping()
        }
      }
    } else {
      finishTyping()
    }
  }

  typeNextChar()
}
// 完成逐字输出
// 修改完成逐字输出函数
const finishTyping = () => {
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
    typingTimer.value = null
  }

  // 将当前输入的内容添加到历史记录
  if (currentTypingLines.value.length > 0) {
    // 如果是图片，直接添加
    if (isImage(currentTypingLines.value[0])) {
      displayedOldHistory.value.push(currentTypingLines.value[0])
    } else {
      // 对于文本，重建原始文本并解析 NPC 标签
      const fullText = currentTypingLines.value.join('\n')
      let cur_type: 'text' | 'image' | 'npc_respond' = 'text'
      if (current_type.value === 'npc_respond') {
        cur_type = 'npc_respond'
      }
      const f: ContentSegment = {
        content: fullText,
        type: cur_type
      }
      displayedOldHistory.value.push([f])
    }
    currentTypingLines.value = []
  }

  isProcessing.value = false
  // 处理下一条消息
  nextTick(() => {
    processMessageQueue()
  })
}
// 处理消息队列
const processMessageQueue = () => {
  if (isProcessing.value) {
    return
  }
  if (messageQueue.value.length == 0) {
    action_disable.value = false
    return
  }

  action_disable.value = true
  const text = messageQueue.value.shift()
  if (text !== undefined) {
    startTyping(text)
  }
}

const getDisplayLines = (
  record: string | { type: string; content: string }[]
): { type: string; lines: string[] }[] => {
  if (typeof record === 'string') {
    if (isImage(record)) {
      return [{ type: 'image', lines: [record] }]
    }
    // 对于字符串记录，解析 NPC 标签
    const segments = parseNPCTags(record)
    return segments.map((segment) => ({
      type: segment.type,
      lines: segment.content.split('\n')
    }))
  } else {
    // 对于已经解析的记录，直接返回
    return record.map((segment) => ({
      type: segment.type,
      lines: segment.content.split('\n')
    }))
  }
}
watch(
  () => [new_history.value.length, get_current_page()] as const,
  ([newhistory_length, new_page], [oldhistory_length, old_page]) => {
    console.log(oldhistory_length)
    console.log(old_page.length)
    if (newhistory_length > 0 && new_page == 'game') {
      // 将新消息加入队列
      while (new_history.value.length > 0) {
        const to_be_print = new_history.value.shift()
        if (to_be_print !== undefined) {
          messageQueue.value.push(to_be_print)
        }
      }
      // 开始处理队列
      processMessageQueue()
    }
  },
  { deep: true }
)
</script>

<script lang="ts">
export default defineComponent({
  name: 'GamePage',
  components: {
    ElHeader,
    ElContainer,
    ElAside,
    ElButton,
    ElRadioGroup,
    ElRadio,
    Profile,
    ElProgress
  },
  props: {
    settingIcon: {
      type: String,
      default: settingIcon
    },
    saveIcon: {
      type: String,
      default: saveIcon
    },
    loadIcon: {
      type: String,
      default: loadIcon
    }
  },
  methods: {
    EGOformat(percentage) {
      return `EGO:${percentage}`
    }
  }
})
</script>
<style>
.game-page {
  background-size: 100% 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.Profile {
  height: 150px;
  display: flex;
  background: var(--panel-bg);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(124, 77, 255, 0.3);
  /* backdrop-filter: blur(5px); */
  padding: 12px;
  margin-bottom: 15px;
}
.partners,
.NPCs {
  display: flex;
  flex-direction: row;
  width: 50%;
  overflow-x: auto;
  gap: 15px;
  padding: 5px;
  background-color: rgba(255, 255, 255, 0.7);
}
.Main {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  position: relative;
}

/* 文本信息区域 */
.text-infos {
  flex: 0 0 70%;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(124, 77, 255, 0.3);
  background-color: rgba(255, 255, 255, 0.7);
  /* backdrop-filter: blur(5px); */
  padding: 15px;
  position: relative;
  height: calc(100vh - 200px); /* 根据视口高度动态计算，减去顶部区域高度 */
}

/* 添加滚动容器样式 */
.history-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid rgba(124, 77, 255, 0.2);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.5);
  /* 确保滚动条美观 */
  scrollbar-width: thin;
  scrollbar-color: rgba(124, 77, 255, 0.5) rgba(255, 255, 255, 0.2);
  overflow: auto;
  line-height: 2;
}

/* 自定义滚动条样式（Webkit浏览器） */
.history-container::-webkit-scrollbar {
  width: 8px;
}

.history-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.history-container::-webkit-scrollbar-thumb {
  background: rgba(124, 77, 255, 0.5);
  border-radius: 4px;
}

.history-container::-webkit-scrollbar-thumb:hover {
  background: rgba(124, 77, 255, 0.7);
}

.TextOutput {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  margin-bottom: 15px;
  line-height: 1.6;
  font-size: 16px;
  color: var(--text-light);
  border: 1px solid rgba(124, 77, 255, 0.2);
}

.NPC-respond {
  color: rgb(203, 132, 0);
}

/* 输入区域 */
.InputInfos {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(124, 77, 255, 0.3);
  margin-top: auto;
}

.ButtonInfos {
  flex: 0 0 30%;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(124, 77, 255, 0.3);
  /* backdrop-filter: blur(5px); */
  background-color: rgba(255, 255, 255, 0.7);
  padding: 15px;
  gap: 15px;
  overflow-y: auto;
}

.Enemys {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  background: rgba(10, 10, 20, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(124, 77, 255, 0.2);
}

.refresh {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 10px;
}

.refresh button {
  background: rgba(60, 180, 231, 0.8);
  color: var(--text-light);
  border: 1px solid var(--border-glow);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh button:hover {
  background: rgba(60, 180, 231, 0.8);
  transform: translateY(-2px);
}
.iconButton {
  height: 50px;
  width: 50px;
}
.iconButton:hover {
  cursor: pointer;
}

.SaveLoadSettings {
  position: fixed;
  bottom: 0;
  right: 1;
}

.UserInput {
  flex: 1;
  padding: 12px 15px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-light);
  font-size: 16px;
  transition: all 0.3s;
}
.UserInput:focus {
  outline: none;
  background: rgba(0, 0, 0, 0.15);
  box-shadow: 0 0 10px var(--secondary-color);
}
.RadioGroups {
  display: flex;
  gap: 15px;
}

.RadioGroups label {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: all 0.2s;
}

.RadioGroups label:hover {
  background: rgba(124, 77, 255, 0.2);
}
div.EGO {
  display: flex;
  justify-content: center;
  padding: 10px;
}
.SendInfo {
  background: rgba(60, 180, 231, 0.8);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}
.SendInfo:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
}

/* 输入框禁用样式 */
.UserInput:disabled {
  background-color: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.4);
  cursor: not-allowed;
}

.UserInput:disabled::placeholder {
  color: rgba(0, 0, 0, 0.3);
}

/* 按钮禁用样式 */
.SendInfo:disabled {
  background: rgba(60, 180, 231, 0.4) !important;
  color: rgba(255, 255, 255, 0.7) !important;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

.SendInfo:disabled:hover {
  transform: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

/* 按钮禁用样式 */
.refresh button:disabled {
  background: rgba(60, 180, 231, 0.4) !important;
  color: rgba(255, 255, 255, 0.7) !important;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

.refresh button:disabled:hover {
  transform: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

.Quests {
  flex: 1;
  height: 30px;
  width: 80%;
  overflow-y: auto;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid rgba(124, 77, 255, 0.2);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.5);
  scrollbar-width: thin;
  scrollbar-color: rgba(124, 77, 255, 0.5) rgba(255, 255, 255, 0.2);
  overflow: auto;
}
</style>
