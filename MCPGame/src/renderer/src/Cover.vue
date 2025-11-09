<template>
  <div class="cover">
    <div class="BTNS">
      <ElButton type="success" class="setting_cover" @click="Start">开始游戏</ElButton>
      <ElButton type="success" class="setting_cover" @click="openSetting">设置</ElButton>
      <ElButton type="success" class="setting_cover" @click="load">读取游戏</ElButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { defineComponent } from 'vue'
import { ElButton } from 'element-plus'
import { inject } from 'vue'
const changePage = inject('change_page') as (page: string) => void;
const openSetting = () => {
  changePage('setting_cover')
};
const Start = () => {
  changePage('setting_cover_start')
};

const load = () => {
  changePage('load_cover')
};

</script>

<script lang="ts">
export default defineComponent({
  name: 'cover',
  components: { ElButton },
  methods: {
    data() {
      return {
        input: ''
      }
    }
  }
})
</script>
<style>
.cover {
  background-image: url('../../../resources/cover.png');
  background-size: 100% 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.setting_cover {
  width: 20%;
  margin-left: 40%;
  background-color: rgba(255, 255, 255, 0.5);
  margin-top: 20px;
}

</style>
