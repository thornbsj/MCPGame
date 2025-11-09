// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia' // 导入 createPinia
import App from './App.vue'
import { ClientPortStore, useSharedStore } from '../../stores/shared';

// 创建 Pinia 实例
const pinia = createPinia()

// 创建 Vue 应用
const app = createApp(App)

// 安装 Pinia 插件
app.use(pinia)

// 读端口
const clientstore = ClientPortStore()
await clientstore.getClientPort()
// 挂载应用
app.mount('#app')
const sharedStore = useSharedStore()
sharedStore.initialize()
