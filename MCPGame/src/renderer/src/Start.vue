<template>
  <div class="Start">
    <div class="background-effect"></div>
    <div class="name-input-container">
      <div class="input-panel">
        <h2 class="input-title">请输入您的名字</h2>
        <input v-model="name" type="text" class="name-input" />
        <h2 v-show="show_img_area" class="input-img">请输入你的像素形象</h2>
        <textarea v-show="show_img_area" v-model="img_prompt" class="img-prompt-input" />
        <button id="startButton" class="start-button" @click="Game_Begin">开始游戏</button>
      </div>
      <div class="skills-selection">
        <h2 class="section-title">选择初始技能</h2>
        <div class="skills-container">
          <div class="skill-card" data-skill="CON" @click="setSkill('CON')">
            <div class="skill-header">
              <div class="skill-name">{{ skills[0]['name'] }}</div>
              <div class="skill-attributes">
                <div class="attribute strength"><i class="fas fa-fist-raised"></i> 体质</div>
              </div>
            </div>
            <div class="skill-description">
              {{ skills[0]['description'] }}
            </div>
          </div>

          <div class="skill-card" data-skill="DEX" @click="setSkill('DEX')">
            <div class="skill-header">
              <div class="skill-name">{{ skills[1]['name'] }}</div>
              <div class="skill-attributes">
                <div class="attribute perception"><i class="fas fa-eye"></i> 感知</div>
              </div>
            </div>
            <div class="skill-description">
              {{ skills[1]['description'] }}
            </div>
          </div>

          <div class="skill-card" data-skill="INT" @click="setSkill('INT')">
            <div class="skill-header">
              <div class="skill-name">{{ skills[2]['name'] }}</div>
              <div class="skill-attributes">
                <div class="attribute wisdom"><i class="fas fa-brain"></i> 智慧</div>
              </div>
            </div>
            <div class="skill-description">
              {{ skills[2]['description'] }}
            </div>
          </div>
        </div>
      </div>
      <div class="decoration">
        <div class="ornament"></div>
        <div class="ornament"></div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useSharedStore } from '../../stores/shared'
import { computed, inject, ref, Ref } from 'vue'
import { ContentSegment } from './Infos'

const show_img_area = computed(() => {
  const store = useSharedStore()
  return store.img_generation
})

const name = ref('伊果')
const img_prompt = ref(
  `像素艺术精灵图，一个干练的特工全身像，穿着带有发光细节的紧身黑色战术服，手持一把未来主义的消音手枪，面朝左侧，准备行动。`
)
interface Skill {
  name: string
  description: string
  dependent: 'CON' | 'DEX' | 'INT'
}
const skills: Skill[] = [
  {
    name: '刚毅之躯',
    description: '通过意志力瞬间强化身体韧性，在危急时刻展现出超乎常人的承受能力以及身体韧性。',
    dependent: 'CON'
  },
  {
    name: '维度感知',
    description:
      '高度敏锐的感知能力让你能够察觉微观层面的维度波动，这种感知能帮助你发现隐藏的通道或识别异常的物品或预判敌人的动作。',
    dependent: 'DEX'
  },
  {
    name: '逻辑推演',
    description: '分析他人或物品的行为模式和能量的运作逻辑并能够快速找出敌人的弱点规律',
    dependent: 'INT'
  }
]

const skill_idx_map = new Map([
  ['CON', 0],
  ['DEX', 1],
  ['INT', 2]
])

let current_Skill = ''
const setSkill = (SkillType: 'CON' | 'DEX' | 'INT') => {
  current_Skill = SkillType
  const divs = document.getElementsByTagName('div')
  Array.from(divs)
    .filter((div) => div.hasAttribute('data-skill'))
    .forEach((div) => {
      if (div.getAttribute('data-skill') === current_Skill) {
        div.classList.add('selected')
      } else {
        div.classList.remove('selected')
      }
    })
}

const changePage = inject('change_page') as (page: string) => void
const set_NPC_cards = inject('set_NPC_cards') as (jsonData: any) => void
const add_loadingInfo = inject('add_loadingInfo') as (s: string) => void
const clean_loadingInfo = inject('clean_loadingInfo') as () => void
const set_player_profile = inject('set_player_profile') as (ipt: string) => void

const initialize_game = inject('game_init') as () => Promise<void>

const Command_dialogue = inject('Command_dialogue') as (
  ipt: string,
  initialize_Prompt: boolean
) => Promise<void>
const refresh_enemy = inject('refresh_enemy') as () => Promise<void>

const new_history = inject('new_history') as Ref<string[]>
const displayedOldHistory = inject('displayedOldHistory') as Ref<(string | ContentSegment[])[]>

const Game_Begin = async () => {
  changePage('start_loading_info')
  await initialize_game()
  const store = useSharedStore()
  store.$patch({
    history: [],
    display_history: []
  })
  displayedOldHistory.value = []
  new_history.value = []
  await fetch(`http://${store.MCP_Server}:${store.port}/initialize_name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: name.value })
  })

  const skill_idx = skill_idx_map.get(current_Skill) ?? 0

  await fetch(`http://${store.MCP_Server}:${store.port}/game/addSkill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'self',
      skill_name: skills[skill_idx]['name'],
      skill_description: skills[skill_idx]['description'],
      skill_dependent: skills[skill_idx]['dependent']
    })
  })

  await fetch(`http://${store.MCP_Server}:${store.port}/game/chageSkill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'self',
      skill_name: skills[skill_idx]['name'],
      skill_description: skills[skill_idx]['description'],
      skill_dependent: skills[skill_idx]['dependent']
    })
  })
  add_loadingInfo('正在生成序幕与初始化NPC……')
  await Command_dialogue('* 请参照系统提示词，生成一个序幕 *', true)
  add_loadingInfo('正在设置头像……')
  await set_player_profile(img_prompt.value)
  add_loadingInfo('正在生成默认敌人……')
  await refresh_enemy()
  add_loadingInfo('正在设置UI……')
  const response = await fetch(`http://${store.MCP_Server}:${store.port}/game/status`)
  const jsonData = await response.json()
  console.log('初始化完成！')
  console.log(jsonData)
  set_NPC_cards(jsonData)

  clean_loadingInfo()
  changePage('game')
}
</script>
<style>
.name-input-container {
  width: 100%;
  max-width: 800px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-title {
  font-size: 3.5rem;
  margin-bottom: 30px;
  text-align: center;
  color: #f0f0f0;
  text-shadow:
    0 0 10px #7c4dff,
    0 0 20px #7c4dff;
  letter-spacing: 4px;
}

.input-panel {
  background: rgba(26, 26, 46, 0.85);
  border: 1px solid rgba(124, 77, 255, 0.5);
  border-radius: 15px;
  padding: 30px;
  width: 100%;
  box-shadow: 0 0 25px rgba(124, 77, 255, 0.4);
  backdrop-filter: blur(5px);
}

.input-title {
  font-size: 1.8rem;
  margin-bottom: 25px;
  text-align: center;
  color: white;
}

.name-input {
  width: 100%;
  height: 40px;
  font-size: 1.2rem;
  background: rgb(10, 10, 20);
  border: 2px solid #7c4dff;
  border-radius: 8px;
  color: #f0f0f0;
  margin-bottom: 25px;
  transition: all 0.3s;
}

.name-input:focus {
  outline: none;
  box-shadow: 0 0 15px #7c4dff;
  transform: scale(1.02);
}

.img-prompt-input {
  width: 100%;
  height: 120px;
  font-size: 1.2rem;
  background: rgb(10, 10, 20);
  border: 2px solid #7c4dff;
  border-radius: 8px;
  color: #f0f0f0;
  margin-bottom: 25px;
  transition: all 0.3s;
}

.img-prompt-input:focus {
  outline: none;
  box-shadow: 0 0 15px #7c4dff;
  transform: scale(1.02);
}

.start-button {
  background: linear-gradient(45deg, #7c4dff, #ff6e6a);
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 1.3rem;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
  transition: all 0.3s;
  letter-spacing: 2px;
}

.start-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 7px 15px rgba(0, 0, 0, 0.4);
}

.start-button:active {
  transform: translateY(1px);
}

.decoration {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
  width: 100%;
  opacity: 0.7;
}

.ornament {
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, #7c4dff 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0.5;
}

.hint {
  margin-top: 20px;
  color: #b8b8b8;
  font-size: 1rem;
  text-align: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.7;
  }
}

.Start {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background-color: #0d0d1b;
  color: #f0f0f0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.background-effect {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: #7c4dff;
  opacity: 0.3;
  animation: float 15s infinite linear;
}
.skill-description {
  color: #b8b8b8;
  line-height: 1.5;
  font-size: 1.1rem;
}
.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.skill-card {
  flex: 1;
  width: 250px;
  background: rgba(10, 10, 20, 0.7);
  border: 2px solid #7c4dff;
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(124, 77, 255, 0.5);
}

.skill-card.selected {
  border-color: #ff6e6a;
  box-shadow: 0 0 20px rgba(255, 110, 106, 0.6);
  background: rgba(42, 15, 30, 0.7);
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-name {
  font-size: 1.5rem;
  color: #ff6e6a;
}

.skill-attributes {
  display: flex;
  gap: 10px;
}

.attribute {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.strength {
  background-color: rgba(255, 110, 106, 0.2);
  color: #ff6e6a;
}

.perception {
  background-color: rgba(79, 195, 247, 0.2);
  color: #4fc3f7;
}

.wisdom {
  background-color: rgba(255, 241, 118, 0.2);
  color: #fff176;
}
@keyframes float {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  100% {
    transform: translateY(-100vh) rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-title {
    font-size: 2.5rem;
  }

  .input-title {
    font-size: 1.5rem;
  }

  .input-panel {
    padding: 20px;
  }
}
</style>
