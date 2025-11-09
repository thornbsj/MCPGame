import express from "express";
import {Request,Response} from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import defaultConfig from "./defaultconfig";
import { Game } from "./GM";
import { loadConfig } from './configLoader';
import * as fs from 'fs';
import { Skill } from "./Skill";
import bodyParser from "body-parser";

const expressApp = express();
expressApp.use(bodyParser.json({ limit: '100mb'}))

interface SaveSlot {
  id: number;
  saved: boolean;
  title: string;
  time: string;
  image: string;
  chosen: boolean;
}

function getSaveFileName(slot: number): string {
  return `save${slot}.sav`;
}

const game = new Game();
game.add_world_info("奇点侦测站","init",defaultConfig.main_world);
game.add_world_info("齿轮","init",defaultConfig.world1);
game.add_world_info("源法","init",defaultConfig.world2);
game.add_world_info("混元","init",defaultConfig.world3);
game.add_world_info("黯蚀","init",defaultConfig.world4);
game.add_world_info("终焉","init",defaultConfig.final_world);
//saveSlots
async function getSaveSlotInfo(slot: number): Promise<SaveSlot> {
  const filename = getSaveFileName(slot);
  const saveSlot: SaveSlot = {
    id: slot,
    saved: false,
    title: "",
    time: "",
    image: "",
    chosen: false
  };

  try {
    // 检查文件是否存在
    if (fs.existsSync(filename)) {
      saveSlot.saved = true;
      
      // 获取文件修改时间
      const stats = fs.statSync(filename);
      saveSlot.time = stats.mtime.toISOString();
      
      // 读取文件内容获取标题
      const data = fs.readFileSync(filename, 'utf8');
      const jsonData = JSON.parse(data);
      saveSlot.title = jsonData.current_world || "未知世界";
    }
  } catch (error) {
    console.error(`获取存档信息错误 (槽位 ${slot}):`, error);
  }
  
  return saveSlot;
}

expressApp.get('/initialize', async (req, res) => {
  try {
    game.initialize()
    game.add_world_info("奇点侦测站","init",defaultConfig.main_world);
    game.add_world_info("齿轮","init",defaultConfig.world1);
    game.add_world_info("源法","init",defaultConfig.world2);
    game.add_world_info("混元","init",defaultConfig.world3);
    game.add_world_info("黯蚀","init",defaultConfig.world4);
    game.add_world_info("终焉","init",defaultConfig.final_world);
    res.status(200).json("游戏重置成功")
  } catch (error) {
    console.error("初始化错误:", error);
    res.status(500).json({ error: "无法重置游戏" });
  }
});
expressApp.post('/initialize_name', async (req, res) => {
  try {
    const { name } = req.body;
    game.player_name = name;
    game.player.name = name;
    res.status(200).json("初始化主角姓名成功")
  } catch (error) {
    console.error("初始化错误：", error);
    res.status(500).json({ error: "无法给角色命名" });
  }
});

expressApp.get('/save_slots', async (req, res) => {
  try {
    const slots: SaveSlot[] = [];
    
    // 并行获取所有槽位信息
    for (let i = 1; i <= 6; i++) {
      const slotInfo = await getSaveSlotInfo(i);
      slots.push(slotInfo);
    }
    
    res.json(slots);
  } catch (error) {
    console.error("获取存档槽位错误:", error);
    res.status(500).json({ error: "无法获取存档槽位信息" });
  }
});

expressApp.post('/save', async (req, res) => {
  try {
    const { slot } = req.body;
    console.log(typeof(slot))
    console.log(`slot:${slot}`)
    
    const filename = getSaveFileName(slot);
    await game.save_to_file(filename);
    
    res.status(200).json({ message: "存档成功" });
  } catch (error) {
    console.error("存档错误:", error);
    res.status(500).json({ error: "存档失败" });
  }
});

expressApp.post('/load', async (req, res) => {
  try {
    const { slot } = req.body;
    
    if (typeof slot !== 'number' || slot < 1 || slot > 6) {
      return res.status(400).json({ error: "无效的存档槽位" });
    }
    
    const filename = getSaveFileName(slot);
    
    // 检查文件是否存在
    if (!fs.existsSync(filename)) {
      return res.status(404).json({ error: "存档不存在" });
    }
    
    await game.load_from_file(filename);
    
    res.status(200).json({ message: "读档成功" });
  } catch (error) {
    console.error("读档错误:", error);
    res.status(500).json({ error: "读档失败" });
  }
});

expressApp.post('/delete', async (req, res) => {
  try {
    const { slot } = req.body;
    
    if (typeof slot !== 'number' || slot < 1 || slot > 6) {
      return res.status(400).json({ error: "无效的存档槽位" });
    }
    
    const filename = getSaveFileName(slot);
    
    // 检查文件是否存在
    if (!fs.existsSync(filename)) {
      return res.status(404).json({ error: "存档不存在" });
    }
    
    // 删除文件
    fs.unlinkSync(filename);
    
    res.status(200).json({ message: "删除存档成功" });
  } catch (error) {
    console.error("删除存档错误:", error);
    res.status(500).json({ error: "删除存档失败" });
  }
});

//GameInfo&Functions
expressApp.get('/game/status',(req: Request, res: Response) =>{
  try{
    let result = game.toJson();
    result.current_worldview = game.worldViews.get(game.current_world)?.toPromptString();
    res.status(200).json(result);
  }catch(error){
    console.log(error);
  }
})

expressApp.post('/game/chageSkill',async(req:Request,res:Response)=>{
  try{
    const { name, skill_name, skill_description, skill_dependent } = req.body;
    const skill  = new Skill(skill_name,skill_description,skill_dependent);
    if(name == "self"){
      game.player.boundCombatAttribute(skill);
    }else{
      game.player.partyMembers.get(name)?.boundCombatAttribute(skill);
    }
    res.status(200).json("已成功绑定");
  }catch(error){
    console.log(error);
  }
})

expressApp.post('/game/addSkill',async(req:Request,res:Response)=>{
  try{
    const { name, skill_name, skill_description, skill_dependent } = req.body;
    const skill  = new Skill(skill_name,skill_description,skill_dependent);
    if(name == "self"){
      game.player.addSkill( skill_name, skill_description, skill_dependent);
    }else{
      game.player.partyMembers.get(name)?.addSkill( skill_name, skill_description, skill_dependent);
    }
    res.status(200).json("已成功绑定");
  }catch(error){
    console.log(error);
  }
})


expressApp.post('/game/getprompt',async(req:Request,res:Response)=>{
  try{
    const { name, context } = req.body;
    let prompt = [];
    if(game.player.partyMembers.has(name)){
      prompt = game.player.partyMembers.get(name)?.buildPrompt(context,[game.player.name??'玩家'])??[];
    }else{
      prompt = game.NPCs.get(name)?.buildPrompt(context,[game.player.name??'玩家'])??[];
    }
    res.status(200).json(prompt);
  }catch(error){
    console.log(error);
  }
})

expressApp.post('/game/addPrompt',async(req:Request,res:Response)=>{
  try{
    const { name, speaker, message, mode } = req.body;
    const isRespond: boolean = name===speaker
    if(game.player.partyMembers.has(name)){
      game.player.partyMembers.get(name)?.addConversationMessage(speaker,message,isRespond,mode);
    }else{
      game.NPCs.get(name)?.addConversationMessage(speaker,message,isRespond,mode);
    }
    res.status(200).json(`为${name}添加${speaker}发言信息成功`);
  }catch(error){
    console.log(error);
    res.status(500);
  }
})

expressApp.get('/game/set_built_Prompt_false',async(req:Request,res:Response)=>{
  try{
    game.built_Prompt_for_NPCs = false
    res.status(200).json();
  }catch(error){
    console.log(error);
    res.status(500);
  }
})

expressApp.get('/game/built_Prompt',async(req:Request,res:Response)=>{
  try{
    res.status(200).json({isBuilt:game.built_Prompt_for_NPCs});
  }catch(error){
    console.log(error);
    res.status(500);
  }
})

expressApp.get('/game/checkBetrayal',(req: Request, res: Response) =>{
  try{
    let result = game.betrayal();
    res.status(200).json(result);
  }catch(error){
    console.log(error);
  }
})

expressApp.get('/game/BattleBtn',(req: Request, res: Response) =>{
  try{
    res.status(200).json(game.battle())
  }catch(error){
    console.log(error);
    res.status(500);
  }
})

expressApp.post('/game/getProfile',(req: Request, res: Response) =>{
  try{
    const{name} = req.body;
    if(game.player.partyMembers.has(name)){
      res.status(200).json(game.player.partyMembers.get(name)?.profile)
    }else{
      res.status(200).json(game.NPCs.get(name)?.profile)
    }
  }catch(error){
    console.log(error);
    res.status(500);
  }
})

expressApp.post('/game/setProfile',(req: Request, res: Response) =>{
  try{
    const{name,profile} = req.body;
    if(name === 'self'){
      game.player.profile = profile
    }
    else if(game.player.partyMembers.has(name)){
      game.player.partyMembers.get(name)!.profile = profile
    }else{
      game.NPCs.get(name)!.profile = profile
    }
    res.status(200).json(`为${name}设置头像成功`);
  }catch(error){
    console.log(`设置头像失败！${error}`);
    res.status(500);
  }
})

expressApp.post('/game/setEnemyProfile',(req: Request, res: Response) =>{
  try{
    const{name,profile} = req.body;
    for(const enemy of game.enemy){
      if(enemy.name===name){
        enemy.profile = profile
      }
    }
    res.status(200).json(`为${name}设置头像成功`);
  }catch(error){
    console.log(error);
    console.log(`设置头像失败！${error}`);
  }
})

expressApp.post('/add_to_party', async (req, res) => {
  try {
    const { name } = req.body;
    game.add_partyMembers(name)
    res.status(200).json("加入队友成功")
  } catch (error) {
    console.error("加入队友错误：", error);
    res.status(500).json({ error: "无法加入队友" });
  }
});

//Main MCP
expressApp.post('/mcp', async (req: Request, res: Response) => {
  // In stateless mode, create a new instance of transport and server for each request
  // to ensure complete isolation. A single instance would cause request ID collisions
  // when multiple clients connect concurrently.
  
  try {
    const server = new McpServer({
      name: "GM",
      version: "1.0.0"
    });
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });

    server.registerTool("add_world_info",
      {
        title: "更新世界观",
        description: defaultConfig.add_world_info,
        inputSchema: { world:z.string(),info:z.string() }
      },
      async ({ world,info }) => 
        {
          const success_info = `成功为世界${world}增加世界观:${info}`;
          const faild_info = `失败动作：为世界${world}增加世界观:${info}`;
          try {
            game.add_world_info(world,"dynamic",info);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("update_relation",
      {
        title: "更新世界观中的势力关系",
        description: defaultConfig.update_relation,
        inputSchema: { world:z.string(),
                      factionA:z.string(),
                      factionB:z.string(),
                      attitude:z.enum(["hostile", "neutral","friendly","allied"]),
                      eventDescription:z.string(),
                      tensionDelta:z.number()
                    }
      },
      async ({ world,factionA,factionB,attitude,eventDescription,tensionDelta }) => 
        {
          const success_info = `成功为世界${world}增加派系冲突：${factionA}-${factionB}-${attitude}-${eventDescription}-${tensionDelta}`;
          const faild_info = `失败动作：为世界${world}增加派系冲突：${factionA}-${factionB}-${attitude}-${eventDescription}-${tensionDelta}`;
          try {
            game.update_relation(
              world,factionA,factionB,attitude,eventDescription,tensionDelta
            );
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("change_world",
      {
        title: "穿越世界",
        description: defaultConfig.change_world,
        inputSchema: { world:z.string(),summary:z.string() }
      },
      async ({ world,summary }) => 
        {
          const success_info = `成功穿越到世界${world}`;
          const faild_info = `失败动作：穿越到世界${world}`;
          try {
            game.change_world(world,summary);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("add_NPC",
      {
        title: "添加NPC",
        description: defaultConfig.add_NPC,
        inputSchema: { 
          name:z.string(),
          CON:z.number(),
          DEX:z.number(),
          INT:z.number(),
          level:z.number(),
          character_design:z.string(),
          skill:z.string(),
          skill_desc:z.string(),
          dependent:z.string(),
          item:z.string(),
          item_description:z.string()
         }
      },
      async ({
        name,
        CON,
        DEX,
        INT,
        level,
        character_design,
        skill,
        skill_desc,
        dependent,
        item,
        item_description
       }) => 
        {
          const success_info = `成功添加NPC${name}`;
          const faild_info = `失败动作：添加NPC${name}-${CON}-${DEX}-${INT}-${level}-${character_design}-${skill}-${skill_desc}-${dependent}-${item}-${item_description}`;
          try {
            game.add_NPC(
              name,
              CON,
              DEX,
              INT,
              level,
              character_design,
              skill,
              skill_desc,
              dependent,
              item,
              item_description
            );
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("battle",
      {
        title: "战斗",
        description: defaultConfig.battle,
        inputSchema: { npc_names:z.array(z.string()) }
      },
      async ({ npc_names }) => 
        {
          const success_info = `成功触发和以下NPC的战斗：${npc_names}`;
          const faild_info = `失败动作：触发战斗：${npc_names}`;
          try {
            game.battle(npc_names);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("changeStatus",
      {
        title: "改变NPC或自己的状态",
        description: defaultConfig.changeStatus,
        inputSchema: { npc:z.string(),name: z.string(), value: z.number() }
      },
      async ({ npc,name,value }) => 
        {
          const success_info = `成功触发状态改变：${npc}-${name}-${value}`;
          const faild_info = `失败动作：触发状态改变：${npc}-${name}-${value}`;
          try {
            game.changeStatus(npc,name,value);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("addSkill",
      {
        title: "增加技能",
        description: defaultConfig.addSkill,
        inputSchema: { npc:z.string(),
                      name:z.string(),
                      description:z.string(),
                      dependent:z.string() }
      },
      async ({ npc,name,description,dependent }) => 
        {
          const success_info = `成功触发技能添加：${npc}-${name}-${description}-${dependent}`;
          const faild_info = `失败动作：触发技能添加：${npc}-${name}-${description}-${dependent}`;
          try {
            game.addSkill(npc,name,description,dependent);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("gainItem",
      {
        title: "获得物品",
        description: defaultConfig.gainItem,
        inputSchema: { npc:z.string(),name:z.string(),description:z.string() }
      },
      async ({ npc,name,description }) => 
        {
          const success_info = `成功触发获得物品事件：${npc}-${name}-${description}`;
          const faild_info = `失败动作：触发获得物品事件：${npc}-${name}-${description}`;
          try {
            game.gainItem(npc,name,description);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("minusItem",
      {
        title: "失去物品",
        description: defaultConfig.minusItem,
        inputSchema: { npc:z.string(),name:z.string(),description:z.string() }
      },
      async ({ npc,name,description }) => 
        {
          const success_info = `成功触发失去物品事件：${npc}-${name}-${description}`;
          const faild_info = `失败动作：触发失去物品事件：${npc}-${name}-${description}`;
          try {
            game.minusItem(npc,name,description);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("add_quest",
      {
        title: "刷新任务信息",
        description: defaultConfig.add_quest,
        inputSchema: { s:z.string() }
      },
      async ({ s }) => 
        {
          const success_info = `成功刷新任务信息${s}`;
          const faild_info = `失败动作：刷新任务信息${s}`;
          try {
            game.refresh_quest(s);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("buildPrompt",
      {
        title: "构建给到NPC的提示词",
        description: defaultConfig.buildPrompt,
        inputSchema: { s:z.string() }
      },
      async ({ s }) => 
        {
          const success_info = `成功构建给到NPC的提示词${s}`;
          const faild_info = `失败动作：构建给到NPC的提示词${s}`;
          try {
            game.buildPrompt(s,true);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("end",
      {
        title: "结局",
        description: defaultConfig.end,
        inputSchema: { }
      },
      async ({ }) => 
        {
          const success_info = `成功构建结局`;
          const faild_info = `失败:构建结局`;
          try {
            game.end(defaultConfig.ending_with_high_EGO_and_high_morality,
              defaultConfig.ending_with_low_EGO_and_low_morality,
              defaultConfig.ending_with_high_EGO_and_low_morality,
              defaultConfig.ending_with_low_EGO_and_high_morality,
              defaultConfig.morality_threshold,
              defaultConfig.EGO_threshold);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// SSE notifications not supported in stateless mode
expressApp.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

// Session termination not needed in stateless mode
expressApp.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

//MCP for NPC
expressApp.post('/NPCMCP', async (req: Request, res: Response) => {
  // In stateless mode, create a new instance of transport and server for each request
  // to ensure complete isolation. A single instance would cause request ID collisions
  // when multiple clients connect concurrently.
  
  try {
    const server = new McpServer({
      name: "NPC",
      version: "1.0.0"
    });
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });

    server.registerTool("add_character_design",
      {
        title: "更新人设",
        description: defaultConfig.add_character_design,
        inputSchema: { name:z.string(),new_info:z.string() }
      },
      async ({ name,new_info }) => 
        {
          const success_info = `成功为NPC${name}增加人设:${new_info}`;
          const faild_info = `失败动作：为NPC${name}增加人设:${new_info}`;
          try {
            game.NPCs.get(name)?.add_character_design(new_info);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("Betrayal",
      {
        title: "叛变",
        description: defaultConfig.Betrayal,
        inputSchema: { name:z.string() }
      },
      async ({ name }) => 
        {
          const success_info = `成功：NPC${name}叛变`;
          const faild_info = `失败动作：NPC${name}叛变`;
          try {
            game.NPCs.get(name)?.Betrayal();
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("add_to_potential_member",
      {
        title: "设为潜在队友",
        description: defaultConfig.add_to_potential_member,
        inputSchema: { name:z.string() }
      },
      async ({ name }) => 
        {
          const success_info = `成功：NPC${name}被设为潜在队友`;
          const faild_info = `失败动作：NPC${name}被设为潜在队友`;
          try {
            game.NPCs.get(name)?.add_to_potential_member();
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("summary",
      {
        title: "概括当前世界经历",
        description: defaultConfig.summary,
        inputSchema: { name:z.string(),summary:z.string() }
      },
      async ({ name,summary }) => 
        {
          const success_info = `成功：NPC${name}更新提示词-${summary}`;
          const faild_info = `失败动作：NPC${name}更新提示词-${summary}`;
          try {
            game.NPCs.get(name)?.summary(summary);
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    server.registerTool("summary_to_Player",
      {
        title: "NPC的重要信息给到主对话",
        description: defaultConfig.summary_to_Player,
        inputSchema: { name:z.string(),summary:z.string() }
      },
      async ({ name,summary }) => 
        {
          const success_info = `成功：NPC${name}加入重要信息-${summary}`;
          const faild_info = `失败动作：NPC${name}加入重要信息-${summary}`;
          try {
            game.summaryLog_NPC.push(`${name}:${summary}`)
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );
	
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// SSE notifications not supported in stateless mode
expressApp.get('/NPCMCP', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

// Session termination not needed in stateless mode
expressApp.delete('/NPCMCP', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});


//MCP for tiny model
expressApp.post('/TinyMCP', async (req: Request, res: Response) => {
  // In stateless mode, create a new instance of transport and server for each request
  // to ensure complete isolation. A single instance would cause request ID collisions
  // when multiple clients connect concurrently.
  
  try {
    const server = new McpServer({
      name: "tiny",
      version: "1.0.0"
    });
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });

    server.registerTool("refresh_enemys",
      {
        title: "刷新敌人",
        description: defaultConfig.refresh_enemys,
        inputSchema: { 
          regular:z.string(),
          regular_item_names:z.array(z.string()),
          regular_item_description:z.array(z.string()),
          regular_skill:z.array(z.string()),

          elite:z.string(),
          elite_item_names:z.array(z.string()),
          elite_item_description:z.array(z.string()),
          elite_skill:z.array(z.string()),

          badass:z.string(),
          badass_item_names:z.array(z.string()),
          badass_item_description:z.array(z.string()),
          badass_skill:z.array(z.string())
         }
      },
      async ({ 
        regular,
        regular_item_names,
        regular_item_description,
        regular_skill,

        elite,
        elite_item_names,
        elite_item_description,
        elite_skill,

        badass,
        badass_item_names,
        badass_item_description,
        badass_skill
       }) => 
        {
          const success_info:string = `成功刷新敌人列表:${regular}-${regular_item_names}-${regular_item_description}-${regular_skill}-${elite}-${elite_item_names}-${elite_item_description}-${elite_skill}-${badass}-${badass_item_names}-${badass_item_description}-${badass_skill}`;
          const faild_info = `失败动作：刷新敌人列表:${regular}-${regular_item_names}-${regular_item_description}-${regular_skill}-${elite}-${elite_item_names}-${elite_item_description}-${elite_skill}-${badass}-${badass_item_names}-${badass_item_description}-${badass_skill}`;
          try {
            game.refresh_enemys(
              regular,regular_item_names,regular_item_description,regular_skill,
              elite,elite_item_names,elite_item_description,elite_skill,
              badass,badass_item_names,badass_item_description,badass_skill)
            console.log(success_info);
            return {content: [{ type: "text", text: success_info }]} 
          } catch (error) {
            console.log(error)
            return {content: [{ type: "text", text: faild_info }]} 
          }
        }
    );

    // server.registerTool("text2Img",
    //   {
    //     title: "文生图",
    //     description: defaultConfig.text2Img,
    //     inputSchema: { 
    //       prompt:z.string()
    //      }
    //   },
    //   async ({ 
    //     prompt
    //    }) => 
    //     {
    //       const success_info = `成功触发文生图:${prompt}`;
    //       const faild_info = `失败动作：触发文生图:${prompt}`;
    //       try {
    //         game.text2Img(prompt);
    //         console.log(success_info);
    //         return {content: [{ type: "text", text: success_info }]} 
    //       } catch (error) {
    //         console.log(error)
    //         return {content: [{ type: "text", text: faild_info }]} 
    //       }
    //     }
    // );

    // server.registerTool("decide_to_talk",
    //   {
    //     title: "决定现在是否要开口",
    //     description: defaultConfig.decide_to_talk,
    //     inputSchema: { name:z.string(),talk:z.boolean() }
    //   },
    //   async ({ name,talk }) => 
    //     {
    //       const success_info = `成功：NPC${name}决定是否开口-${talk}`;
    //       const faild_info = `失败动作：NPC${name}决定是否开口-${talk}`;
    //       try {
    //         game.NPCs.get(name)?.decide_to_talk(talk);
    //         console.log(success_info);
    //         return {content: [{ type: "text", text: success_info }]} 
    //       } catch (error) {
    //         console.log(error)
    //         return {content: [{ type: "text", text: faild_info }]} 
    //       }
    //     }
    // );
	
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// SSE notifications not supported in stateless mode
expressApp.get('/TinyMCP', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

// Session termination not needed in stateless mode
expressApp.delete('/TinyMCP', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

const config = loadConfig();
const PORT = config.server.port;
const HOST = config.server.host;

// Start the server
expressApp.listen(PORT,HOST, (error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});