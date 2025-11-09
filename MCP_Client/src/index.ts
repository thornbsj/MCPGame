import express from "express";
import Message from "./Message";
import { SharedState } from "./settings";
import { Dialogue } from "./Dialogue";
import { join } from 'path';
import bodyParser from "body-parser";
import { readFileSync } from 'fs';
import { parse } from 'ini';
import { TestHistory } from "./ForTest";
import { spawn } from "child_process";

const App = express()
App.use(bodyParser.json({ limit: '100mb'}))

const settings = new SharedState()

App.post('/update_settings', async (req, res) => {
  try {
    const { json_string } = req.body;
    const json_res = JSON.parse(json_string)
    const msgs:Message[] = []
    for(const msg of json_res.history){
        msgs.push(
            new Message(msg.role,msg.content)
        )
    }

    settings.baseurl=json_res.baseurl
    settings.apikey=json_res.apikey
    settings.modelName=json_res.modelName
    settings.temperature=json_res.temperature
    settings.stream=json_res.stream
    settings.mini_model_baseurl=json_res.mini_model_baseurl
    settings.mini_model_apikey=json_res.mini_model_apikey
    settings.mini_model=json_res.mini_model
    settings.mini_model_temperature=json_res.mini_model_temperature
    settings.mini_model_stream=json_res.mini_model_stream
    settings.async_dialogue=json_res.async_dialogue
    settings.img_generation=json_res.img_generation
    settings.img_generation_baseurl=json_res.img_generation_baseurl
    settings.img_generation_apikey=json_res.img_generation_apikey
    settings.img_generation_model=json_res.img_generation_model
    settings.MCP_Server=json_res.MCP_Server
    settings.port=json_res.port
    settings.history=msgs
    settings.display_history=[]
    
    res.status(200).json({ message: "同步设置成功" });
  } catch (error) {
    console.error("同步设置错误:", error);
    res.status(500).json({ error: "同步设置失败" });
  }
});

App.post('/Command_dialogue', async (req, res) => {
  try {
    const { ipt, initialize_Prompt } = req.body;
    const dialogue = new Dialogue(settings)
    await dialogue.Command_dialogue(ipt, initialize_Prompt)

    // for Test
    // function sleep(ms: number): Promise<void> {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }
    // await sleep(1000)
    // for(const output of TestHistory){
    //   settings.display_history.push(output)
    // }
    res.status(200).json({ 
        history: settings.history.map(msg => JSON.parse(msg.toJson())),
        display_history: settings.display_history
     });
  } catch (error) {
    console.error("指令错误:", error);
    res.status(500).json({ error: "指令输入失败" });
  }
});

App.get('/setProfiles',async (req,res) =>{
  try{
    const dialogue = new Dialogue(settings)
    await dialogue.set_NPC_profile()
    res.status(200).json({})
  }
 catch (error){
    console.error("设置头像错误:", error);
    res.status(500).json({ error: "设置头像错误" });
  }
})

App.post('/set_player_profile', async (req, res) => {
  try {
    const { ipt } = req.body;
    const dialogue = new Dialogue(settings)
    await dialogue.set_player_profile(ipt)
    
    res.status(200).json({});
  } catch (error) {
    console.error("设置头像错误:", error);
    res.status(500).json({ error: "设置头像失败" });
  }
});

App.post('/public_talk', async (req, res) => {
  try {
    const { ipt } = req.body;
    const dialogue = new Dialogue(settings)
    await dialogue.public_talk(ipt)
    
    res.status(200).json({ 
        history: settings.history.map(msg => JSON.parse(msg.toJson())),
        display_history: settings.display_history
     });
  } catch (error) {
    console.error("喊话错误:", error);
    res.status(500).json({ error: "喊话输入失败" });
  }
});

App.get('/refresh_enemy', async (req, res) => {
  try {
    const dialogue = new Dialogue(settings)
    await dialogue.refresh_enemy()
    
    res.status(200).json({});
  } catch (error) {
    console.error("刷新敌人错误:", error);
    res.status(500).json({ error: "刷新敌人失败" });
  }
});

App.post('/private_talk', async (req, res) => {
  try {
    const { npc, ipt } = req.body;
    const dialogue = new Dialogue(settings)
    
    const npc_result = await dialogue.private_talk(npc, ipt)

    res.status(200).json({ 
        npc_result: npc_result
     });
  } catch (error) {
    console.error("对话错误:", error);
    res.status(500).json({ error: "对话输入失败" });
  }
});

function getElectronAppPath(): string {
    return join(process.cwd(), 'mcp-game.exe');
}

async function startServer(port: number = 3000, maxAttempts: number = 1000): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    function tryStartServer(currentPort: number) {
      attempts++;
      
      if (attempts > maxAttempts) {
        reject(new Error(`Failed to start server after ${maxAttempts} attempts`));
        return;
      }

      const server = App.listen(currentPort, () => {
        console.log(`Server is running on port ${currentPort}`);
        resolve(currentPort);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${currentPort} is busy, trying port ${currentPort + 1}...`);
          tryStartServer(currentPort + 1);
        } else {
          reject(error);
        }
      });
    }
    
    tryStartServer(port);
  });
}

let port_begin = 3001
let maxAttempts = 1000
try{
  const configPath: string = join(__dirname, '.', 'config', 'config.ini');
  const configContent = readFileSync(configPath, 'utf-8');
  const rawConfig = parse(configContent);

  port_begin = parseInt(rawConfig.server.port) || 3000,
  maxAttempts = rawConfig.server.maxAttempts || 1000
}catch(error){
  console.warn('配置文件未找到或格式错误，使用默认配置');
}

startServer(port_begin,maxAttempts)
  .then(port => {
    console.log(`已经于 ${port}开启服务`);
    // 调试时可以将下面的代码注释掉
    const electronAppPath = getElectronAppPath();
    const electronProcess = spawn(electronAppPath, [port.toString()], {
        detached: true,
        stdio: 'ignore'
      });
    electronProcess.unref();

    electronProcess.on('error', (err: Error) => {
        console.error('Failed to start Electron app:', err);
    });

  })
