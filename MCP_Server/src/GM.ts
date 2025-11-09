/*流程：
logs废弃不用换
更新状态=>更新logs=>文生图=>将logs给到所有NPC=>buildPrompt(如果有的话)给NPC=>清空logs和buildPrompt=>NPC函数=>是否有Betrayal()=>有的话从logs那一步重新开始，否则就退出*/
import fs from "fs";
import { Player } from "./Player";
import { Skill } from "./Skill";
import { NPC } from "./NPCs";
import { potential_enemy,enemy } from "./enemy";
import { Battle } from "./Battle";
import { WorldView, WorldViewJson } from "./Worldview";

export class Game{
    constructor(
        public player_name:string="",
        public player:Player = new Player(
            player_name,
            30,//hp
            30,//mp
            10,//CON
            10,//DEX
            10,//INT
            100,//morality
            100,//EGO
            1,//level
            0,//exp
            100,//gold
            null,""
        ),
        public NPCs: Map<string,NPC> = new Map<string,NPC>(),
        public current_world:string="奇点侦测站", //初始化
        public worldViews: Map<string, WorldView> = new Map(),
        public world_npc_map:Map<string,string> = new Map<string,string>(),
        public quests: string="",
        public enemy:potential_enemy[]=[], //普通敌人->精英敌人->强敌
        public logs:string[]=[],
        public text2Img_prompt:string[]=[],
        //public prompt_for_NPCs:string[]=[],
        public ending_prompt:string = "",
        public summaryLogs:string[]= [],
        public summaryLog_NPC:string[] = [],
        public built_Prompt_for_NPCs:boolean = false
    ){
    }

    public initialize(){
        this.player_name=""
        this.player = new Player(
            this.player_name,
            30,//hp
            30,//mp
            10,//CON
            10,//DEX
            10,//INT
            100,//morality
            100,//EGO
            1,//level
            0,//exp
            100,//gold
            null,""
        )
        this.NPCs = new Map<string,NPC>(),
        this.current_world="奇点侦测站", //初始化
        this.worldViews = new Map(),
        this.world_npc_map = new Map<string,string>(),
        this.quests ="",
        this.enemy =[], //普通敌人->精英敌人->强敌
        this.logs =[],
        this.text2Img_prompt =[],
        //this.prompt_for_NPCs:string[]=[],
        this.ending_prompt = "",
        this.summaryLogs = [],
        this.summaryLog_NPC = [],
        this.built_Prompt_for_NPCs = false
    }

    toJson():any{
        const NPCs:any[] = []
        this.NPCs.forEach((v,k)=>{
            NPCs.push(v.NPC_toJSON())
        }
        )
        const worlds:Map<string,any>=new Map<string,any>();
        this.worldViews.forEach((v,k)=>{
            worlds.set(k,JSON.stringify(v.toJson()));
        })
        const Enemys:any[]=[];
        this.enemy.forEach(x=>{
            Enemys.push(x.toJson());
        })
        return {
            player_name:this.player_name,
            player:this.player.toJSON(),
            NPCs:NPCs,
            current_world:this.current_world,
            world_infos:Array.from(worlds),
            world_npc_map:Array.from(this.world_npc_map),
            quests:this.quests,
            enemy:[...Enemys],
            logs:[...this.logs],
            text2Img_prompt:[...this.text2Img_prompt],
            summaryLogs:[...this.summaryLogs],
            summaryLog_NPC:[...this.summaryLog_NPC]
            //prompt_for_NPCs:[...this.prompt_for_NPCs]
        }
    }

    load(data:any){
        this.player_name=data.player_name;
        this.player.load(data.player);
        this.NPCs.clear();
        data.NPCs.forEach((x:any) => {
            let npc = new NPC("",1,1,1,1,1,100,100,1,1,null,'','');
            npc.NPC_load(x);
            this.NPCs.set(x.name,npc);
        });
        this.current_world = data.current_world;
        this.worldViews.clear();
        let loadedJson: WorldViewJson;
        data.world_infos.forEach((x:string[]) => {
            loadedJson = JSON.parse(x[1]);
            this.worldViews.set(x[0],WorldView.fromJson(loadedJson));
        });
        this.world_npc_map.clear();
        data.world_npc_map.forEach((x:string[]) => {
            this.world_npc_map.set(x[0],x[1]);
        });
        this.quests = data.quests;
        this.enemy.length=0
        data.enemy.forEach((x: any) => {
            let enemy = new potential_enemy(x.name,x.type,x.profile,new Map<string,string>(x.skills),new Map<string,string>(x.items));
            this.enemy.push(enemy);
        });
        this.summaryLogs = data.summaryLogs;
        this.summaryLog_NPC = data.summaryLog_NPC;
        this.built_Prompt_for_NPCs = false
    }

    save_to_file(filename: string = "autosave.sav"): Promise<void> {
        return new Promise((resolve, reject) => {
          try {
            const sav = JSON.stringify(this.toJson(), null, 2);
            fs.writeFile(filename, sav, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          } catch (error) {
            reject(error);
          }
        });
    }

    async load_from_file(filename: string): Promise<void> {
        return new Promise((resolve, reject) => {
          fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
              reject(err);
              return;
            }
            try {
              const jsonData = JSON.parse(data);
              this.load(jsonData);
              resolve();
            } catch (parseError) {
              reject(parseError);
            }
          });
        });
    }

    add_Log(log_info:string){
        this.logs.push(log_info);
    }

    clear_Log(){
        this.logs = [];
    }

    /**
     * 世界观管理函数
     * @param world 世界ID
     * @param mode 更新模式
     * @param data 更新数据
     */
    add_world_info(
    world: string,
    mode: "init" | "dynamic",
    data: string
  ): void {
    // 初始化新世界
    if (mode === "init") {
      if (this.worldViews.has(world)) {
        console.log(`World ${world} 已存在，请使用更新模式`);
        return;
      }
      this.worldViews.set(world, new WorldView(world, data));
      return;
    }
    
    // 确保世界存在
    const worldView = this.worldViews.get(world);
    if (!worldView){
        console.log(`世界 ${world} 未初始化`);
        return;
    }
    
    // 添加动态事件
    if (mode === "dynamic") {
      worldView.addDynamicEvent(data);
      return;
    }
  }

  update_relation(
    world: string,
    factionA: string,
    factionB: string,
    attitude: "hostile" | "neutral" | "friendly" | "allied",
    eventDescription: string,
    tensionDelta: number = 0
  ): void {
    // 确保世界存在
    const worldView = this.worldViews.get(world);
    if (!worldView){
        console.log(`世界 ${world} 未初始化`);
        return;
    }
    
    // 调用世界视图的关系更新方法
    worldView.updateRelationship(
      factionA,
      factionB,
      attitude,
      eventDescription,
      tensionDelta
    );
    
    console.log(`[关系更新] ${world}: ${factionA} ↔ ${factionB} 关系变更为 ${attitude}`);
  }
  
  /**
   * 获取世界提示词（用于给到LLM）
   * @param world 世界ID
   * @param options 提示词选项
   */
  getWorldPrompt(
    world: string,
    options?: { 
      includeRelationships?: boolean;
      maxDynamicEvents?: number 
    }
  ): string | null {
    const worldView = this.worldViews.get(world);
    return worldView?.toPromptString(options) || null;
  }

    /**
     * 穿越世界
     * @param world:世界
     * @param summary穿越前，主角在这个世界经历的一个提炼摘要
     */
    change_world(world:string,summary:string){
        if(!this.worldViews.get(world)){
            return;
        }
        this.summaryLogs.push(summary);
        this.current_world = world;
        // 清除NPC
        this.buildPrompt(`玩家以及他的队友一起来到了${world}`);
    }
    /**
     * 增加NPC
     * @name name 名字 由于是纯AI生成，没有ID，现在拿name作为ID(在和背叛的NPC Battle时，重名的NPC也会被算为“叛徒”)。
     * @param CON 体质
     * @param DEX 感知
     * @param INT 智力
     * @param level 等级
     * @param character_design 角色设定
     * @param skill 技能
     * @param skill_desc 技能描述 
     * @param dependent 技能威力依赖于哪项属性？体质/感知/智力
     * @param item NPC身上有的道具
     * @param item_description NPC所拥有的道具的描述
     * @param initial_prompt 给到这个角色初始化的一个提示词，需要结合世界观、角色设定以及玩家的行为构筑。
     */
    add_NPC(
        name:string,
        CON: number,
        DEX: number,
        INT: number,
        level:number,
        character_design: string,
        skill:string="",
        skill_desc:string = "",
        dependent:string = "",
        item:string="",
        item_description:string="",
        initial_prompt:string=""
    ){
        //检查有没有已经存在的同名NPC
        let current_npc = this.player.partyMembers.get(name);
        if(!current_npc){
            current_npc = this.NPCs.get(name);
        }else{
            return;
        }
        if (current_npc) {
            return;
        }
        const hp = 30+(5+CON)*level;
        const mp = 10+(3+INT)*level;
        const npc = new NPC(name,hp,mp,CON,DEX,INT,100,100,level,0,null,"",character_design,false,false,initial_prompt);
        if(skill.length>0){
            npc.addSkill(skill,skill_desc,dependent);
        }
        if(item.length>0){
            npc.gainItem(item,item_description);
        }
        this.NPCs.set(name,npc);
        this.world_npc_map.set(name,this.current_world);
        this.buildPrompt(`新增角色${name}`);
    }

    /**
     * NPC心态、设定改变
     * @param NPC 
     * @param new_info 
     */
    add_NPC_character_design(NPC: string, new_info: string): void {
        let npc = this.player.partyMembers.get(NPC);
        if(!npc){
            npc = this.NPCs.get(NPC);
        } 
        if (!npc) {
        return;
        }
        npc.add_character_design(new_info);
    }

    /**
     * 增加队友
     * @param NPC 可能会成为队友的NPC
     */
    // add_potential_members(NPC:string){
    //     let npc = this.player.partyMembers.get(NPC);
    //     if(!npc){
    //         npc = this.NPCs.get(NPC);
    //     }else{
    //         return;
    //     }
    //     if (!npc) {
    //         return;
    //     }
    //     this.player.add_potential_Members(npc);
    // }

    //增加队友，按钮点击
    
    add_partyMembers(NPC:string){
        let npc = this.player.partyMembers.get(NPC);
        if(!npc){
            npc = this.NPCs.get(NPC);
        }else{
            return;
        }
        if (!npc) {
            return;
        }
        this.player.add_partyMembers(npc);
        this.NPCs.delete(NPC);
        this.buildPrompt(`${NPC}现在加入了玩家的队伍，和玩家同行。`)
    }

    /**
     * 刷新敌人，单独做一个按钮和提示词
     * @param regular 杂鱼敌人名称
     * @param regular_item_names 杂鱼敌人会掉落的物品名称
     * @param regular_item_description 杂鱼敌人会掉落的物品描述
     * @param regular_skill 杂鱼敌人的技能
     * @param elite 精英敌人名称
     * @param elite_item_names 精英敌人会掉落的物品名称
     * @param elite_item_description 精英敌人会掉落的物品描述
     * @param elite_skill 精英敌人的技能
     * @param badass 头目敌人名称
     * @param badass_item_names 头目敌人会掉落的物品名称
     * @param badass_item_description 头目敌人会掉落的物品描述
     * @param badass_skill 头目敌人的技能
     */
    refresh_enemys(
        regular:string,
        regular_item_names:string[],// 最多2个
        regular_item_description:string[],
        regular_skill:string[],//技能名；3个可能的值，分别依赖于体质/感知/智力

        elite:string,
        elite_item_names:string[],
        elite_item_description:string[],
        elite_skill:string[],

        badass:string,
        badass_item_names:string[],
        badass_item_description:string[],
        badass_skill:string[]
    ){
        this.enemy.length=0
        this.build_potential_enemy(regular,"regular",regular_item_names,regular_item_description,regular_skill);
        this.build_potential_enemy(elite,"elite",elite_item_names,elite_item_description,elite_skill);
        this.build_potential_enemy(badass,"badass",badass_item_names,badass_item_description,badass_skill);
    }

    build_potential_enemy(name:string,type:string,item_names:string[],item_description:string[],skills:string[]){
        let items:Map<string,string>;
        try{
            items= new Map(item_names.map((key, index) => [key, item_description[index]]));
        }catch{
            items = new Map<string,string>();
        }
        const skill_dependents = ["CON", "DEX", "INT"];
        const default_skills = ["夯", "速杀", "冰冷之触"];
        let skill:Map<string,string>;
        try{
            skill = new Map(skills.map((key, index) => [key, skill_dependents[index]]));
        }catch{
            skill = new Map(default_skills.map((key, index) => [key, skill_dependents[index]]));
        }
        
        const enemy = new potential_enemy(name,type,"",skill,items);
        this.enemy.push(enemy);
    }

    //计算exp 
    add_exp(enemys:enemy[]){
        // 计算总exp
        //每种类型的敌人基础exp为：100/200/300;
        const enemy_exp_dict = new Map<string,number>([["regular",100],["elite",200],["badass",300]]);

        let enemy_level_sum = 0;
        let enemy_attributes = 0;

        let ourside_level_sum = this.player.level;
        let ourside_attributes = this.player.CON+this.player.DEX+this.player.INT;

        let total_exp = 0;
        for(const enemy of enemys){
            total_exp += enemy_exp_dict.get(enemy.type)??0;
            enemy_level_sum += enemy.level;
            enemy_attributes += (enemy.CON+enemy.DEX+enemy.INT);
        }
        // 对敌方、我方的level以及三维分别求和做比较: 每多1个level+30;多一个attribute+5
        this.player.partyMembers.forEach((v,k)=>{
            ourside_level_sum += v.level;
            ourside_attributes += (v.CON+v.DEX+v.INT);
        });

        total_exp += (Math.max(0,30*(enemy_level_sum-ourside_level_sum))+Math.max(0,5*(enemy_attributes-ourside_attributes)));
        let per_exp = Math.ceil(total_exp/(this.player.partyMembers.size+1));
        this.player.changeStatus("exp",per_exp);
        this.player.partyMembers.forEach((v,k)=>{
            v.changeStatus("exp",per_exp);
        });
    }

    //计算获得金钱
    add_gold(enemys:enemy[]){
        const enemy_gold_dict = new Map<string,number>([["regular",10],["elite",30],["badass",50]]);
        let total_gold = 0;
        for(const enemy of enemys){
            total_gold += enemy_gold_dict.get(enemy.type)??0;
        }
        this.player.gold += total_gold;
    }

    build_enemy_team(npc_name:string[]=[]){
        // 如果npc_name合法的话；选择NPC列表和队友
        const enemys:enemy[] = [];
        this.NPCs.forEach((v,k) => {
            if(k in npc_name){
                enemys.push(v.convert_to_enemy());
                this.NPCs.delete(k);
            }
        })
        this.player.partyMembers.forEach((v,k) => {
            if(k in npc_name){
                enemys.push(v.convert_to_enemy());
                this.player.delete_partyMember(k);
            }
        })
        //如果npc_name不合法的话，根据当前刷新的敌人build
        if(npc_name.length==0 || enemys.length==0){
            const enemy_numbers = this.player.partyMembers.size+1;
            let mean_CON = this.player.CON;
            let mean_DEX = this.player.DEX;
            let mean_INT = this.player.INT;
            let mean_level = this.player.level;
            this.player.partyMembers.forEach(npc => {
                mean_CON += npc.CON;
                mean_DEX += npc.DEX;
                mean_INT += npc.INT;
                mean_level += npc.level;
            });

            mean_CON /= enemy_numbers;
            mean_DEX /= enemy_numbers;
            mean_INT /= enemy_numbers;
            mean_level /= enemy_numbers;

            for(let i=0;i<enemy_numbers;i++){
                let dice = Math.random();
                if(dice<=0.7){
                    enemys.push(this.enemy[0].CalculateAttributes(mean_CON,mean_DEX,mean_INT,mean_level));
                }else if(dice<=0.9){
                    enemys.push(this.enemy[1].CalculateAttributes(mean_CON,mean_DEX,mean_INT,mean_level));
                }else{
                    enemys.push(this.enemy[2].CalculateAttributes(mean_CON,mean_DEX,mean_INT,mean_level));
                }
            }
        }
        return enemys;
    }
    /**
     * 战斗
     * @param npc_name NPC名字，空着代表和刷新的小怪战斗
     */
    battle(npc_name:string[]=[]){
        //自动保存
        //this.save_to_file();
        //战前hp
        const hp_before = new Map<Player|NPC,number>([[this.player,this.player.hp]]);
        this.player.partyMembers.forEach(npc => {
            hp_before.set(npc,npc.hp);
        });
        //获取敌人
        let enemys = this.build_enemy_team(npc_name);

        const current_battle = new Battle(this.player,enemys);
        current_battle.battle();
        //处理死亡的情况
        if(this.player.hp<=0){
            //this.load_from_file("autosave.sav")
            return JSON.stringify(current_battle.logs)
        }
        //处理战后事件；掉落、血量对齐
        let threshold = 0.5;
        let dice = Math.random();
        for(let i=0;i<enemys.length;i++){
            enemys[i].items.forEach((v,k)=>{
                dice = Math.random();
                if(enemys[i].type=="badass" || dice<threshold){
                    this.gainItem("self",k,v);
                }
            })
        }

        //血量保底0.25
        this.player.hp = Math.max(this.player.hp+this.player.CON*2,Math.floor(((this.player.CON+5)*this.player.level+30)*0.25));
        this.player.partyMembers.forEach(npc => {
            npc.hp = Math.max(npc.hp+npc.CON*2,Math.floor(((npc.CON+5)*npc.level+30)*0.25));
        })
        //exp
        this.add_exp(enemys);
        this.add_gold(enemys);
        let enemy_team = ""
        enemys.forEach(v=>{
            enemy_team += v.name+"、"
        })
        this.buildPrompt(`玩家一行人战胜了${enemy_team.slice(0,enemy_team.length-1)}`);
        this.worldViews.get(this.current_world)?.addDynamicEvent(`\n玩家一行人战胜了${enemy_team.slice(0,enemy_team.length-1)}`)
        return JSON.stringify(current_battle.logs)
    }
    /** 
     * 更改状态
     * @npc NPC名称 "self"代表玩家自己
     * @name 状态名称，必须是hp/mp/CON/DEX/INT/EGO/morality/exp/gold这几个中的1个
     * @value 状态值增加多少；如果是负数就代表减去对应值。
    */
     changeStatus(npc:string,name: string, value: number) {
        if(npc=="self"){
            this.player.changeStatus(name,value);
        }else{
            const current_npc = this.NPCs.get(npc);
            if(!current_npc){
                return
            }
            current_npc.changeStatus(name,value);
        }
    }

    /**绑定技能，做成按钮 
     * @npc NPC名称 "self"代表玩家自己
     * @skill 技能
    */
    boundCombatAttribute(npc:string,skill:Skill){
        if(npc=="self"){
            this.player.boundCombatAttribute(skill);
        }else{
            const current_npc = this.NPCs.get(npc);
            if(!current_npc){
                return
            }
            current_npc.boundCombatAttribute(skill);
        }
    }

    /** 
     * 添加技能
     * @npc NPC名称 "self"代表玩家自己
     * @name 技能名称
     * @description 技能描述
     * @dependent 技能的效果和哪个属性挂钩？必须是CON/DEX/INT这几个中的1个
    */
    addSkill(npc:string,name:string,description:string,dependent:string){
        if(npc=="self"){
            this.player.addSkill(name,description,dependent);
            this.buildPrompt(`${this.player.name}习得技能：${name}`);
        }else{
            const current_npc = this.NPCs.get(npc);
            if(!current_npc){
                return
            }
            current_npc.addSkill(name,description,dependent);
            this.buildPrompt(`${current_npc.name}习得技能：${name}`);
        }
    }

    /**
   * 获取物品
   * @npc NPC名称 "self"代表玩家自己
   * @name - 物品名称
   * @description - 物品描述
   */
    gainItem(npc:string,name:string,description:string){
        if(npc=="self"){
            this.player.gainItem(name,description);
            this.buildPrompt(`${this.player.name}获得物品：${name}`);
        }else{
            const current_npc = this.NPCs.get(npc);
            if(!current_npc){
                return
            }
            current_npc.gainItem(name,description);
            this.buildPrompt(`${current_npc.name}获得物品：${name}`);
        }
    }

    /**
   * 减少物品
   * @npc NPC名称 "self"代表玩家自己
   * @name - 物品名称
   * @description - 物品描述
   */
    minusItem(npc:string,name:string,description:string){
        if(npc=="self"){
            this.player.minusItem(name,description);
            this.buildPrompt(`${this.player.name}失去物品：${name}`);
        }else{
            const current_npc = this.NPCs.get(npc);
            if(!current_npc){
                return
            }
            current_npc.minusItem(name,description);
            this.buildPrompt(`${current_npc.name}失去物品：${name}`);
        }
    }
    /**
     * 更新任务栏中的文本
     * @param s 更新后的文本
     */
    refresh_quest(s:string){
        this.quests = s;
    }

    /**
     * 给到文生图模型的提示词
     * 两种情况调用：
     * 1、新增NPC时，触发函数，给NPC一个像素头像
     * 2、模型自主决定是否调用
     * @prompt 提示词
     */
    text2Img(prompt:string){
        this.text2Img_prompt.push(prompt);
    }

    clearText2Img(){
        this.text2Img_prompt = [];
    }
    
    /**
     * 将用户的行为信息给到各个NPC/队友
     * @param s 给到各个NPC/队友的新增提示词
     */
    buildPrompt(s:string,For_NPC_Respond:boolean=false){
        this.NPCs.forEach((v)=>{
            v.current_prompt+="\n"+s;
        });
        this.player.partyMembers.forEach((v)=>{
            v.current_prompt+="\n"+s;
        })
        if(For_NPC_Respond){
            this.built_Prompt_for_NPCs = true
        }
    }

    // clearPrompt(){
    //     this.prompt_for_NPCs = [];
    // }

    //其他所有逻辑处理完之后，再处理betrayal
    betrayal(){
        let betrayals:string[] = [];
        this.NPCs.forEach(npc =>{
            if(npc.hate){
                betrayals.push(npc.name);
                this.buildPrompt(`${npc.name}无法容忍玩家，开始了攻击！`);
            }
        });
        this.player.partyMembers.forEach(npc =>{
            if(npc.hate){
                betrayals.push(npc.name);
                this.buildPrompt(`${npc.name}无法容忍玩家，开始了攻击！`);
            }
        });
        if(betrayals.length>0){
            return JSON.stringify(this.battle(betrayals));
        }else{
            return null
        }
    }

    //结局,生成1个Prompt

    // 结局函数，生成结局提示词
    end(
        ending_with_high_EGO_and_high_morality: string,
        ending_with_low_EGO_and_low_morality: string,
        ending_with_high_EGO_and_low_morality: string,
        ending_with_low_EGO_and_high_morality: string,
        morality_threshold: number,
        EGO_threshold: number
    ) {
        let worldViewsStr = "";
        this.worldViews.forEach(worldview => {
        if (worldview.name !== "奇点侦测站") {
            worldViewsStr += `${worldview.name}: ${worldview.toPromptString({ includeRelationships: true, maxDynamicEvents: 1000 })}\n\n`;
        }
        });
    
        let NPCsStr = "";
        this.NPCs.forEach(npc => {
        NPCsStr += `${npc.name}: ${npc.current_prompt}\n`;
        });
    
        let playerEnding = "";
        if (this.player.morality >= morality_threshold) {
        if (this.player.EGO >= EGO_threshold) {
            playerEnding = ending_with_high_EGO_and_high_morality;
        } else {
            playerEnding = ending_with_low_EGO_and_high_morality;
        }
        } else {
        if (this.player.EGO >= EGO_threshold) {
            playerEnding = ending_with_high_EGO_and_low_morality;
        } else {
            playerEnding = ending_with_low_EGO_and_low_morality;
        }
        }
    
        // 构建最终提示词
        this.ending_prompt = `
        游戏已结束。请根据以下信息生成结局描述，仿照《辐射》系列的风格，为每个世界和NPC提供结局叙述。忽略信息不足的NPC。
        ## 世界观信息：
        \`\`\`
        ${worldViewsStr}
        \`\`\`
        ## NPC历史信息：
        \`\`\`
        ${NPCsStr}
        \`\`\`
        ## 玩家结局大意（请润色后使用）：
        \`\`\`
        ${playerEnding}
        \`\`\`
        请首先生成各个世界的结局描述，然后描述NPC的结局（如果该NPC有足够信息），最后详细描述玩家的结局。确保整体叙述连贯、富有沉浸感。
        `.trim();
        return;
    }
}