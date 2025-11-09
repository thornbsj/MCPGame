import { Skill } from "./Skill";
import { NPC } from "./NPCs";
import { Character } from "./Character";
export class Player extends Character{
    constructor(
        public name:string,
        public hp: number, // 默认30 后续应当测试一下把这个数字调好
        public mp: number, // 默认10 只在非战斗时有用
        public CON: number, //体质或力量；默认10，下同
        public DEX: number, //感知
        public INT: number, //智力
        public EGO: number, //自我
        public morality:number, //道德
        public level:number,//等级
        public exp:number,//经验值；满1000就进行升级操作
        public gold:number,//钱
        public CombatAttribute:Skill | null,//选定的战斗属性
        public profile:string,// base64像素人物
        protected _skills: Skill[] = [], //技能
        protected _items = new Map<string, number>(), //道具
        protected _partys: Map<string,NPC> = new Map<string,NPC>(), //队友
        protected _dependent_infos = new Map<string,number>() //技能使用后的频数
    ){
        super(name,hp,mp,CON,DEX,INT,EGO,morality,level,exp,gold,CombatAttribute,profile,_skills,_items,_dependent_infos)
    }

    //保存读取
    toJSON() {
        //skills处理
        const skills: {
            name: string;
            description: string;
             dependent: string;
        }[] = [];
        this._skills.forEach(s=>{
            skills.push(s.toJSON());
        })
        const partys:{
            name:string,
            hp:number,
            mp:number,
            CON:number,
            DEX:number,
            INT:number,
            EGO:number,
            morality:number,
            level:number,
            exp:number,
            CombatAttribute:{
                name:string,
                description:string,
                dependent:string
            }|null,
            profile:string,
            _skills:{
                        name: string;
                        description: string;
                        dependent: string;
                    }[],
            _items:Array<[string, number]>,
            _dependent_infos:Array<[string, number]>
        }[] = [];
        this._partys.forEach(
            s => {partys.push(s.NPC_toJSON())}
        )
        return{
            name:this.name,
            hp:this.hp,
            mp:this.mp,
            CON:this.CON,
            DEX:this.DEX,
            INT:this.INT,
            gold:this.gold,
            EGO:this.EGO,
            morality:this.morality,
            level:this.level,
            exp:this.exp,
            CombatAttribute:this.CombatAttribute?{
                name:this.CombatAttribute.name,
                description:this.CombatAttribute.description,
                dependent:this.CombatAttribute.dependent
            }:null,
            profile:this.profile,
            _skills:[...skills],
            _items:Array.from(this._items.entries()),
            _partys:[...partys],
            _dependent_infos:Array.from(this._dependent_infos.entries())
        }
    }

    load_party(data:any){
        let CombatAttribute:Skill | null = null
        if(data.CombatAttribute != null){
            CombatAttribute = new Skill(data.CombatAttribute.name,data.CombatAttribute.description,data.CombatAttribute.dependent)
        }
        const _skills:Skill[] = []
        data._skills.forEach(
            (s: { name: string; description: string; dependent: string; })=>{
                _skills.push(new Skill(s.name,s.description,s.dependent))
            }
        )
        return new NPC(
            data.name,
            data.hp,
            data.mp,
            data.CON,
            data.DEX,
            data.INT,
            data.EGO,
            data.morality,
            data.level,
            data.exp,
            CombatAttribute,
            data.profile,
            data.character_design,
            false,
            false,
            data.summary_prompt,
            data.current_prompt,
            _skills,
            new Map(data._items),
            new Map<string,NPC>(),
            new Map(data._dependent_infos)
        )
    }

    load(data:any){
        this.name=data.name;
        this.hp=data.hp;
        this.mp=data.mp;
        this.CON=data.CON;
        this.DEX=data.DEX;
        this.INT=data.INT;
        this.gold = data.gold;
        this.EGO=data.EGO;
        this.morality=data.morality;
        this.level=data.level;
        this.exp=data.exp;
        if(data.CombatAttribute===null){
            this.CombatAttribute=null;
        }else{
            this.CombatAttribute=new Skill(data.CombatAttribute.name,data.CombatAttribute.description,data.CombatAttribute.dependent);
        };
        this.profile=data.profile;
        this._skills = [];
        data._skills.forEach((s: { name: string; description: string; dependent: string; })=>{
            this.skills.push(new Skill(s.name,s.description,s.dependent));
        });
        this._items = new Map(data._items);
        this._partys.clear();

        data._partys.forEach(
            (s:any)=>{
                this._partys.set(s.name,this.load_party(s));
            }
        )

        this._dependent_infos = new Map(data._dependent_infos);
    }

    get partyMembers(): Map<string,NPC> {
        return this._partys;
    }

    delete_partyMember(npc_name:string){
        this._partys.delete(npc_name);
    }

    add_partyMembers(npc:NPC){
        this._partys.set(npc.name,npc);
    }
}