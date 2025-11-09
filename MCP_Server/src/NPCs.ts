import { Player } from "./Player";
import { Skill } from "./Skill";
import { enemy } from "./enemy";
import { Character } from "./Character";
interface ConversationMessage {
    speaker: string;
    message: string;
    context: 'public' | 'private';
    isRespond: boolean;
    timestamp: number;
}

export class NPC extends Character{
    constructor(
        public name:string,
        public hp: number, // 默认30 后续应当测试一下把这个数字调好
        public mp: number, // 默认10 后续测试
        public CON: number, //体质或力量；默认10，下同
        public DEX: number, //感知
        public INT: number, //智力
        public EGO: number, //自我 此处无用
        public morality:number, //道德 此处无用
        public level:number,//等级
        public exp:number,//经验值；满1000就进行升级操作
        public CombatAttribute:Skill | null,
        public profile:string,// base64像素人物
        public character_design: string,
        public hate:boolean=false,
        public potential_member = false,
        public summary_prompt = "",
        public current_prompt:string="",
        protected _skills: Skill[] = [], //技能
        protected _items:Map<string, number>  = new Map<string, number>(), //道具
        protected _partys: Map<string,NPC> = new Map<string,NPC>(), //队友 此处无用
        protected _dependent_infos = new Map<string,number>(),
        protected _conversationHistory: ConversationMessage[] = []
    ){
        super(name,hp,mp,CON,DEX,INT,EGO,morality,level,exp,0,CombatAttribute,profile,_skills,_items,_dependent_infos);
    }

    //保存读取
    NPC_toJSON() {
        // 原有技能处理
        const skills: {
            name: string;
            description: string;
            dependent: string;
        }[] = [];
        this._skills.forEach(s => {
            skills.push(s.toJSON());
        });
        
        const conversationHistory = this._conversationHistory.map(msg => ({
            speaker: msg.speaker,
            message: msg.message,
            context: msg.context,
            isRespond:msg.isRespond,
            timestamp: msg.timestamp
        }));
        
        return {
            name: this.name,
            hp: this.hp,
            mp: this.mp,
            CON: this.CON,
            DEX: this.DEX,
            INT: this.INT,
            EGO: this.EGO,
            morality: this.morality,
            level: this.level,
            exp: this.exp,
            CombatAttribute: this.CombatAttribute ? {
                name: this.CombatAttribute.name,
                description: this.CombatAttribute.description,
                dependent: this.CombatAttribute.dependent
            } : null,
            profile: this.profile,
            _skills: [...skills],
            _items: Array.from(this._items.entries()),
            _dependent_infos: Array.from(this._dependent_infos.entries()),
            character_design: this.character_design,
            summary_prompt: this.summary_prompt,
            current_prompt: this.current_prompt,
            hate: this.hate,
            potential_member: this.potential_member,
            // 新增对话历史
            _conversationHistory: conversationHistory
        };
    }

    /**
     * 从JSON数据加载NPC状态
     * @param data 从文件加载的NPC数据
     */
     NPC_load(data: any) {
        // 加载基本属性
        this.name = data.name;
        this.hp = data.hp;
        this.mp = data.mp;
        this.CON = data.CON;
        this.DEX = data.DEX;
        this.INT = data.INT;
        this.EGO = data.EGO;
        this.morality = data.morality;
        this.level = data.level;
        this.exp = data.exp;
        
        // 加载战斗属性
        if (data.CombatAttribute === null) {
            this.CombatAttribute = null;
        } else {
            this.CombatAttribute = new Skill(
                data.CombatAttribute.name,
                data.CombatAttribute.description,
                data.CombatAttribute.dependent
            );
        }
        
        // 加载其他属性
        this.profile = data.profile;
        this.character_design = data.character_design;
        this.summary_prompt = data.summary_prompt;
        this.current_prompt = data.current_prompt;
        this.hate = data.hate || false;
        this.potential_member = data.potential_member || false;
        
        // 加载技能
        this._skills = [];
        if (data._skills) {
            data._skills.forEach((s: { name: string; description: string; dependent: string; }) => {
                this._skills.push(new Skill(s.name, s.description, s.dependent));
            });
        }
        
        // 加载物品
        this._items = new Map();
        if (data._items) {
            this._items = new Map(data._items);
        }
        
        // 加载依赖信息
        this._dependent_infos = new Map();
        if (data._dependent_infos) {
            this._dependent_infos = new Map(data._dependent_infos);
        }
        
        // 加载对话历史
        this._conversationHistory = [];
        if (data._conversationHistory) {
            // 确保每个消息都有正确的结构
            this._conversationHistory = data._conversationHistory.map((msg: any) => ({
                speaker: msg.speaker || "",
                message: msg.message || "",
                context: msg.context || "public",
                isRespond: msg.isRespond || false,
                timestamp: msg.timestamp || Date.now(),
            }));
        }
    }

    /**
     *给人物添加设定，当人物遇到某些问题时转换心态所用的。
     *@param new_info 新增的设定。
    */
    add_character_design(new_info:string){
        this.character_design += "\n"+new_info;
    }

    convert_to_enemy(){
        const items:Map<string, string> = new Map<string, string>();
        let item_arr = [];
        this._items.forEach((_,k) => {
            try {
                item_arr = k.split("*#*#*");
                items.set(item_arr[0].replace("item-",""),item_arr[1]);
            } catch (error) {
                console.log(error);
            }
        })
        return new enemy(this.name,this.profile,"badass",this.hp,this.mp,this.CON,this.DEX,this.INT,this.level,this.CombatAttribute,items);
    }
    // 当NPC决定要和主角成为队友时
    add_to_potential_member(){
        this.potential_member=true;
    }

    /**
     * 背叛，要和主角为敌。
     */
    Betrayal(){
        this.hate=true;
    }
    
    /**
     * @param summary 对NPC在上一个世界的经历进行提炼摘要
     */
    summary(summary:string){
        this.summary_prompt += `${summary}\n`;
        this.current_prompt = "";
        this._conversationHistory = [];
    }

    /**
     * @param talk 是否开口说话
     * @returns 
     */
    decide_to_talk(talk:boolean){
        return talk;
    }

     /**
     * 添加对话消息
     * @param speaker 发言者名称
     * @param message 消息内容
     * @param context 对话上下文('public'或'private')
     */
      addConversationMessage(
        speaker: string, 
        message: string, 
        isRespond: boolean,
        context: 'public' | 'private' = 'public', 
    ): void {
        this._conversationHistory.push({
            speaker,
            message,
            context,
            isRespond,
            timestamp: Date.now()
        });
        
        // 限制历史记录长度，防止过长
        // if (this._conversationHistory.length > 500) {
        //     this._conversationHistory = this._conversationHistory.slice(-500);
        // }
    }


    /**
     * 构建对话提示词
     * @param context 对话上下文('public'或'private')
     * @param participants 参与者列表(私聊时需要)
     */
     buildPrompt(context: 'public' | 'private' = 'public', participants: string[] = []): any[] {
        // 基础角色信息
        const basePrompt = `
        # 角色信息
        ${this.summary_prompt}
        ${this.character_design}

        # 当前情境
        ${this.current_prompt}

        # 对话规则
        ${context === 'public' ? 
            '你正在参与公共聊天，所有玩家和NPC都能看到你的发言。请根据对话上下文以及MCP中提供的工具决定回应以及行动。' : 
            `你正在与${participants.filter(p => p !== this.name).join('、')}进行私人对话，只有你们能看见这些消息。请根据对话上下文以及MCP中提供的工具决定回应以及行动。`}
        `.trim();
        
        // 获取相关对话历史
        const relevantHistory = this._conversationHistory;
        
        // 转换为OpenAI消息格式
        const messages: any[] = [
        ];

        const user_input: string[] = []
        // 添加历史消息，标记上下文
        if(relevantHistory.length>0){
            relevantHistory.forEach(msg => {
                const contextPrefix = msg.context === 'public' ? '【公聊】' : '【私聊】';
                if(msg.isRespond){
                    if(user_input.length>0){
                        messages.push({role: "user",content: user_input.join("\n")})
                        user_input.length=0;
                    }
                    messages.push({role: "assistant",content: `${msg.message}`})
                }else{
                    user_input.push(`${contextPrefix}【${msg.speaker}】: ${msg.message}`);
                }
            });
        }
        if(user_input.length>0){
            messages.push({role: "user",content: user_input.join("\n")})
            user_input.length=0;
        }
        messages.push({ role: "system", content: basePrompt })
        
        return messages;
    }
    
}