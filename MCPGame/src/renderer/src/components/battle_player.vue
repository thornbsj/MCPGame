<!-- eslint-disable prettier/prettier -->
<template>
  <div class="character" :class="{ 'character-dead': setDeath }">
    <div v-show="showSkill" class="skill_info">{{ skill }}</div>
    <div class="image-container">
      <img :src="image" class="character-image" :class="{ 'grayscale': setDeath }">
      <img
        v-if="showHitted"
        :key="hittedGifKey"
        :src="hittedGif"
        class="effect-gif hitted-effect"
        @load="onHittedGifLoad"
        @error="onHittedGifError"
      >
      <img
        v-if="showAttack"
        :key="attackGifKey"
        :src="attackGif"
        class="effect-gif attack-effect"
        @load="onAttackGifLoad"
        @error="onAttackGifError"
      >
      <div v-if="showDamage" class="damage-text" :style="damageTextStyle">
        -{{ damageValue }}
      </div>
    </div>
    <div class="health-bar">
      <div class="health-fill"></div>
      <div class="health-text">{{ currentHp }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, withDefaults, ref, computed, nextTick } from 'vue'

interface Props {
  image?: string
  hp?: number
  name?: string
  skill?: string
  dependent?: string
}

const props = withDefaults(defineProps<Props>(), {
  image: img_dict.img_base64.get('img_12_left'),
  hp: 30,
  name: '玩家',
  skill: '技能1',
  dependent: 'badass'
})

const currentHp = ref(props.hp)
const hit_wait_seconds = 500

// 响应式数据
const showHitted = ref(false)
const showAttack = ref(false)
const showSkill = ref(false)
const showDamage = ref(false)
const damageValue = ref(0)
const characterImage = ref<HTMLImageElement | null>(null)
const imageWidth = ref(0)
const imageHeight = ref(0)

const hittedGifKey = ref(0)
const attackGifKey = ref(0)

// GIF 路径
import CON_hitted from '../../../../resources/CON.gif'
import DEX_hitted from '../../../../resources/DEX.gif'
import INT_hitted from '../../../../resources/INT.gif'
import badass_hitted from '../../../../resources/badass.gif'
import attackGif_base from '../../../../resources/hit.gif'
import CON_sound from '../../../../resources/CON.ogg'
import DEX_sound from '../../../../resources/DEX.ogg'
import INT_sound from '../../../../resources/INT.ogg'
import badass_sound from '../../../../resources/badass.ogg'
import img_dict from '@renderer/img_profiles'

let hittedGif = CON_hitted
let attackGif = attackGif_base
// 计算属性
const setDeath = computed(() => {
  return currentHp.value <= 0
})

const damageTextStyle = computed(() => {
  return {
    right: `${imageWidth.value + 10}px`,
    top: `${imageHeight.value / 2}px`
  }
})

// 方法
const onHittedGifLoad = () => {
  // GIF 加载完成后，设置定时器在播放完成后隐藏
  setTimeout(() => {
    showHitted.value = false
  }, hit_wait_seconds) //
}

const onHittedGifError = (event: Event) => {
  console.log(event)
  const imgElement = event.target as HTMLImageElement
  const errorDetails = {
    message: '受击GIF加载失败',
    src: imgElement.src,
    timestamp: new Date().toISOString(),
    eventType: event.type
  }

  console.error('受击GIF加载失败详情:', errorDetails)

  showHitted.value = false
}

const playSoundSimple = (attack_type: string) => {
  const atk_gif = new Map<string, string>([
    ['CON', CON_sound],
    ['DEX', DEX_sound],
    ['INT', INT_sound],
    ['badass', badass_sound]
  ])
  const audio = new Audio(atk_gif.get(attack_type) ?? CON_sound)
  audio.volume = 1
  audio.play().catch((error) => {
    console.error('播放音效失败:', error)
  })
}

const onAttackGifLoad = () => {
  // GIF 加载完成后，设置定时器在播放完成后隐藏
  setTimeout(() => {
    showAttack.value = false
    showSkill.value = false
  }, hit_wait_seconds)
}

const onAttackGifError = (event: Event) => {
  console.log(event)
  const imgElement = event.target as HTMLImageElement
  const errorDetails = {
    message: '攻击GIF加载失败',
    src: imgElement.src,
    timestamp: new Date().toISOString(),
    // 可以从event中尝试获取更多错误信息
    eventType: event.type
  }

  console.error('攻击GIF加载失败详情:', errorDetails)

  showAttack.value = false
  showSkill.value = false
}

const onImageLoad = () => {
  if (characterImage.value) {
    imageWidth.value = characterImage.value.offsetWidth
    imageHeight.value = characterImage.value.offsetHeight
  }
}

// 暴露给父组件的方法
const takeDamage = (damage: number, attack_type: string) => {
  const atk_gif = new Map<string, string>([
    ['CON', CON_hitted],
    ['DEX', DEX_hitted],
    ['INT', INT_hitted],
    ['badass', badass_hitted]
  ])

  currentHp.value = Math.max(0, currentHp.value - damage)

  hittedGifKey.value++
  const baseGif = atk_gif.get(attack_type) ?? CON_hitted
  hittedGif = `${baseGif}?t=${Date.now()}`
  //hittedGif = atk_gif.get(attack_type) ?? CON_hitted
  return new Promise<void>((resolve) => {
    damageValue.value = damage
    showDamage.value = true
    showHitted.value = true

    playSoundSimple(attack_type)
    // 显示扣血文本动画
    setTimeout(() => {
      showDamage.value = false
    }, hit_wait_seconds)

    // 等待受击动画完成
    setTimeout(() => {
      showHitted.value = false
      resolve()
    }, hit_wait_seconds)
  })
}

const attack = () => {
  return new Promise<void>((resolve) => {
    showSkill.value = true
    showAttack.value = true
    attackGifKey.value++
    attackGif = `${attackGif_base}?t=${Date.now()}`
    // 等待攻击动画完成
    setTimeout(() => {
      showAttack.value = false
      showSkill.value = false
      resolve()
    }, hit_wait_seconds)
  })
}

// 在下次DOM更新后获取图片尺寸
nextTick(() => {
  if (characterImage.value) {
    onImageLoad()
  }
})

// 暴露方法给父组件
defineExpose({
  takeDamage,
  attack
})
</script>

<style>
.health-bar {
  width: 100%;
  height: 15px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  margin-top: 15px;
  overflow: hidden;
  position: relative;
}

.skill_info {
  height: 18px;
  background: linear-gradient(90deg, #ff6e6a, #4a2b8c);
  border-radius: 10px;
  transition: width 0.5s;
  top: 0;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  color: white;
  text-shadow: 1px 1px 2px black;
  margin-bottom: 5px;
}

.health-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6e6a, #4a2b8c);
  border-radius: 10px;
  transition: width 0.5s;
}

.health-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  color: white;
  text-shadow: 1px 1px 2px black;
}

.character {
  width: auto;
  height: 100px;
  margin: auto;
  background-color: rgba(255, 255, 255, 0.35);
  border-radius: 15px;
  position: relative;
}

.image-container {
  position: relative;
  display: inline-block;
}

.character-image {
  display: block;
  width: 70px;
  height: 70px;
  border-radius: 10px;
  transition: filter 0.3s ease;
}

.character-image.grayscale {
  filter: grayscale(100%);
}

.effect-gif {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: 10px;
}

.hitted-effect {
  z-index: 10;
}

.attack-effect {
  z-index: 5;
}

.damage-text {
  position: absolute;
  color: #ff4444;
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: 1px 1px 2px black;
  animation: damageFloat 1s ease-out forwards;
  z-index: 20;
  pointer-events: none;
}

@keyframes damageFloat {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px);
  }
}

.character-dead {
  opacity: 0.7;
}
</style>
