/* eslint-disable prettier/prettier */
import {
  Agent,
  run,
  MCPServerStreamableHttp,
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled,
  UserMessageItem,
  AssistantMessageItem,
  SystemMessageItem,
  AgentInputItem
} from '@openai/agents'
import AsyncOpenAI from 'openai'
import defaultConfig from './configs';
import { textToImage } from './Text2Img';
import img_dict from './img_profiles';
import Message from './Message'
import { SharedState } from './settings';

export interface NPC_card{
  profile: string
  hp: number
  name: string
  type: string
}


export class Dialogue {

  constructor(
	  private settings: SharedState,
    private openai:AsyncOpenAI|undefined = undefined,
    private openai_mini:AsyncOpenAI|undefined = undefined,
    private mcpServer_Main:MCPServerStreamableHttp|undefined = undefined,
    private mcpServer_NPC:MCPServerStreamableHttp|undefined = undefined,
    private mcpServer_tiny:MCPServerStreamableHttp|undefined = undefined,
    private agent:Agent|undefined = undefined,
    private agent_mini:Agent|undefined = undefined,
    private agent_NPC:Agent|undefined = undefined, //暂时没用，因为和NPC对话的模型与正常指令模式的模型是一样的
    private agent_tiny:Agent|undefined = undefined,
    private stream = true
  ){
    this.openai = new AsyncOpenAI(
      {
          apiKey: this.settings.apikey,
          baseURL: this.settings.baseurl,
          dangerouslyAllowBrowser: true
      }
    )

    this.openai_mini = new AsyncOpenAI(
    {
        apiKey: this.settings.mini_model_apikey,
        baseURL: this.settings.mini_model_baseurl,
        dangerouslyAllowBrowser: true
    }
    )

    this.mcpServer_Main = new MCPServerStreamableHttp({
      url: `http://${this.settings.MCP_Server}:${this.settings.port}/mcp`,
      name: '游戏主系统',
    })


    this.mcpServer_NPC = new MCPServerStreamableHttp({
      url: `http://${this.settings.MCP_Server}:${this.settings.port}/NPCMCP`,
      name: 'NPC系统',
    })

    this.mcpServer_tiny = new MCPServerStreamableHttp({
      url: `http://${this.settings.MCP_Server}:${this.settings.port}/TinyMCP`,
      name: '小模型MCP',
    })

    setTracingDisabled(true)
    setDefaultOpenAIClient(this.openai)
    setOpenAIAPI('chat_completions')
    this.mcpServer_Main.connect()
    this.mcpServer_NPC.connect()
    this.mcpServer_tiny.connect()
  }

  private async setBuiltPromptFalse(){
    try{
      await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/set_built_Prompt_false`)
    } catch(error){
      console.log(`清空广播状态失败：${error}`)
    }
  }

  private async getBuiltPrompt(){
    try{
      const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/built_Prompt`)
      const res = await response.json()
      const isBuilt:boolean = res.isBuilt
      return isBuilt
    } catch(error){
      console.log(`清空广播状态失败：${error}`)
      return false
    }
  }

  //指令模式
  public async Command_dialogue(ipt: string,initialize_Prompt:boolean = false) {
    try {
      await this.setBuiltPromptFalse()
      const res:AgentInputItem[]=[];
      (await this.buildPrompt(ipt,initialize_Prompt)).forEach(value => {
        if(value.role == "system"){
          const s:SystemMessageItem = {role:"system",content:value.content};
          res.push(s)
        }else if(value.role == "user"){
          const s:UserMessageItem = {role:"user",content:value.content};
          res.push(s);
        }else{
          const s:AssistantMessageItem={role:"assistant",status:"completed",content:[{type:"output_text",text:value.content}]};
          res.push(s);
        }
      })
      if(this.mcpServer_Main===undefined){
        return
      }
      console.log('开始')
      await this.mcpServer_Main.connect()
      console.log('链接MCP完成')
      this.agent = new Agent({
        name: 'Agent',
        instructions:
          '你不再是一个LLM Assistant，而是一个智能的文字冒险游戏系统，现在请你智能地调用MCP中的函数。',
        mcpServers: [this.mcpServer_Main],
        model: this.settings.modelName
      })
      const res_msg = await this.get_LLM_result(this.agent,res);
      const res_Message = new Message("assistant",res_msg??"")
      const ipt_Message = new Message("user",ipt??"")
      if(!initialize_Prompt){
        this.settings.history.push(ipt_Message)
      }
      if(!initialize_Prompt){
        this.settings.display_history.push(ipt)
      }
      this.settings.history.push(res_Message)
      this.settings.display_history.push(res_msg??"...")
      await this.mcpServer_Main.close()
      // 处理对话后的其他信息(广播给NPC(已使用NPC MCP中的函数)->是否有Betrayal)
      const isBuiltPrompt = await this.getBuiltPrompt()
      // let still_need_respond = false
      // let maxixmum_iteration = 3
      if(!initialize_Prompt && isBuiltPrompt){
        await this.NPCs_respond()
        // still_need_respond = true
      }
      // 想要文生图的情形：
      if(this.settings.img_generation){
        const s:AssistantMessageItem={role:"assistant",status:"completed",content:[{type:"output_text",text:res_msg}]};
        res.push(s)
        const prompt_for_img = await this.get_prompt_for_img(res)
        if(prompt_for_img != undefined && prompt_for_img.length > 0){
          console.log(`触发文生图! Prompt: ${prompt_for_img}`)
          const res_img = await this.get_img(prompt_for_img)
          this.settings.display_history.push(res_img)
        }
      }
      await this.setBuiltPromptFalse()
      // 暂时不考虑“玩家杀死NPC1后NPC2又因此倒戈的情况”
      // while(still_need_respond && maxixmum_iteration>=0){
      //   still_need_respond = await this.check_battle();
      //   maxixmum_iteration -= 1
      // }
    }catch(error){
      console.log(error)
      await this.setBuiltPromptFalse()
    }
  }

  public async set_player_profile(ipt: string){
    let res = ""
    if(this.settings.img_generation){
      res = await this.get_img(ipt)
    }
    if(res == ''){
      const profile_idx = Math.floor(Math.random() * (28)); //0~27内随便选
      res = img_dict.img_base64.get(`img_${profile_idx}_left`) ?? img_dict.img_base64.get(`img_0_left`)!
    }
    const response_add = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/setProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({name:'self',profile:res})
    })
  }

  private async get_LLM_result(agent: Agent<unknown, "text">, his){
    let fullText = '';
    const response_before = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
    const jsonData_before = await response_before.json()
    const world_before_cmd = jsonData_before.current_world
    if(this.stream){
        const result = await run(agent, his,
        {stream:true});
        const stream = result.toTextStream({compatibleWithNodeStreams: true,})
        await new Promise((resolve, reject) => {
          stream.on('data', (chunk) => {
            fullText += chunk;
          });
          stream.on('end', resolve);
          stream.on('error', reject);
        });
      }else{
        const result = await run(agent, his);
        fullText = result.finalOutput??"";
      }
    const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
    const jsonData = await response.json()
    if(jsonData.current_world != world_before_cmd){
      this.settings.history.length=0
    }
    return fullText;
  }

  private async buildPrompt(ipt: string,initialize_Prompt:boolean = false) {
    const res = [...this.settings.history]
    const prompt = await this.build_Prompt_from_status(initialize_Prompt);
    res.push(
        new Message('user', ipt),
        new Message('system', prompt)
    )
    return res;
  }

  private async build_Prompt_from_status(initialize:boolean = false) {
      try {
        let res = defaultConfig.systemPrompt + '\n'
        const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
        const jsonData = await response.json()
        const quests: string = jsonData.quests
        const ego = jsonData.player.EGO
        //const partys = new Map(jsonData.player._partys)
        // 平均状态 hp/等级/三维/金钱
        try{
          let level = jsonData.player.level
          let CON = jsonData.player.CON
          let DEX = jsonData.player.DEX
          let INT = jsonData.player.INT
          const gold = jsonData.player.gold
          let denominator = 1

          
          jsonData.player._partys.forEach(x => {
            //hp += x.hp;
            level += x.level;
            CON += x.CON;
            DEX += x.DEX;
            INT += x.INT;
            denominator += 1;
          });

        //hp = Math.ceil(hp/denominator*100)/100;
        level = Math.ceil(level/denominator*100)/100;
        CON = Math.ceil(CON/denominator*100)/100;
        DEX = Math.ceil(DEX/denominator*100)/100;
        INT = Math.ceil(INT/denominator*100)/100;

        res += `\n**玩家队伍状态**:\n`
        res += `平均等级：${level}\n平均体质：${CON}\n平均感知：${DEX}\n平均智力：${INT}\n金钱：${gold}\n\n`
        } catch (error){
          console.log("获取玩家队伍状态失败：")
          console.log(error)
        }
        
        try{
          if (quests.length > 0) {
            res += `**任务信息**:\n`
            res += `现在玩家的任务有：${quests}\n\n`
          }
        } catch (error){
          console.log("获取任务状态失败：")
          console.log(error)
        }
        
        try{
          if (jsonData.NPCs.length > 0) {
            const npc_names:string[] = []
            jsonData.NPCs.forEach(x => npc_names.push(x.name))
            res += `**NPC信息**:\n`
            res += `当前已经生成了以下NPC：${npc_names}\n\n`
          }
        } catch (error){
          console.log("获取NPC信息失败：")
          console.log(error)
        }
        
        try{
          if (jsonData.player._partys.length > 0) {
            res += `**队友信息**:\n`
            res += `现在的玩家有以下队友：${jsonData.player._partys.map(p => p.name).join(",")}\n\n`
          }
        } catch (error){
          console.log("获取队友信息失败：")
          console.log(error)
        }

        try{
          if(jsonData.player._skills.length>0)
          {
            res += `**技能信息**:\n`
            res += `现在玩家有以下技能：`
            jsonData.player._skills.forEach((s: { name: string; description: string; dependent: string; })=>{
              res+=s.name+','
            });
            res = res.slice(0,res.length-1)+"\n\n"
          }
          if(jsonData.player._partys.length>0){
            res += `队友技能信息：\n`
          }
          for(let i=0;i<jsonData.player._partys.length;i++){
            res += jsonData.player._partys[i].name + ":"
            for (const s of jsonData.player._partys[i]._skills) {
              res += s.name + ','
            }
            res = res.slice(0,res.length-1)+"\n\n"
          }
        } catch (error){
          console.log("获取技能信息失败：")
          console.log(error)
        }
        try{
          res += `**世界观信息**:\n`
          res += `现在玩家位于的世界的世界观如下：\n${jsonData.current_worldview} \n`

          if(jsonData.summaryLogs.length>0){
            res += `**重要历史信息**：\n${Array.from(jsonData.summaryLogs)}\n`
          }
        } catch (error){
          console.log("获取世界观信息失败：")
          console.log(error)
        }
        
        try{
          if(jsonData.summaryLog_NPC.length>0){
            res += `**NPC相关重要历史信息**：\n${Array.from(jsonData.summaryLog_NPC)}`
          }
          if(jsonData.current_world!='奇点侦测站'){
            res += `**“自我值”信息**:\n`
            if (ego >= 70) {
              res += defaultConfig.Prompt_with_Ego
            } else if (ego >= 30) {
              res += defaultConfig.Prompt_with_Less_Ego
            } else {
              res += defaultConfig.Prompt_without_Ego
            }
          }

          if(initialize){
            res+="\n"+defaultConfig.initialize_Prompt+"\n"
          }
        } catch (error){
          console.log("获取历史信息失败：")
          console.log(error)
        }

        console.log(res)
        return res
      } catch (error) {
        console.error(error)
        return ""
      }
    }

  //对话相关
  public async public_talk(ipt:string){
    try {
      // 公共喊话
      const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
      const jsonData = await response.json()
      const npcs:string[] = [];
      for(const npc of jsonData.player._partys){
        npcs.push(npc.name)
      }
      for(const npc of jsonData.npcs){
        npcs.push(npc.name)
      }
      if(npcs.length>0){
        this.settings.display_history.push(`${jsonData.player.name}:${ipt}`)
        const npcPromises = npcs.map(npc => this.Talk_To_NPC(npc,ipt));
        const results = await Promise.all(npcPromises);

        // 首先加入历史
        for(const npc of npcs) {
          const response_add = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/addPrompt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({name:npc,speaker:jsonData.player.name, message:ipt, mode: "public"})
          })
          const add_result = await response_add.json()
          // if(!add_result.ok){
          //   console.log(`失败：为${npc}加入玩家对话历史`)
          // }

          await this.NPCs_broadcast(npc,npcs,results)

        }
        // Betrayal处理
        let still_need_respond = await this.check_battle();
        let maxixmum_iteration = 3
        while(still_need_respond && maxixmum_iteration>=0){
          still_need_respond = await this.check_battle();
          maxixmum_iteration -= 1
        }
      }
    }catch(error){
      console.log(`公共聊天出错！${error}`)
    }
  }

  public async private_talk(npc:string,ipt:string){
    try{
      // 私聊
      const result = await this.Talk_To_NPC(npc,ipt,'private')

      const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
      const jsonData = await response.json()

      // 首先加入历史
      const response_add = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/addPrompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({name:npc,speaker:jsonData.player.name, message:ipt, mode: "private"})
      })
      const add_result = await response_add.json()

      const response_npc = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/addPrompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({name:npc,speaker:npc, message:result, mode: "private"})
      })
      console.log(result)
      return result
    }catch(error){
      console.log(`私人聊天出错！${error}`)
      return null
    }
  }

  private async check_battle(){
    try
      {const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/checkBetrayal`)
      const jsonData = await response.json()
      if(jsonData === null){
        return false
      }else{
        // 进入Battle页面（待定）
      //   const changePage = inject('change_page') as (page: string) => void;
      //   const update_battleProcess = inject('update_battleProcess') as (jsonDataString: string) => void;
      //   changePage('battle');
      //   update_battleProcess(jsonData)
        // respond
        await this.NPCs_respond()
        return true
      }}catch(error){
        console.log(`检查战斗出错！${error}`)
        return false
      }
  }

  private async NPCs_broadcast(npc:string,npcs:string[],results:string[]){
    try{
      let my_response = ""
      if(npcs.length != results.length) return
      for (let idx=0;idx<npcs.length;idx++){
        const responser = npcs[idx]
        if(responser == npc){
          my_response = results[idx] ?? ""
        }else{
          const response_npc = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/addPrompt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({name:npc,speaker:responser, message:results[idx], mode: "public"})
          })
          const npc_result = await response_npc.json()
          // if(!npc_result.ok){
          //   console.log(`失败：为${npc}加入${responser}对话历史`)
          // }
        }
      }
      //最后将自己的回复加入作为assistance
      await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/addPrompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({name:npc,speaker:npc, message:my_response, mode: "public"})
      })
      // if(!npc_result.ok){
      // console.log(`失败：为${npc}加入自己的回复`)
      // }
      this.settings.display_history.push(`<NPC_respond>${npc}:${my_response}</NPC_respond>`)
    }catch(error){
      console.log(`广播出错！${error}`)
    }
  }

  private async NPCs_respond(){
    // 各个NPC对于玩家行为的回复
    const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
    const jsonData = await response.json()
    const npcs:string[] = [];
    for(const npc of jsonData.player._partys){
      npcs.push(npc.name)
    }
    for(const npc of jsonData.NPCs){
      npcs.push(npc.name)
    }
    if(npcs.length>0){
      const npcPromises = npcs.map(npc => this.Talk_To_NPC(npc,''))
      const results = await Promise.all(npcPromises);
      // 将npc的话广播给其他npc
      for (const npc of npcs) {
        await this.NPCs_broadcast(npc,npcs,results)
      }
    }
  }

  private async get_history(name,mode):Promise<AgentInputItem[]>{
    const prompt = await this.get_NPC_prompt(name,mode);
    const input_item:AgentInputItem[] = [];
    prompt.forEach((value: { role: string; content; }) => {
      if(value.role == "system"){
        const s:SystemMessageItem = {role:"system",content:value.content};
        input_item.push(s)
      }else if(value.role == "user"){
        const s:UserMessageItem = {role:"user",content:value.content};
        input_item.push(s);
      }else{
        const s:AssistantMessageItem={role:"assistant",status:"completed",content:[{type:"output_text",text:value.content}]};
        input_item.push(s);
      }
    });
    return input_item
  }

  public async Talk_To_NPC(name:string ,ipt:string, mode:string = "public"){
    try{
      const input_item:AgentInputItem[] = await this.get_history(name,mode)
      const s:UserMessageItem = {role:"user",content:ipt};
      if(ipt.length>0){
        input_item.push(s); //为空时代表处理“其他行为后是否有连锁反应”
      }
      let is_talk:boolean = true
      if(mode == "public"){
        is_talk = await this.decide_to_talk(input_item);
      }
      if(is_talk && this.mcpServer_NPC){
        try{
          this.mcpServer_NPC.connect()
          this.agent = new Agent({
            name: 'Agent',
            instructions:
              '你不再是一个LLM Assistant，而是一个智能的文字冒险游戏中的NPC。',
            mcpServers: [this.mcpServer_NPC],
            model: this.settings.modelName
          })
          const res_msg =await this.get_LLM_result(this.agent,input_item);
          await this.mcpServer_NPC.close()
          return res_msg
        }
        catch(error){
          console.log(error)
          return ""
        }
      }else{
        return ""
      }
    }catch(error){
      console.log(`对话出错！${error}`)
      return ""
    }
  }

  private async decide_to_talk(his:AgentInputItem[]){
    const DECIDE_TO_TALK:SystemMessageItem = {role:"system",content:defaultConfig.DECIDE_TO_TALK_prompt}
    const tmp_his = [...his]
    tmp_his.push(DECIDE_TO_TALK)
    this.agent_mini = new Agent({
      name: 'Agent',
      instructions:
      '你不再是一个LLM Assistant，而是一个智能的文字冒险游戏系统。',
      //mcpServers: [this.mcpServer_tiny],
      model: this.settings.mini_model
    })
    const res_msg =await this.get_LLM_result(this.agent_mini,tmp_his);
    if(res_msg == "是"){
      return true
    }else{
      return false
    }
  }

  private async get_NPC_prompt(name:string,mode:string = "public"){
    const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/getprompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({name, mode})
    })
    const jsonData = await response.json()
    return jsonData
  }

  //图像
  private async get_img(prompt:string){
    const res = await textToImage(this.settings, prompt,500,500)
    return res
  }

  private async get_prompt_for_img(his:AgentInputItem[]){
    const DECIDE_TO_img:SystemMessageItem = {role:"system",content:defaultConfig.DECIDE_TO_img_prompt}
    his.push(DECIDE_TO_img)
    this.agent_mini = new Agent({
      name: 'Agent',
      instructions:
      '你不再是一个LLM Assistant，而是一个游戏场景分析代理。',
      model: this.settings.mini_model
    })
    const res_msg =await this.get_LLM_result(this.agent_mini,his);
    if(res_msg.length > 0){
      return res_msg
    }else{
      return ''
    }
  }

  private async NPC_profiles(name:string, character_design:string){
    try {
      console.log('开始设置头像')
      const new_profile = await this.set_profile(character_design)
      const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/setProfile`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: name, profile: new_profile })
      })
      const result = await response.json()
  } catch (error) {
      console.log(`为 ${name} 设置头像时发生错误：${error}`)
  }
  }

  public async set_NPC_profile(){
    try{
      const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
      const jsonData = await response.json()
      // NPC 不考虑一次多个NPC没头像造成此处耗费大量时间的场景
      // 不能使用Promise.all，因为文生图有rate limit
      for(const npc of jsonData.NPCs){
        if(npc.profile==""){
          await this.NPC_profiles(npc.name,npc.character_design)
        }
      }
    }catch(error){
      console.log(`设置头像失败！${error}`)
    }
  }

  // public async get_NPC(){
  //   try{
  //     const res:NPC_card[] = []
  //     const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
  //     const jsonData = await response.json()
  //     // player
  //     res.push(
  //       {
  //         profile: jsonData.player.profile,
  //         hp: jsonData.player.hp,
  //         name: jsonData.player.name,
  //         type: "player"
  //       }
  //     )
  //     // NPC 现在只考虑“NPC还没有头像”的情形，不考虑一次多个NPC没头像造成此处耗费大量时间的场景
  //     for(const npc of jsonData.NPCs){
  //       let profile = ""
  //       if(npc.profile==""){
  //         const new_profile = await this.set_profile(npc.character_design)
  //         console.log(new_profile)
  //         const response_add = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/setProfile`, {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json'
  //           },
  //           body: JSON.stringify({name:npc.name,profile:new_profile})
  //         })
  //         const set_result = await response_add.json()
  //         profile = new_profile
  //       }else{
  //         profile = npc.profile
  //       }
  //         res.push(
  //         {
  //           profile: profile,
  //           hp: npc.hp,
  //           name: npc.name,
  //           type: "npc"
  //         }
  //       )
  //     }
  //     // 队友
  //     for(const party of jsonData.player._partys){
  //         res.push(
  //         {
  //           profile: party.profile,
  //           hp: party.hp,
  //           name: party.name,
  //           type: "party"
  //         }
  //       )
  //     }

  //     return res
  //   }catch(error){
  //     console.log(`获取队友信息失败！${error}`)
  //     return []
  //   }
  // }

  public async set_profile(character_design:string){
    try{
      if(this.settings.img_generation){
        const given_prompt = await this.get_profile_img_prompt(character_design) ?? ""
        if(given_prompt != undefined && given_prompt.length > 0){
          console.log(`触发文生图! Prompt: ${given_prompt}`)
          const res_img = await this.get_img(given_prompt)
          console.log(res_img.length)
          if(res_img.length>0){
            return res_img
            }
          }
        }
      const profile_idx = Math.floor(Math.random() * (28)); //0~27内随便选
      return img_dict.img_base64.get(`img_${profile_idx}_left`) ?? img_dict.img_base64.get(`img_0_left`)!
    }catch(error){
      console.log(`设置形象出错！${error}`)
      return ""
    }
  }

  public async refresh_enemy(){
    try{
      if(this.mcpServer_tiny === undefined) return
      const his:AgentInputItem[] = []
      this.settings.history.forEach(value => {
        if(value.role == "system"){
          const s:SystemMessageItem = {role:"system",content:value.content};
          his.push(s)
        }else if(value.role == "user"){
          const s:UserMessageItem = {role:"user",content:value.content};
          his.push(s);
        }else{
          const s:AssistantMessageItem={role:"assistant",status:"completed",content:[{type:"output_text",text:value.content}]};
          his.push(s);
        }
      })
      const refresh_enemy:SystemMessageItem = {role:"system",content:defaultConfig.prompt_for_refresh_enemy}
      his.push(refresh_enemy)
      await this.mcpServer_tiny.connect()
      this.agent_mini = new Agent({
        name: 'Agent',
        instructions:
        '你不再是一个LLM Assistant，而是一个游戏场景分析代理。',
        model: this.settings.mini_model,
        mcpServers: [this.mcpServer_tiny]
      })
      await this.get_LLM_result(this.agent_mini,his); //输出无意义
      let use_img_generation = false
      if(this.settings.img_generation){
        his.pop()
        use_img_generation = true
        try{
          await this.profile_enemy(his)
        }catch(error){
          console.log("敌人文生图失败！")
          use_img_generation = false
        }
      }

      if(!use_img_generation){
        await this.set_enemy_profile_random()
      }
    }catch(error){
      console.log(`刷新敌人出错！${error}`)
    }
  }

  private async profile_enemy(his:AgentInputItem[]){
    const type_dict = new Map([['regular','杂鱼'],['elite','精英'],['badass','传奇']])
    const painters :Promise<string>[] = []
    const enemy_name:string[] = []
    const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
    const jsonData = await response.json()
    const enemys = jsonData.enemy
    for(const enemy of enemys){
      const prompt = defaultConfig.Img_prompt_for_enemy + `\n现在请你为${type_dict.get(enemy.type) ?? "精英"}敌人：${enemy.name}设计提示词`
      const DECIDE_TO_img:SystemMessageItem = {role:"system",content:prompt}
      this.agent_mini = new Agent({
        name: 'Agent',
        instructions:
        '你不再是一个LLM Assistant，而是一个游戏场景分析代理。',
        //mcpServers: [this.mcpServer_tiny],
        model: this.settings.mini_model
      })
      his.push(DECIDE_TO_img)
      const res_msg = this.get_LLM_result(this.agent_mini,his);
      painters.push(res_msg)
      enemy_name.push(enemy.name)
    }
    const all_prompts = await Promise.all(painters)
    // 不能使用Promise.all，因为文生图有rate limit
    const workers:Promise<string>[] = []
    for(let i=0;i<enemy_name.length;i++){
      const given_prompt = all_prompts[i]
      if(given_prompt != undefined){
          console.log(`触发文生图! Prompt: ${given_prompt}`)
          let res = await this.get_img(given_prompt)
          if(res == ''){
            const profile_idx = Math.floor(Math.random() * (28)); //0~27内随便选
            res = img_dict.img_base64.get(`img_${profile_idx}_left`) ?? img_dict.img_base64.get(`img_0_left`)!
          }
          await this.set_enemy_profile(enemy_name[i]??"",res??"")
      }
    }
  }

  private async set_enemy_profile_random(){
    const response = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/status`)
    const jsonData = await response.json()
    const enemys = jsonData.enemy
    for(const enemy of enemys){
      const profile_idx = Math.floor(Math.random() * (28)); //0~27内随便选
      const img = img_dict.img_base64.get(`img_${profile_idx}_left`) ?? img_dict.img_base64.get(`img_0_left`)!
      await this.set_enemy_profile(enemy.name,img)
    }
  }

  private async set_enemy_profile(name:string, profile:string){
    const response_add = await fetch(`http://${this.settings.MCP_Server}:${this.settings.port}/game/setEnemyProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({name:name,profile:profile})
    })
    const set_result = await response_add.json()
    // if(!set_result.ok){
    //   console.log(`设置头像失败！`)
    // }
  }

  private async get_profile_img_prompt(character_design: string){
    if(this.mcpServer_tiny === undefined)return
    let Img_prompt = defaultConfig.Img_prompt_for_profile
    Img_prompt += `\n 人物设定如下：\n${character_design}`
    const DECIDE_TO_img:SystemMessageItem = {role:"system",content:Img_prompt}
    const his = [DECIDE_TO_img]
    this.agent_mini = new Agent({
      name: 'Agent',
      instructions:
      '你不再是一个LLM Assistant，而是一个游戏场景分析代理。',
      //mcpServers: [this.mcpServer_tiny],
      model: this.settings.mini_model
    })
    const res_msg =await this.get_LLM_result(this.agent_mini,his);
    if(res_msg.length > 0){
      return res_msg
    }else{
      return ''
    }
  }
}
