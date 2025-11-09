<template>
  <div class="mainProfile">
    <img :src="profile" alt="profile" class="custom-img" @click="handleClick" />
    <div class="name">{{ name }}</div>
    <div v-if="!could_be_recruit()" class="hp">{{ hp }}</div>
    <button v-if="could_be_recruit()" class="recruit-btn" @click="recruit(name)">招募</button>
  </div>
</template>

<script setup lang="ts">
import { inject, defineProps, withDefaults, Ref } from 'vue'
import Avatar from '../../../../resources/Avatar.png'
import { CharacterData, Skill } from '../Character'

const props = withDefaults(defineProps<CharacterData>(), {
  name: '玩家',
  profile: Avatar,
  hp: 30,
  level: 1,
  exp: 0,
  expToNextLevel: 1000,
  CON: 10,
  DEX: 10,
  INT: 10,
  skills: () => [] as Skill[],
  CombatAttribute: null,
  type: 'player',
  can_be_recruited: false,
  disabled: false
})

const could_be_recruit = () => {
  return props.type == 'npc' && props.can_be_recruited
}

const change_page = inject('change_page') as (page: string) => void
const characterData = inject('characterData') as Ref<CharacterData>
const recruit = inject('recruit') as (name: string) => Promise<void>
const change_selected_profile = () => {
  characterData.value.name = props.name
  characterData.value.profile = props.profile
  characterData.value.hp = props.hp
  characterData.value.level = props.level
  characterData.value.exp = props.exp
  characterData.value.expToNextLevel = props.expToNextLevel
  characterData.value.CON = props.CON
  characterData.value.DEX = props.DEX
  characterData.value.INT = props.INT
  characterData.value.skills = props.skills
  characterData.value.CombatAttribute = props.CombatAttribute
  characterData.value.type = props.type
  characterData.value.can_be_recruited = props.can_be_recruited
}

const handleClick = () => {
  if (props.disabled) {
    return
  }
  change_selected_profile()
  change_page('profile')
}
</script>

<style>
.custom-img {
  height: 70px;
  width: 70px;
}
.hp {
  height: 12px;
  width: 70px;
  background-color: #ff0000;
  font-size: 10px;
  color: white;
  text-align: center;
}
.name {
  width: 70px;
  text-align: center;
  font-size: 10px;
  color: black;
}
.mp {
  height: 12px;
  width: 70px;
  background-color: #0000ff;
  font-size: 10px;
  color: white;
  margin-top: 5px;
  text-align: center;
}
.mainProfile {
  display: flex;
  flex-direction: column;
  margin: 10px;
  background-color: rgba(255, 255, 255, 0.7);
}
.recruit-btn {
  background: rgba(60, 180, 231, 0.8);
  color: white;
}
</style>
