<template>
  <div class="battle-container" :style="{ backgroundImage: currentBackground }">
    <button class="accelerate-btn" @click="accelerateBattle">加速</button>
    <!-- 战斗信息显示 -->

    <!-- 角色区域 -->
    <div class="character-area">
      <!-- 玩家方 -->
      <div class="player-side">
        <battle_player
          v-for="(player, index) in ourSide"
          :key="`player-${index}`"
          :ref="(el) => setPlayerRef(index.toString(), el)"
          :image="player.image"
          :hp="player.hp"
          :name="player.name"
          :skill="player.skill"
          :dependent="player.dependent"
        />
      </div>

      <!-- 敌方 -->
      <div class="enemy-side">
        <battle_player
          v-for="(enemy, index) in enemySide"
          :key="`enemy-${index}`"
          :ref="(el) => setEnemyRef(index.toString(), el)"
          :image="enemy.image"
          :hp="enemy.hp"
          :name="enemy.name"
          :skill="enemy.skill"
          :dependent="enemy.dependent"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import battle_player from './components/battle_player.vue'
import battle from '../../../resources/battle.png'
import { computed, ref, inject, nextTick, onMounted } from 'vue'
import { BattleLog, battle_player_constructor } from './Battle'
import failed from '../../../resources/failed.mp3'

const currentBackground = computed(() => {
  return `url(${battle})`
})

const props = defineProps<{
  battleProcess: BattleLog[]
  ourSide: battle_player_constructor[]
  enemySide: battle_player_constructor[]
}>()

const playerRefs = ref<Map<string, any>>(new Map())

const setPlayerRef = (id: string, el: any) => {
  if (el) {
    playerRefs.value.set(id, el)
  } else {
    playerRefs.value.delete(id)
  }
}

const callAttackById = async (Pid: string, type: string) => {
  if (type == 'player') {
    const player = playerRefs.value.get(Pid)
    await player.attack()
  } else {
    const enemy = enemyRefs.value.get(Pid)
    await enemy.attack()
  }
}

const callhittedById = async (Pid: string, type: string, damage: number, attack_type: string) => {
  if (type == 'player') {
    const player = playerRefs.value.get(Pid)
    await player.takeDamage(damage, attack_type)
  } else {
    const enemy = enemyRefs.value.get(Pid)
    await enemy.takeDamage(damage, attack_type)
  }
}

const enemyRefs = ref<Map<string, any>>(new Map())

const setEnemyRef = (id: string, el: any) => {
  if (el) {
    enemyRefs.value.set(id, el)
  } else {
    enemyRefs.value.delete(id)
  }
}

const changePage = inject('change_page') as (page: string) => void
const update_NPC_cards = inject('update_NPC_cards') as () => void

const isAccelerated = ref(false)

const accelerateBattle = () => {
  isAccelerated.value = true
}

onMounted(async () => {
  isAccelerated.value = false
  await nextTick()
  try {
    // 播放战斗过程
    const battle_process = props.battleProcess
    for (const x of battle_process) {
      if (isAccelerated.value) break
      let type = 'player'
      if (x.defender_type === 'player') {
        type = 'enemy'
      }
      await callAttackById(x.attacker_index.toString(), type)
      await callhittedById(x.defender_index.toString(), x.defender_type, x.damage, x.attacker_type)
    }
    const last_turn = battle_process[battle_process.length - 1]
    if (last_turn.defender_type === 'player') {
      const audio = new Audio(failed)
      audio.volume = 1
      audio.play().catch((error) => {
        console.error('播放音效失败:', error)
      })
      changePage('cover')
    } else {
      await update_NPC_cards()
      changePage('game')
    }
  } catch (error) {
    console.log(error)
  }
})
</script>
<style>
.character-area {
  display: flex;
  height: 100%;
  padding: 20px;
}

.player-side,
.enemy-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 30px;
  padding: 20px;
}

.player-side {
  align-items: flex-start;
}

.enemy-side {
  align-items: flex-end;
}

.battle-container {
  background-size: 100% 100%;
  width: 100%;
  height: 100%;
}

.player-side img {
  transform: scaleX(-1);
}

.battle-container-failed {
  filter: grayscale(100%);
  background-size: 100% 100%;
  width: 100%;
  height: 100%;
}

.accelerate-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 8px 16px;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  z-index: 100;
}

.accelerate-btn:hover {
  background-color: #e55a2b;
}
</style>
