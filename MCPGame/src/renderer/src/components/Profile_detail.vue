<template>
  <div class="character-container">
    <div class="character-profile">
      <!-- 左侧人物头像 -->
      <div class="character-image">
        <img :src="characterData.profile" :alt="characterData.name" class="profile-img" />
        <div class="character-name">{{ characterData.name }}</div>
        <button class="close-btn" :disabled="isChatting" @click="closeProfile">关闭</button>
        <div
          v-show="
            characterData != undefined &&
            (characterData.type == 'npc' || characterData.type == 'party')
          "
          class="npc-dialogue"
        >
          {{ npcDialogue }}
        </div>
      </div>

      <!-- 右侧属性信息 -->
      <div class="character-stats">
        <h2 class="stats-title">人物属性</h2>

        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">生命值:{{ characterData.hp }}</span>
            <div class="stat-bar">
              <div class="stat-fill health" :style="{ width: '100%' }"></div>
              <span class="stat-value">{{ characterData.hp }}</span>
            </div>
          </div>

          <div class="stat-item">
            <span class="stat-label">等级:</span>
            <span class="stat-value">{{ characterData.level }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">经验值:</span>
            <div class="stat-bar">
              <div
                class="stat-fill exp"
                :style="{ width: (characterData.exp / characterData.expToNextLevel) * 100 + '%' }"
              ></div>
              <span class="stat-value"
                >{{ characterData.exp }} / {{ characterData.expToNextLevel }}</span
              >
            </div>
          </div>

          <div class="stat-item">
            <span class="stat-label">体质:</span>
            <span class="stat-value">{{ characterData.CON }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">感知:</span>
            <span class="stat-value">{{ characterData.DEX }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">智力:</span>
            <span class="stat-value">{{ characterData.INT }}</span>
          </div>
        </div>

        <!-- 技能区域 -->
        <div
          v-show="
            characterData != undefined &&
            (characterData.type == 'player' || characterData.type == 'party')
          "
          class="skills-section"
        >
          <h3 class="skills-title">技能</h3>

          <div class="skills-container">
            <!-- 可用技能列表 -->
            <div class="available-skills">
              <h4>可用技能</h4>
              <div class="skills-list">
                <div
                  v-for="skill in characterData.skills"
                  :key="skill.name"
                  class="skill-item"
                  :class="{ 'skill-bound': skill.isBound, 'skill-unbound': !skill.isBound }"
                  @click="toggleSkillBinding(skill)"
                >
                  <div class="skill-icon">{{ getSkillIcon(skill.dependent) }}</div>
                  <div class="skill-info">
                    <div class="skill-name">{{ skill.name }}</div>
                    <div class="skill-description">{{ skill.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-show="
          characterData != undefined &&
          (characterData.type == 'npc' || characterData.type == 'party')
        "
        class="InputInfos_for_characters"
      >
        <input
          v-model="private_talk_ipt"
          class="UserInput_for_characters"
          :disabled="isChatting"
          @keydown.enter="chat"
        />
        <button class="SendInfo" @click="chat" :disabled="isChatting">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, Ref } from 'vue'
import { useSharedStore } from '../../../stores/shared'
import { Skill, ChangeSkillRequest } from '../Character'
import type { CharacterData } from '../Character'
const characterData = inject('characterData') as Ref<CharacterData>

const store = useSharedStore()

function getSkillIcon(dependent: string) {
  const dependent_Map = new Map([
    ['CON', '体'],
    ['DEX', '感'],
    ['INT', '智']
  ])
  return dependent_Map.get(dependent) ?? '你'
}

//绑技能
async function changeSkill(data: ChangeSkillRequest): Promise<void> {
  try {
    const port = store.port
    const mcp_server = store.MCP_Server
    const response = await fetch(`http://${mcp_server}:${port}/game/chageSkill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      console.log(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
const update_NPC_cards = inject('update_NPC_cards') as () => void
// 切换技能绑定状态
async function toggleSkillBinding(skill: Skill) {
  try {
    console.log(`绑定技能: ${skill.name}`)
    const name = characterData.value.type == 'player' ? 'self' : characterData.value.name
    const bindRequest: ChangeSkillRequest = {
      name: name,
      skill_name: skill.name,
      skill_description: skill.description,
      skill_dependent: skill.dependent
    }
    await changeSkill(bindRequest)

    characterData.value.skills = characterData.value.skills.map((s) =>
      s.name === skill.name ? { ...s, isBound: !skill.isBound } : s
    )
    await update_NPC_cards()
  } catch (error) {
    console.error('切换技能绑定状态失败:', error)
  }
}

// 对话
const private_talk_ipt = ref('')
const npcDialogue = ref('')
const isChatting = ref(false)
const private_talk = inject('private_talk') as (npc: string, ipt: string) => string
const chat = async () => {
  if (!private_talk_ipt.value.trim()) return
  // 禁用输入和按钮
  isChatting.value = true

  try {
    const res = await private_talk(characterData.value.name, private_talk_ipt.value)
    console.log(res)
    npcDialogue.value = res

    // 清空输入框
    private_talk_ipt.value = ''
  } catch (error) {
    console.error('聊天出错:', error)
    npcDialogue.value = '对话出现错误，请稍后再试。'
  } finally {
    // 无论成功失败，都重新启用输入和按钮
    isChatting.value = false
  }
}
// 关闭
const changePage = inject('change_page') as (page: string) => void
const closeProfile = () => {
  changePage('game')
  npcDialogue.value = ''
}
</script>

<style scoped>
.character-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #2c3e50;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
  color: #ecf0f1;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
}

.character-profile {
  position: fixed;
  display: flex;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  gap: 30px;
  padding-top: 10%;
  padding-bottom: 10%;
  padding-left: 10%;
  padding-right: 10%;
}

.character-image {
  text-align: center;
  width: 200px;
  min-width: 200px;
}

.profile-img {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #f1c40f;
  margin-bottom: 15px;
}

.character-name {
  font-size: 1.5rem;
  font-weight: bold;
  color: #f1c40f;
}

.character-stats {
  width: 70%;
}

.stats-title {
  margin-top: 0;
  color: #f1c40f;
  border-bottom: 2px solid #34495e;
  padding-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 25px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  font-weight: bold;
  color: #bdc3c7;
}

.stat-value {
  font-weight: bold;
}

.stat-bar {
  position: relative;
  height: 20px;
  background-color: #34495e;
  border-radius: 10px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.stat-fill.health {
  background-color: #e74c3c;
}

.stat-fill.exp {
  background-color: #3498db;
}

.stat-bar .stat-value {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: white;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.7);
}
.skill-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #ddd;
}

.skill-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.skill-bound {
  background-color: #e8f5e8;
  border-color: #4caf50;
}

.skill-unbound {
  background-color: #f5f5f5;
  border-color: #ccc;
}

.skill-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #4caf50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-weight: bold;
}

.skill-bound .skill-icon {
  background: #4caf50;
}

.skill-unbound .skill-icon {
  background: #757575;
}

.skill-info {
  flex: 1;
}

.skill-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.skill-description {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 2px;
}

.skill-dependent {
  font-size: 0.8em;
  color: #888;
  margin-bottom: 4px;
}

.skill-status {
  font-size: 0.8em;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.skill-status.bound {
  background-color: #4caf50;
  color: white;
}

.skill-status.unbound {
  background-color: #757575;
  color: white;
}

.npc-dialogue {
  width: 100%;
  height: 30vh;
  border: solid;
  margin-top: 10px;
  color: #f1c40f;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #f1c40f rgba(255, 255, 255, 0.2);
}

.InputInfos_for_characters {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: rgba(44, 62, 80, 0.9);
  border: 1px solid #f1c40f;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  z-index: 101;
  width: 80vh;
  max-width: 80vh;
  backdrop-filter: blur(5px);
}

.UserInput_for_characters {
  flex: 1;
  padding: 12px 15px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-light);
  font-size: 16px;
  transition: all 0.3s;
}
.UserInput_for_characters:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 10px var(--secondary-color);
}

.UserInput_for_characters:disabled {
  background-color: rgba(255, 255, 255, 0.05);
  color: rgba(0, 0, 0, 0.4);
  cursor: not-allowed;
}

.UserInput_for_characters:disabled::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
</style>
