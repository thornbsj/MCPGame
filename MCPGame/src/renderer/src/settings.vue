<template>
  <div class="setting-container">
    <ElText class="tip"> API设置（OpenAI兼容的BaseUrl） </ElText>
    <input v-model="localSettings.baseurl" class="input_infos" />

    <ElText class="tip"> API秘钥 </ElText>
    <input v-model="localSettings.apikey" class="input_infos" type="password" />

    <ElText class="tip"> 模型名称（必须支持工具调用） </ElText>
    <input v-model="localSettings.modelName" class="input_infos" />

    <ElText class="tip"> 模型列表 </ElText>
    <select v-model="main_model" class="input_infos" @change="update_model('main', main_model)">
      <option v-for="model in model_list" :key="model" :value="model">
        {{ model }}
      </option>
    </select>

    <ElText :class="connect_test_succuess.main_model_class">
      {{ connect_test_succuess.main_model }}
    </ElText>

    <div class="slider-container">
      <div class="slider-wrapper">
        温度（0~1.999）：
        <input
          v-model="localSettings.temperature"
          type="range"
          class="slider"
          :min="0"
          :max="2"
          :step="0.001"
        />
        <input
          v-model.number="localSettings.temperature"
          type="number"
          class="temperature-input"
          :min="0"
          :max="2 - 0.001"
          :step="0.001"
          @change="updateFromInput"
        />
      </div>
    </div>

    <ElCheckbox v-model="localSettings.stream" label="流式输出" class="input_infos" />

    <ElText class="tip"> 小模型API设置（OpenAI兼容的BaseUrl） </ElText>
    <input v-model="localSettings.mini_model_baseurl" class="input_infos" />

    <ElText class="tip"> 小模型API秘钥 </ElText>
    <input v-model="localSettings.mini_model_apikey" class="input_infos" type="password" />

    <ElText class="tip"> 小模型名称；用以异步对话决定是否开口以及生成敌人（必须支持工具调用） </ElText>
    <input v-model="localSettings.mini_model" class="input_infos" />

    <ElText class="tip"> 模型列表 </ElText>
    <select v-model="mini_model" class="input_infos" @change="update_model('mini', mini_model)">
      <option v-for="model in mini_model_list" :key="model" :value="model">
        {{ model }}
      </option>
    </select>

    <ElText :class="connect_test_succuess.mini_model_class">
      {{ connect_test_succuess.mini_model }}
    </ElText>
    <div class="slider-container">
      <div class="slider-wrapper">
        温度（0~1.999）：
        <input
          v-model="localSettings.mini_model_temperature"
          type="range"
          class="slider"
          :min="0"
          :max="2"
          :step="0.001"
        />
        <input
          v-model.number="localSettings.mini_model_temperature"
          type="number"
          class="temperature-input"
          :min="0"
          :max="2 - 0.001"
          :step="0.001"
          @change="updateFromInput_mini"
        />
      </div>
    </div>

    <ElCheckbox v-model="localSettings.mini_model_stream" label="流式输出" class="input_infos" />

    <ElCheckbox
      v-model="localSettings.async_dialogue"
      label="使用异步对话（此功能正在开发，且预计会不断产生Token……）"
      class="input_infos"
      disabled
    />

    <ElCheckbox v-model="localSettings.img_generation" label="使用文生图 （暂时只支持通义万相）" class="input_infos" />

    <ElText class="tip"> 文生图API设置（暂时只支持通义万相） </ElText>
    <input v-model="localSettings.img_generation_baseurl" class="input_infos" disabled />

    <ElText class="tip"> 文生图API秘钥 </ElText>
    <input v-model="localSettings.img_generation_apikey" class="input_infos" type="password" />

    <ElText class="tip"> 文生图模型名称 </ElText>
    <input v-model="localSettings.img_generation_model" class="input_infos" />

    <ElText :class="connect_test_succuess.img_model_class">
      {{ connect_test_succuess.img_model }}
    </ElText>

    <ElText class="tip"> MCP服务器 </ElText>
    <input v-model="localSettings.MCP_Server" class="input_infos" />

    <ElText class="tip"> MCP服务器端口 </ElText>
    <input v-model="localSettings.port" class="input_infos" />

    <ElButton type="success" class="test_connection" @click="test_connection">测试连接</ElButton>
    <ElButton type="success" class="backToGame" @click="backToGame">保存</ElButton>
    <ElButton type="success" class="backToGame" @click="StartGame" v-show="props.father_page == 'cover_start'">开始游戏</ElButton>
  </div>
</template>
<script setup lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { ElText, ElCheckbox, ElButton } from 'element-plus'
import { inject } from 'vue'
import { useSharedStore } from '../../stores/shared'

const sharedStore = useSharedStore()

const localSettings = ref({
  baseurl: '',
  apikey: '',
  modelName: '',
  temperature: 1,
  enable_thinking: false,
  stream: false,
  mini_model_baseurl: '',
  mini_model: '',
  mini_model_temperature: 1,
  mini_model_apikey: '',
  mini_model_enable_thinking: false,
  mini_model_stream: false,
  async_dialogue: false,
  img_generation: false,
  img_generation_baseurl: '',
  img_generation_apikey: '',
  img_generation_model: '',
  MCP_Server: '',
  port: 3000
})

const connect_test_succuess = ref({
  main_model: '',
  mini_model: '',
  img_model: '',
  main_model_class: '',
  mini_model_class: '',
  img_model_class: ''
})

const model_list = ref([''])
const mini_model_list = ref([''])

const main_model = ref('')
const mini_model = ref('')

onMounted(async () => {
  await sharedStore.loadSettingsFromFile()
  console.log(sharedStore.img_generation)
  localSettings.value = {
    baseurl: sharedStore.baseurl,
    apikey: sharedStore.apikey,
    modelName: sharedStore.modelName,
    temperature: sharedStore.temperature,
    enable_thinking: sharedStore.enable_thinking,
    stream: sharedStore.stream,
    mini_model_baseurl: sharedStore.mini_model_baseurl,
    mini_model: sharedStore.mini_model,
    mini_model_temperature: sharedStore.mini_model_temperature,
    mini_model_apikey: sharedStore.mini_model_apikey,
    mini_model_enable_thinking: sharedStore.mini_model_enable_thinking,
    mini_model_stream: sharedStore.mini_model_stream,
    async_dialogue: sharedStore.async_dialogue,
    img_generation: sharedStore.img_generation,
    img_generation_baseurl: sharedStore.img_generation_baseurl,
    img_generation_apikey: sharedStore.img_generation_apikey,
    img_generation_model: sharedStore.img_generation_model,
    MCP_Server: sharedStore.MCP_Server,
    port: sharedStore.port
  }
})

const saveSettings = () => {
  sharedStore.updateSettings({
    baseurl: localSettings.value.baseurl,
    apikey: localSettings.value.apikey,
    modelName: localSettings.value.modelName,
    temperature: localSettings.value.temperature,
    enable_thinking: localSettings.value.enable_thinking,
    stream: localSettings.value.stream,
    mini_model_baseurl: localSettings.value.mini_model_baseurl,
    mini_model: localSettings.value.mini_model,
    mini_model_apikey: localSettings.value.mini_model_apikey,
    mini_model_enable_thinking: localSettings.value.mini_model_enable_thinking,
    mini_model_stream: localSettings.value.mini_model_stream,
    async_dialogue: localSettings.value.async_dialogue,
    img_generation: localSettings.value.img_generation,
    img_generation_baseurl: localSettings.value.img_generation_baseurl,
    img_generation_apikey: localSettings.value.img_generation_apikey,
    img_generation_model: localSettings.value.img_generation_model,
    MCP_Server: localSettings.value.MCP_Server,
    port: localSettings.value.port,
    mini_model_temperature: 0
  })
  sharedStore.saveSettingsToFile()
}

const updateFromInput = () => {
  // 确保值在有效范围内
  if (localSettings.value.temperature.toString().length == 0) {
    localSettings.value.temperature = 0
  }
  if (localSettings.value.temperature < 0) {
    localSettings.value.temperature = 0
  } else if (localSettings.value.temperature >= 2) {
    localSettings.value.temperature = 1.999
  }
}

const updateFromInput_mini = () => {
  // 确保值在有效范围内
  if (localSettings.value.mini_model_temperature.toString().length == 0) {
    localSettings.value.mini_model_temperature = 0
  }
  if (localSettings.value.mini_model_temperature < 0) {
    localSettings.value.mini_model_temperature = 0
  } else if (localSettings.value.mini_model_temperature >= 2) {
    localSettings.value.mini_model_temperature = 1.999
  }
}

// interface Props {
//   father_page: string
// }
const changePage = inject('change_page') as (page: string) => void
const props = defineProps<{
  father_page: string
}>()
const backToGame = () => {
  saveSettings()
  if (props.father_page === 'cover') {
    changePage('cover')
  } else if (props.father_page === 'cover_start') {
    changePage('cover')
  } else {
    changePage('game')
  }
}
const StartGame = () => {
  saveSettings()
  changePage('start')
}

const test_connection = async () => {
  testConnectionWithFetch(localSettings.value.baseurl, 'main')
  testConnectionWithFetch(localSettings.value.baseurl, 'mini')
  if (localSettings.value.img_generation) {
    testConnectionWithFetch(localSettings.value.baseurl, 'img')
  }
}

const testConnectionWithFetch = async (baseUrl: string, test_type: string) => {
  const success_info = '连接测试成功'
  const failed_info = '连接测试失败'
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const url = `${baseUrl}/models`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + localSettings.value.apikey
      }
    })

    if (response.ok) {
      const data = await response.json()
      const modelIds = data.data.map((model) => model.id)
      show_connection_info(test_type, success_info, 'test_success')
      if (test_type == 'main' || test_type == 'mini') {
        update_model_list(modelIds, test_type)
      }
    } else {
      show_connection_info(test_type, failed_info, 'test_failed')
    }
  } catch (error) {
    show_connection_info(test_type, failed_info, 'test_failed')
  }
}

const update_model_list = (modelIds: string[], test_type: string) => {
  try {
    if (test_type == 'main') {
      model_list.value.length = 0
      modelIds.forEach((element) => {
        model_list.value.push(element)
      })
    } else if (test_type == 'mini') {
      mini_model_list.value.length = 0
      modelIds.forEach((element) => {
        mini_model_list.value.push(element)
      })
    }
  } catch (error) {
    return
  }
}

const show_connection_info = (test_type: string, info: string, class_name: string) => {
  try {
    if (test_type == 'main') {
      connect_test_succuess.value.main_model = info
      connect_test_succuess.value.main_model_class = class_name
    } else if (test_type == 'mini') {
      connect_test_succuess.value.mini_model = info
      connect_test_succuess.value.mini_model_class = class_name
    } else {
      connect_test_succuess.value.img_model = info
      connect_test_succuess.value.img_model_class = class_name
    }
  } catch (error) {
    return
  }
}

const update_model = (change_type: string, model_name: string) => {
  if (change_type == 'main') {
    localSettings.value.modelName = model_name
  } else {
    localSettings.value.mini_model = model_name
  }
}
</script>

<script lang="ts">
export default defineComponent({
  name: 'Settings',
  components: { ElText, ElCheckbox, ElButton },
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
.setting-container {
  background-image: url('../../../resources/bluesky.png');
  background-size: 100% 100%;
  /* display: flex; */
  flex-direction: column;
  justify-content: center;
  overflow: auto;
}
.input_infos {
  margin-bottom: 10px;
  opacity: 0.7;
  background-color: white;
  display: flex;
  width: 100%;
}
.backToGame {
  width: 20%;
  margin-left: 40%;
  background-color: transparent;
}

.test_connection {
  width: 20%;
  margin-left: 40%;
  background-color: transparent;
}

.slider-container {
  margin-bottom: 30px;
}
.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 10px;
}
.slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
  border-radius: 3px;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.test_success {
  color: green;
}
.test_failed {
  color: red;
}
</style>
