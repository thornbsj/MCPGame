import { ElectronAPI } from '@electron-toolkit/preload'
import { Message } from 'src/stores/Message'

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IElectronAPI
  }
}

export interface IElectronAPI {
  saveSettings: (settings: unknown) => Promise<{ success: boolean; error?: string }>
  loadSettings: () => Promise<{
    baseurl?: string
    apikey?: string
    modelName?: string
    temperature?: number
    enable_thinking?: boolean
    stream?: boolean

    mini_model_baseurl?: string
    mini_model?: string
    mini_model_temperature?: number
    mini_model_apikey?: string
    mini_model_enable_thinking?: boolean
    mini_model_stream?: boolean
    async_dialogue?: boolean

    img_generation?: boolean
    img_generation_baseurl?: string
    img_generation_apikey?: string
    img_generation_model?: string

    MCP_Server?: string
    port?: number
  }>
  saveHistory: (settings: unknown, index: number) => Promise<{ success: boolean; error?: string }>
  loadHistory: (index: number) => Promise<{
    history?: Message[]
    display_history: string[]
  }>
  deleteHistory: (index: number) => void
  getClientPort: () => Promise<number>
}
