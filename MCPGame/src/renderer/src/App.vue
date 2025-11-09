<template>
  <div class="app-container">
    <Game v-show="current_page === 'game'" class="page" />
    <Start v-show="current_page === 'start'" class="page" />
    <backpack v-show="current_page === 'backpack'" class="page" />
    <Cover v-show="current_page === 'cover'" class="page" />
    <settings v-show="current_page === 'setting_cover'" class="page" father_page="cover" />
    <settings v-show="current_page === 'setting'" class="page" father_page="game" />
    <settings
      v-show="current_page === 'setting_cover_start'"
      class="page"
      father_page="cover_start"
    />
    <profile_detail v-show="current_page === 'profile'" />
    <save_page v-show="current_page === 'load_cover'" father_page="cover" save_load="load" />
    <save_page v-show="current_page === 'save'" father_page="game" save_load="save" />
    <save_page v-show="current_page === 'load'" father_page="game" save_load="load" />
    <Battle
      v-show="current_page === 'battle'"
      :key="battleKey"
      :battle-process="battleProcess"
      :our-side="OurSide_Meta"
      :enemy-side="EnemySide_Meta"
    />
    <start_loading_info v-show="current_page === 'start_loading_info'" />
  </div>
</template>
<script setup lang="ts">
import Game from './Game.vue'
import settings from './settings.vue'
import Cover from './Cover.vue'
import { provide, Ref, ref, nextTick } from 'vue'
import backpack from './backpack.vue'
import profile_detail from './components/Profile_detail.vue'
import save_page from './save_page.vue'
import Start from './Start.vue'
import Battle from './Battle.vue'
import { BattleLog, battle_player_constructor } from './Battle'
import { ClientPortStore, useSharedStore } from '../../stores/shared'
import start_loading_info from './start_loading_info.vue'
import { CharacterData } from './Character'
import { ContentSegment } from './Infos'

import main_world from '../../../resources/main_world.png'
import world1 from '../../../resources/world1.png'
import world2 from '../../../resources/world2.png'
import world3 from '../../../resources/world3.png'
import world4 from '../../../resources/world4.png'
import final_world from '../../../resources/final_world.png'

const current_page: Ref<string, string> = ref('cover')
const battleProcess = ref<BattleLog[]>([])
const OurSide_Meta = ref<battle_player_constructor[]>([])
const EnemySide_Meta = ref<battle_player_constructor[]>([])

const teammates = ref<CharacterData[]>([])
const npcs = ref<CharacterData[]>([])
const enemys = ref<CharacterData[]>([])

const EGO = ref(100)
const battleKey = ref(0)
const quests = ref('')

const change_current_page = (newPage: string) => {
  current_page.value = newPage
}

const update_battleProcess = (s: string) => {
  const Battle_from_Server = JSON.parse(s)
  const OurSide = parse_Battle_Meta(Battle_from_Server[0])
  const EnemySide = parse_Battle_Meta(Battle_from_Server[1])
  const ThisBattle = parse_Battle_Log(Battle_from_Server.slice(2))

  OurSide_Meta.value = OurSide
  EnemySide_Meta.value = EnemySide
  battleProcess.value = ThisBattle

  battleKey.value++
  change_current_page('battle')
}

const parse_Battle_Meta = (ipt) => {
  const res: battle_player_constructor[] = []
  for (const i of Array(ipt.hp.length).keys()) {
    const thisPerson = {
      image: ipt.profile[i],
      hp: ipt.hp[i],
      name: ipt.name[i],
      skill: ipt.skill_name[i],
      dependent: ipt.skill_dependent[i]
    }
    res.push(thisPerson)
  }
  return res
}

const parse_Battle_Log = (ipt) => {
  const res: BattleLog[] = []
  for (const x of ipt) {
    const thisTurn = new BattleLog(
      x.attacker_type,
      x.defender_type,
      x.attacker_index,
      x.defender_index,
      x.damage
    )
    res.push(thisTurn)
  }
  return res
}

const bound_skill = (npc: CharacterData) => {
  const tgt_skill = npc.CombatAttribute
  for (const skill of npc.skills) {
    if (tgt_skill == null) {
      skill.isBound = false
    } else {
      if (
        skill.name == tgt_skill.name &&
        skill.description == tgt_skill.description &&
        skill.dependent == tgt_skill.dependent
      ) {
        skill.isBound = !skill.isBound
      } else {
        skill.isBound = false
      }
    }
  }
}

const set_NPC_cards = (jsonData) => {
  const Server_teammates: CharacterData[] = []
  const Server_NPCs: CharacterData[] = []
  const Server_enemys: CharacterData[] = []
  //先把自己给加进去
  Server_teammates.push({
    profile: jsonData.player.profile,
    hp: jsonData.player.hp,
    name: jsonData.player.name,
    type: 'player',
    level: jsonData.player.level,
    exp: jsonData.player.exp,
    expToNextLevel: 1000,
    CON: jsonData.player.CON,
    DEX: jsonData.player.DEX,
    INT: jsonData.player.INT,
    skills: jsonData.player._skills,
    CombatAttribute: jsonData.player.CombatAttribute,
    can_be_recruited: false,
    disabled: false
  })
  for (const npc of jsonData.player._partys) {
    Server_teammates.push({
      profile: npc.profile,
      hp: npc.hp,
      name: npc.name,
      type: 'party',
      level: npc.level,
      exp: npc.exp,
      expToNextLevel: 1000,
      CON: npc.CON,
      DEX: npc.DEX,
      INT: npc.INT,
      skills: npc._skills,
      CombatAttribute: npc.CombatAttribute,
      can_be_recruited: false,
      disabled: false
    })
  }

  // 还需要筛选“当前世界”的NPC
  const world_npc_map = new Map<string, string>(jsonData.world_npc_map)
  for (const npc of jsonData.NPCs) {
    if ((world_npc_map.get(npc.name) ?? '') == jsonData.current_world) {
      Server_NPCs.push({
        profile: npc.profile,
        hp: npc.hp,
        name: npc.name,
        type: 'npc',
        level: npc.level,
        exp: npc.exp,
        expToNextLevel: 1000,
        CON: npc.CON,
        DEX: npc.DEX,
        INT: npc.INT,
        skills: npc._skills,
        CombatAttribute: npc.CombatAttribute,
        can_be_recruited: npc.potential_member,
        disabled: false
      })
    }
  }

  for (const enemy of jsonData.enemy) {
    Server_enemys.push({
      profile: enemy.profile,
      hp: enemy.hp,
      name: enemy.name,
      type: 'enemy',
      level: 0,
      exp: 0,
      expToNextLevel: 0,
      CON: 0,
      DEX: 0,
      INT: 0,
      skills: [],
      CombatAttribute: null,
      can_be_recruited: false,
      disabled: false
    })
  }

  for (const npc of Server_teammates) {
    bound_skill(npc)
  }
  teammates.value = Server_teammates
  npcs.value = Server_NPCs
  enemys.value = Server_enemys
  EGO.value = jsonData.player.EGO
  quests.value = jsonData.quests
}

const update_NPC_cards = async () => {
  const store = useSharedStore()
  await fetch(`http://localhost:${Client_Port}/setProfiles`)
  const response = await fetch(`http://${store.MCP_Server}:${store.port}/game/status`)
  const jsonData = await response.json()
  set_NPC_cards(jsonData)
}

const recruit = async (name: string) => {
  const store = useSharedStore()
  await fetch(`http://${store.MCP_Server}:${store.port}/add_to_party`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: name })
  })
  const response = await fetch(`http://${store.MCP_Server}:${store.port}/game/status`)
  const jsonData = await response.json()
  set_NPC_cards(jsonData)
}

const clientstore = ClientPortStore()
const Client_Port = clientstore.port //调试时写为3001
console.log(Client_Port)

const Client_update_Settings = async () => {
  //将pinia的settings传给服务端
  const store = useSharedStore()
  const response = await fetch(`http://localhost:${Client_Port}/update_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ json_string: store.toJson() })
  })
  return response.ok
}

const game_init = async () => {
  const store = useSharedStore()
  await fetch(`http://${store.MCP_Server}:${store.port}/initialize`)
}

const update_historys = (jsonData: any) => {
  //将服务端的history拿过来
  const store = useSharedStore()
  for (const res of jsonData.display_history) {
    add_new_history(res)
    store.display_history.push(res)
  }
  store.history.length = 0
  for (const his of jsonData.history) {
    store.history.push({
      role: his.role,
      content: his.content
    })
  }
}

const Command_dialogue = async (ipt: string, initialize_Prompt: boolean = false) => {
  const connect = await Client_update_Settings()
  if (!connect) {
    console.log('连接LLM出错', '无法将历史记录传给LLM，请检查MCP_Client是否开启')
    return
  }
  const response = await fetch(`http://localhost:${Client_Port}/Command_dialogue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ipt: ipt, initialize_Prompt: initialize_Prompt })
  })
  const jsonData = await response.json()
  update_historys(jsonData)
  await update_NPC_cards()
}

const public_talk = async (ipt: string) => {
  const connect = await Client_update_Settings()
  if (!connect) {
    console.log('连接LLM出错', '无法将历史记录传给LLM，请检查MCP_Client是否开启')
    return
  }
  const response = await fetch(`http://localhost:${Client_Port}/public_talk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ipt: ipt })
  })
  const jsonData = await response.json()
  update_historys(jsonData)
  await update_NPC_cards()
}

const private_talk = async (npc: string, ipt: string) => {
  const connect = await Client_update_Settings()
  if (!connect) {
    console.log('连接LLM出错', '无法将历史记录传给LLM，请检查MCP_Client是否开启')
    return
  }
  const response = await fetch(`http://localhost:${Client_Port}/private_talk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ npc: npc, ipt: ipt })
  })
  const jsonData = await response.json()
  return jsonData.npc_result
}

const refresh_enemy = async () => {
  const connect = await Client_update_Settings()
  if (!connect) {
    console.log('连接LLM出错', '无法将历史记录传给LLM，请检查MCP_Client是否开启')
    return
  }
  await fetch(`http://localhost:${Client_Port}/refresh_enemy`)
  await update_NPC_cards()
}

const set_player_profile = async (ipt: string) => {
  await fetch(`http://localhost:${Client_Port}/set_player_profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ipt: ipt })
  })
}

const get_current_page = () => {
  return current_page.value
}

const loadingInfo = ref<string[]>([])
const add_loadingInfo = (s: string) => {
  loadingInfo.value.push(s)
}

const clean_loadingInfo = () => {
  loadingInfo.value = []
}

const new_history = ref<string[]>([])

// 修改 displayedOldHistory 的类型
const displayedOldHistory = ref<(string | ContentSegment[])[]>([])

const add_new_history = (ipt: string) => {
  new_history.value.push(ipt)
}

const clear_new_history = () => {
  new_history.value.length = 0
}

// 判断是否为图片（base64格式）
const isImage = (text: string): boolean => {
  return text.startsWith('data:image/') && text.includes('base64')
}

const npcRespondPattern = /<NPC_respond>(.*?)<\/NPC_respond>/s

// 解析文本中的 NPC_respond 标签
const parseNPCTags = (text: string): ContentSegment[] => {
  if (isImage(text)) {
    return [{ type: 'image', content: text }]
  }

  if (npcRespondPattern.test(text)) {
    const match = npcRespondPattern.exec(text)
    if (match === null) return []
    return [
      {
        type: 'npc_respond',
        content: match[1] // 提取标签内的内容
      }
    ]
  }
  return [
    {
      type: 'text',
      content: text
    }
  ]
}

const characterData = ref<CharacterData>({
  name: '玩家',
  profile: '',
  hp: 30,
  level: 1,
  exp: 0,
  expToNextLevel: 1000,
  CON: 10,
  DEX: 10,
  INT: 10,
  skills: [],
  CombatAttribute: null,
  type: 'player',
  can_be_recruited: false,
  disabled: false
})

const scrollToBottom = () => {
  nextTick(() => {
    const historyContainer = document.querySelector('.history-container') as HTMLElement
    if (historyContainer) {
      // 直接设置滚动容器的滚动位置
      historyContainer.scrollTop = historyContainer.scrollHeight
    }
  })
}

const current_background_img = ref(`url(${main_world})`)
const currentBackground = async () => {
  const background_dict = new Map([
    ['奇点侦测站', main_world],
    ['齿轮', world1],
    ['源法', world2],
    ['混元', world3],
    ['黯蚀', world4],
    ['终焉', final_world]
  ])
  const store = useSharedStore()
  const response = await fetch(`http://${store.MCP_Server}:${store.port}/game/status`)
  const jsonData = await response.json()
  const current_world = jsonData.current_world
  const res = background_dict.get(current_world) ?? main_world
  current_background_img.value = `url(${res})`
}

provide('current_page', current_page)
provide('change_page', change_current_page)
provide('update_battleProcess', update_battleProcess)
provide('get_current_page', get_current_page)
provide('loadingInfo', loadingInfo)
provide('add_loadingInfo', add_loadingInfo)
provide('clean_loadingInfo', clean_loadingInfo)
provide('Command_dialogue', Command_dialogue)
provide('public_talk', public_talk)
provide('private_talk', private_talk)
provide('refresh_enemy', refresh_enemy)
provide('teammates', teammates)
provide('npcs', npcs)
provide('enemys', enemys)
provide('game_init', game_init)
provide('set_NPC_cards', set_NPC_cards)
provide('set_player_profile', set_player_profile)
provide('recruit', recruit)
provide('add_new_history', add_new_history)
provide('new_history', new_history)
provide('clear_new_history', clear_new_history)
provide('displayedOldHistory', displayedOldHistory)
provide('characterData', characterData)
provide('update_NPC_cards', update_NPC_cards)
provide('scrollToBottom', scrollToBottom)
provide('EGO', EGO)
provide('quests', quests)
provide('isImage', isImage)
provide('parseNPCTags', parseNPCTags)
provide('npcRespondPattern', npcRespondPattern)
provide('currentBackground', currentBackground)
provide('current_background_img', current_background_img)
</script>
<style>
.app-container {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* 防止滚动条 */
}
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* 防止滚动条 */
}
.page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
