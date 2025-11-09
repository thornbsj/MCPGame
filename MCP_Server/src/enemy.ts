import { Skill } from "./Skill";
export class potential_enemy{
    constructor(
        public name:string,
        public type:string,//regular/elite/badass
        public profile:string,//base64
        public skills:Map<string, string> = new Map<string, string>(), //技能 3个
        public items:Map<string, string> = new Map<string, string>(), //会掉落的道具,不超过2个,键值对为name:description
        public gold:number=10
    ){}

    toJson(){
        return{
            name:this.name,
            type:this.type,
            profile:this.profile,
            skills:Array.from(this.skills),
            items:Array.from(this.items)
        }
    }
    
    CalculateAttributes(mean_CON:number,mean_DEX:number,mean_INT:number,mean_level:number){
        const attributes = ["CON","DEX","INT"];
        const dependent = attributes[Math.floor(Math.random()*3)]
        let skill:Skill = new Skill("","","");
        let level = Math.floor(mean_level);
        let CON=0;
        let DEX = 0;
        let INT = 0;
        const swap_skill = new Map<string, string>()
        for (const [key, value] of this.skills) {
            swap_skill.set(value, key);
        }
        if(this.type=="regular"){
            CON=Math.floor(mean_CON*0.9);
            DEX = Math.floor(mean_DEX*0.9);
            INT = Math.floor(mean_INT*0.9);
            skill.name = swap_skill.get(dependent) ?? "莽";
            skill.dependent = dependent;
        }else if(this.type=="elite"){
            CON=Math.floor(mean_CON);
            DEX = Math.floor(mean_DEX);
            INT = Math.floor(mean_INT);
            skill.name = swap_skill.get(dependent) ?? "莽";
            skill.dependent = dependent;
        }else{
            CON=Math.floor(mean_CON);
            DEX = Math.floor(mean_DEX);
            INT = Math.floor(mean_INT);
            skill.name = swap_skill.get(dependent) ?? "莽";
            skill.dependent = "badass";
        }

        //计算hp和mp
        const hp = Math.floor((30+5*level+CON*level)*0.7);
        const mp = 10+3*level+INT*level;
        
        const one_enemy = new enemy(this.name,this.profile,this.type,hp,mp,CON,DEX,INT,level,skill,this.items);
        return one_enemy;
    }
}

export class enemy{
    constructor(
        public name:string,
        public profile:string,
        public type:string,//regular/elite/badass
        public hp: number, // 默认30 后续应当测试一下把这个数字调好
        public mp: number, // 默认10 后续测试
        public CON: number, //体质或力量；默认10，下同
        public DEX: number, //感知
        public INT: number, //智力
        public level:number,//等级
        public CombatAttribute:Skill | null, //技能
        public items = new Map<string, string>(), //会掉落的道具,不超过2个,键值对为name:description
        public gold:number=10
    ){}
    getAtttributes(s:string){
        switch(s){
            case 'hp': return this.hp;
            case 'mp': return this.mp;
            case 'CON': return this.CON;
            case 'DEX': return this.DEX;
            case 'INT': return this.INT;
            case 'level': return this.level;
            default: return this.hp;
        }
    }
}