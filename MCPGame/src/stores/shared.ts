/* eslint-disable prettier/prettier */
import { defineStore } from 'pinia'
import { Message } from './Message';
//import { stat } from 'fs';

// 定义需要持久化的设置类型
interface PersistableSettings {
  baseurl: string;
  apikey: string;
  modelName: string;
  temperature:number;
  enable_thinking:boolean;
  stream:boolean;

  mini_model_baseurl: string;
  mini_model: string;
  mini_model_temperature:number;
  mini_model_apikey: string;
  mini_model_enable_thinking:boolean;
  mini_model_stream:boolean;
  async_dialogue: boolean;

  img_generation: boolean;
  img_generation_baseurl:string;
  img_generation_apikey:string;
  img_generation_model: string;

  MCP_Server:string;
  port:number;
}

// 定义需要持久化的对话历史
interface PersistableHistory {
  history:Message[];
  display_history:string[];
}

//保存页面
interface SaveSlot {
  id: number
  saved: boolean
  title: string
  time: string
  image: string
  chosen: boolean
}

interface PersistableSaveSlots{
  SaveSlots: SaveSlot[]
}

export interface SharedState {
  baseurl: string;
  apikey: string;
  modelName: string;
  temperature:number;
  enable_thinking:boolean;
  stream:boolean;

  mini_model_baseurl: string;
  mini_model_apikey: string;
  mini_model: string;
  mini_model_temperature:number;
  mini_model_enable_thinking:boolean;
  mini_model_stream:boolean;
  async_dialogue: boolean;

  img_generation: boolean;
  img_generation_baseurl:string;
  img_generation_apikey:string;
  img_generation_model: string;

  MCP_Server:string;
  port:number;

  history:Message[];
  display_history:string[];

  current_gold:number;
  backpackItems:Map<string,number>;

  saveslots:SaveSlot[];
}

export interface ClientPort {
  port:number
}

export const useSharedStore = defineStore('shared', {
  state: ():SharedState => ({
    baseurl: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
    apikey: "",
    modelName:"deepseek-r1",
    temperature:1,
    enable_thinking:false,
    stream:false,

    mini_model_baseurl: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
    mini_model_apikey: "",
    mini_model:"deepseek-r1-distill-llama-8b",
    mini_model_temperature:1,
    mini_model_enable_thinking:false,
    mini_model_stream:false,
    async_dialogue:false,

    img_generation:true,
    img_generation_baseurl:"https://dashscope.aliyuncs.com/compatible-mode/v1/",
    img_generation_apikey:"",
    img_generation_model:"wan2.2-t2i-plus",

    MCP_Server:"localhost",
    port:3000,
    //对话记录、显示记录
    history:[],
    display_history:[],

    //背包显示：
    current_gold:0,
    backpackItems:new Map([]),
    saveslots:[
      { id: 1, saved: false, title: '', time: '', image: '', chosen: false },
      { id: 2, saved: false, title: '', time: '', image: '', chosen: false },
      { id: 3, saved: false, title: '', time: '', image: '', chosen: false },
      { id: 4, saved: false, title: '', time: '', image: '', chosen: false },
      { id: 5, saved: false, title: '', time: '', image: '', chosen: false },
      { id: 6, saved: false, title: '', time: '', image: '', chosen: false }
    ]
  }),
  actions: {
    update_temperature(temp:number){
      this.temperature = temp;
    },

    update_minimodel_temperature(temp:number){
      this.mini_model_temperature = temp;
    },

    updateSettings(settings: {
      baseurl: string;
      apikey: string;
      modelName: string;
      temperature:number;
      enable_thinking:boolean;
      stream:boolean;

      mini_model_baseurl: string;
      mini_model: string;
      mini_model_temperature:number;
      mini_model_apikey: string;
      mini_model_enable_thinking:boolean;
      mini_model_stream:boolean;
      async_dialogue: boolean;

      img_generation: boolean;
      img_generation_baseurl:string;
      img_generation_apikey:string;
      img_generation_model: string;

      MCP_Server:string;
      port:number;
    }) {
      this.baseurl = settings.baseurl;
      this.apikey = settings.apikey;
      this.modelName = settings.modelName;
      this.temperature = settings.temperature;
      this.enable_thinking = settings.enable_thinking;
      this.stream = settings.stream;
      this.mini_model_baseurl = settings.mini_model_baseurl;
      this.mini_model = settings.mini_model;
      this.mini_model_temperature = settings.mini_model_temperature;
      this.mini_model_apikey = settings.mini_model_apikey;
      this.mini_model_enable_thinking = settings.mini_model_enable_thinking;
      this.mini_model_stream = settings.mini_model_stream;
      this.async_dialogue = settings.async_dialogue;
      this.img_generation = settings.img_generation;
      this.img_generation_baseurl = settings.img_generation_baseurl;
      this.img_generation_apikey = settings.img_generation_apikey;
      this.img_generation_model = settings.img_generation_model;
      this.MCP_Server = settings.MCP_Server;
      this.port = settings.port;
      },
      // 保存设置到文件
    async saveSettingsToFile() {
      try {
        if (window.api) {
          const settings: PersistableSettings = {
            baseurl:this.baseurl,
            apikey:this.apikey,
            modelName:this.modelName,
            temperature:this.temperature,
            enable_thinking:this.enable_thinking,
            stream:this.stream,
            mini_model_baseurl:this.mini_model_baseurl,
            mini_model:this.mini_model,
            mini_model_temperature:this.mini_model_temperature,
            mini_model_apikey:this.mini_model_apikey,
            mini_model_enable_thinking:this.mini_model_enable_thinking,
            mini_model_stream:this.mini_model_stream,
            async_dialogue:this.async_dialogue,
            img_generation:this.img_generation,
            img_generation_baseurl:this.img_generation_baseurl,
            img_generation_apikey:this.img_generation_apikey,
            img_generation_model:this.img_generation_model,
            MCP_Server:this.MCP_Server,
            port:this.port
          };

          await window.api.saveSettings(settings);
          console.log('设置已保存到文件');
        }
      } catch (error) {
        console.error('保存设置失败:', error);
      }
    },
    toJson(){
      // history和displayHistory单独处理
      return JSON.stringify({
      baseurl: this.baseurl,
      apikey: this.apikey,
      modelName: this.modelName,
      temperature: this.temperature,
      stream: this.stream,
      mini_model_baseurl: this.mini_model_baseurl,
      mini_model_apikey: this.mini_model_apikey,
      mini_model: this.mini_model,
      mini_model_temperature: this.mini_model_temperature,
      mini_model_stream: this.mini_model_stream,
      async_dialogue: this.async_dialogue,
      img_generation: this.img_generation,
      img_generation_baseurl: this.img_generation_baseurl,
      img_generation_apikey: this.img_generation_apikey,
      img_generation_model: this.img_generation_model,
      MCP_Server: this.MCP_Server,
      port: this.port,
      history: this.history.map(msg => JSON.parse(
        JSON.stringify({
          role: msg.role,
          content: msg.content
        })
      )),
      //display_history: this.display_history
    });
    },
    // 从文件加载设置
    async loadSettingsFromFile() {
      try {
        if (window.api) {
          const settings = await window.api.loadSettings();
          console.log("已从文件中读取！")
          if (settings) {

            this.$patch({
              baseurl: settings.baseurl ?? this.baseurl,
              apikey: settings.apikey ?? this.apikey,
              modelName: settings.modelName ?? this.modelName,
              temperature: settings.temperature ?? this.temperature,
              enable_thinking: settings.enable_thinking ?? this.enable_thinking,
              stream: settings.stream ?? this.stream,
              mini_model_baseurl: settings.mini_model_baseurl ?? this.mini_model_baseurl,
              mini_model: settings.mini_model ?? this.mini_model,
              mini_model_temperature: settings.mini_model_temperature ?? this.mini_model_temperature,
              mini_model_apikey: settings.mini_model_apikey ?? this.mini_model_apikey,
              mini_model_enable_thinking: settings.mini_model_enable_thinking ?? this.mini_model_enable_thinking,
              mini_model_stream: settings.mini_model_stream ?? this.mini_model_stream,
              async_dialogue: settings.async_dialogue ?? this.async_dialogue,
              img_generation: settings.img_generation ?? this.img_generation,
              img_generation_baseurl: settings.img_generation_baseurl ?? this.img_generation_baseurl,
              img_generation_apikey: settings.img_generation_apikey ?? this.img_generation_apikey,
              img_generation_model: settings.img_generation_model ?? this.img_generation_model,
              MCP_Server: settings.MCP_Server ?? this.MCP_Server,
              port: settings.port ?? this.port
            });
            console.log('设置已从文件加载');
            return true;
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
      return false;
    },
    // 保存history
    async saveHistory(index:number){
      try {
        if (window.api) {
          const history: PersistableHistory = {
            history:this.history,
            display_history:this.display_history
          };

          await window.api.saveHistory(JSON.stringify(history),index);
          console.log('进度已保存到文件');
        }
      } catch (error) {
        console.error('保存进度失败:', error);
      }
    },
    async loadHistory(index:number){
      try {
        if (window.api) {
          const history = await window.api.loadHistory(index);
          if (history) {
            this.history = history.history || this.history;
            this.display_history = history.display_history || this.display_history;
            console.log('历史已从文件加载');
            return true;
          }
        }
      } catch (error) {
        console.error('加载历史失败:', error);
      }
      return false;
    },
    async deleteHistory(index:number){
      try {
        if (window.api) {
          await window.api.deleteHistory(index);
        }
      } catch (error) {
        console.error('加载历史失败:', error);
      }
      return false;
    },

    //背包同步
    async update_backpack(){
      const response = await fetch(`http://${this.MCP_Server}:${this.port}/game/status`)
      const jsonData = await response.json()
      this.current_gold = jsonData.player.gold;
      this.backpackItems = new Map([]);
      jsonData.player._items.forEach((item) => {
        this.backpackItems.set(item[0].replace('item-',''),item[1])
      })
    },

    //SaveSlot
    async updateSaveSlot(){
      //此处在MCP_Server中保存“存档状态”
      const response = await fetch(`http://${this.MCP_Server}:${this.port}/save_slots`)
      const jsonData = await response.json()
      this.saveslots = jsonData
    },

    async save(id:number){
      const response = await fetch(`http://${this.MCP_Server}:${this.port}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({slot:id})
      })
      if(response.ok){
        return true;
      }else{
        return false;
      }
    },

    async load(id:number){
      const response = await fetch(`http://${this.MCP_Server}:${this.port}/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({slot:id})
      })
      if(response.ok){
        return true;
      }else{
        return false;
      }
    },

    async delete(id:number){
      const response = await fetch(`http://${this.MCP_Server}:${this.port}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({slot:id})
      })
      if(response.ok){
        return true;
      }else{
        return false;
      }
    },

    // 初始化存储 - 在应用启动时调用
    async initialize() {
      await this.loadSettingsFromFile();
    },
    getters: {
    // 获取需要持久化的设置
    persistableSettings: (state): PersistableSettings => ({
      baseurl: state.baseurl,
      apikey: state.apikey,
      modelName: state.modelName,
      temperature: state.temperature,
      enable_thinking: state.enable_thinking,
      stream: state.stream,
      mini_model_baseurl: state.mini_model_baseurl,
      mini_model: state.mini_model,
      mini_model_temperature:state.mini_model_temperature,
      mini_model_apikey: state.mini_model_apikey,
      mini_model_enable_thinking: state.mini_model_enable_thinking,
      mini_model_stream: state.mini_model_stream,
      async_dialogue: state.async_dialogue,
      img_generation: state.img_generation,
      img_generation_baseurl: state.img_generation_baseurl,
      img_generation_apikey: state.img_generation_apikey,
      img_generation_model: state.img_generation_model,
      MCP_Server: state.MCP_Server,
      port: state.port
      }),
    persistableHistory:(state):PersistableHistory => ({
      history:state.history,
      display_history:state.display_history
    }),
    persistableSaveSlots:(state):PersistableSaveSlots => ({
      SaveSlots: state.saveslots
    })
    }
  }
  })

export const ClientPortStore = defineStore('clientPort', {
  state: ():ClientPort => ({port:3001}),
  actions:{
    async getClientPort(){
      if (window.api) {
        const port = await window.api.getClientPort()
        this.port = port
      }
    }
  }
})
