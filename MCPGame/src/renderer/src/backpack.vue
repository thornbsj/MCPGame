<template>
  <div class="backpack-overlay">
    <div class="backpack-container">
      <div class="backpack-header">
        <h1 class="backpack-title">背包</h1>
        <h1 class="backpack-title">金钱：{{ store.current_gold }}</h1>
        <button class="close-btn" @click="closeBackpack">关闭</button>
      </div>

      <!-- 物品网格 -->
      <div class="items-grid">
        <div
          v-for="([name, quantity], k) in store.backpackItems"
          :key="k"
          class="item-card"
          :class="{ selected: selectedItem === name }"
          @click="selectItem(name)"
        >
          <div class="item-icon">{{ getItemIcon(name) }}</div>
          <div v-if="quantity > 1" class="item-quantity">{{ quantity }}</div>
        </div>
      </div>

      <!-- 物品详情 -->
      <div class="item-details">
        <h3 class="details-title">物品详情</h3>
        <div v-if="store.backpackItems.size > 0" class="details-content">
          <p v-if="selectedItem">
            {{ selectedItem.split('*#*#*')[0] }} - {{ store.backpackItems.get(selectedItem) }}个
            <br />
            {{ getItemDescription(selectedItem) }}
          </p>
          <p v-else class="no-selection">请选择一个物品查看详情</p>
        </div>
        <div v-else class="details-content">
          <p>你的行囊空空如也，还没有任何东西。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { useSharedStore } from '../../stores/shared'

// 使用Pinia store
const store = useSharedStore()
const selectedItem = ref<string | null>(null)
// const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')
// let syncInterval: number | null = 500
// 选择物品
const selectItem = (itemName: string) => {
  selectedItem.value = itemName
}

// 获取物品图标
const getItemIcon = (itemName: string) => {
  let name = itemName.split('*#*#*')[0]
  if (name.length > 5) {
    name = name.slice(0, 5) + '...'
  }
  return name // 简单返回名称前两个字符作为图标
}

// 获取物品描述
const getItemDescription = (itemName: string) => {
  return itemName.split('*#*#*')[1] || '暂无物品描述。'
}
const changePage = inject('change_page') as (page: string) => void
// 关闭背包
const closeBackpack = () => {
  changePage('game')
}

// 同步背包数据
// const syncBackpackData = async () => {
//   if (syncStatus.value === 'syncing') return // 防止重复调用
//   syncStatus.value = 'syncing'
//   try {
//     await store.update_backpack()
//     syncStatus.value = 'success'
//     // 0.1秒后恢复为idle状态
//     setTimeout(() => {
//       if (syncStatus.value === 'success' || syncStatus.value === 'error') {
//         syncStatus.value = 'idle'
//       }
//     }, 100)
//   } catch (error) {
//     console.error('同步背包数据失败:', error)
//     syncStatus.value = 'error'
//   }
// }

// 启动自动同步
// const startAutoSync = () => {
//   syncBackpackData()

//   syncInterval = window.setInterval(() => {
//     syncBackpackData()
//   }, 500)
// }

// onMounted(() => {
//   startAutoSync()
// })
</script>

<style>
/* 背景模糊和蒙版 */
.backpack-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
}

/* 背包容器 */
.backpack-container {
  width: 90%;
  height: 90%;
  max-width: 900px;
  background: rgba(30, 30, 46, 0.85);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 标题区域 */
.backpack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.backpack-title {
  font-size: 28px;
  font-weight: bold;
  color: #f39c12;
  text-shadow: 0 0 5px rgba(243, 156, 18, 0.5);
}

.close-btn {
  background: rgba(231, 76, 60, 0.8);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s;
}

.close-btn:hover {
  background: rgba(231, 76, 60, 1);
}

.close-btn:disabled {
  background: rgba(231, 77, 60, 0.518);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

.close-btn:disabled:hover {
  transform: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

/* 物品网格 */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
}

/* 滚动条样式 */
.items-grid::-webkit-scrollbar {
  width: 8px;
}

.items-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.items-grid::-webkit-scrollbar-thumb {
  background: #f39c12;
  border-radius: 4px;
}

.items-grid::-webkit-scrollbar-thumb:hover {
  background: #e67e22;
}

/* 物品卡片 */
.item-card {
  background: rgba(52, 73, 94, 0.7);
  color: white;
  border-radius: 8px;
  padding: 15px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

.item-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border-color: #f39c12;
}

.item-card.selected {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.2);
}

.item-icon {
  font-size: 20px;
  margin-bottom: 8px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 5px;
}

.item-quantity {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: rgba(231, 76, 60, 0.9);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
}

/* 物品详情 */
.item-details {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  padding: 20px;
  min-height: 150px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.details-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #f39c12;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.details-content {
  font-size: 16px;
  line-height: 1.5;
  color: #f39c12;
}

.no-selection {
  color: #7f8c8d;
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .backpack-container {
    width: 95%;
    padding: 15px;
  }

  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 10px;
  }

  .item-card {
    padding: 10px 5px;
    min-height: 80px;
  }

  .item-icon {
    font-size: 24px;
  }

  .item-name {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  }

  .item-card {
    min-height: 70px;
  }

  .item-icon {
    font-size: 20px;
  }
}
</style>
