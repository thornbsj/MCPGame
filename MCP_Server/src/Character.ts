import { Skill } from "./Skill";
export class Character{
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
        protected _dependent_infos = new Map<string,number>() //技能使用后的频数
    ){
        this.clear_dependent_record()
    }

    getAtttributes(s:string){
        switch(s){
            case 'hp': return this.hp;
            case 'mp': return this.mp;
            case 'CON': return this.CON;
            case 'DEX': return this.DEX;
            case 'INT': return this.INT;
            case 'EGO': return this.EGO;
            case 'morality': return this.morality;
            case 'exp': return this.exp;
            case 'level': return this.level;
            default: return this.CON;
        }
    }

    get skills(): Skill[]{
        return this._skills;
    }
    get items(): Map<string, number> {
        return this._items;
    }
    
    public clear_dependent_record(){
        this._dependent_infos.set("CON",0);
        this._dependent_infos.set("DEX",0);
        this._dependent_infos.set("INT",0);
    }

    public add_dependent_record(dependent:string){
        const validDependents = ['CON', 'DEX', 'INT'];
        const finalDependent = validDependents.includes(dependent as string) ? dependent : 'CON';
        this._dependent_infos.set(finalDependent,(this._dependent_infos.get(finalDependent)) ?? 0+1);
    }

    recordSkillUse(dependent: string): void {
        this._dependent_infos.set(dependent, (this._dependent_infos.get(dependent) || 0) + 1);
    }

    getMostUsedAttributes(): string[] {
        const values = Array.from(this._dependent_infos.values());
        const maxCount = Math.max(...values);

        const mostUsed = [];
        for (const [attribute, count] of this._dependent_infos.entries()) {
            if (count === maxCount) {
            mostUsed.push(attribute);
            }
        }

        return mostUsed;
    }

    
    /** 
     * 更改状态
     * @name 状态名称，必须是hp/mp/CON/DEX/INT/EGO/morality/exp/gold这几个中的1个
     * @value 状态值增加多少；如果是负数就代表减去对应值。
    */
    changeStatus(name: string, value: number) {
    switch (name) {
        case 'hp': this.hp += value; break;
        case 'mp': this.mp += value; break;
        case 'CON': this.CON += value; break;
        case 'DEX': this.DEX += value; break;
        case 'INT': this.INT += value; break;
        case 'EGO': this.EGO += value; break;
        case 'morality': this.morality += value; break;
        case 'gold':this.gold += value; break;
        case 'exp': 
        this.exp += value; 
        if(this.exp>=1000){
            this.LevelUp()
            this.exp -= 1000;
        }
        break;
        default: break;
    }
    }
    
    /** 
    * 升级 根据使用技能的不同频率来增加属性
    * 最高频的属性+3~6点；而其他属性+1~3点。
    */
    LevelUp():Map<string, number>{
        const res =  new Map<string, number>();
        const mostUsed = this.getMostUsedAttributes();
        for (const attr of ['CON', 'DEX', 'INT'] as const) {
            if(mostUsed.includes(attr)){
                res.set(attr,Math.floor(Math.random()*4)+3);
            }else{
                res.set(attr,Math.floor(Math.random()*3)+1);
            }
        }
        res.set("hp",5+(res.get("CON") ?? 1)*2);
        res.set("mp",3+(res.get("INT") ?? 1)*2);
        this.hp += res.get("hp") ?? 10;
        this.mp += res.get("mp") ?? 3;
        this.CON += res.get("CON") ?? 1;
        this.DEX += res.get("DEX") ?? 1;
        this.INT += res.get("INT") ?? 1;
        return res;
    }

    /** 
     * 添加技能
     * @name 技能名称
     * @description 技能描述
     * @dependent 技能的效果和哪个属性挂钩？必须是CON/DEX/INT这几个中的1个
    */
    addSkill(name:string,description:string,dependent:string): void {
        const validDependents = ['CON', 'DEX', 'INT'];
        const finalDependent = validDependents.includes(dependent as string) ? dependent : 'CON';
        this._skills.push(new Skill(name,description,finalDependent));
    }

    /**绑定战斗技能 
     * @skill 技能类
    */
    boundCombatAttribute(skill:Skill){
        const exists = this.skills.some(skill => skill.equals(skill));
        if(this.CombatAttribute!=null && this.CombatAttribute.equals(skill)){
            this.CombatAttribute = null
        }else if(exists){
            this.CombatAttribute = skill;
        }
    }

    /**
   * 获取物品 做成这种情况是为了有“相同物品名称不同作用”的场景
   * 也没有办法做成ID，因为是AI生成的。不知道有没有更好的方法。
   * @param name - 物品名称
   * @param description - 物品描述
   */
    gainItem(name:string,description:string): void {
        const key = `item-${name}*#*#*${description}`;
        const currentCount = this._items.get(key) || 0;
        this._items.set(key, currentCount + 1);
    }

    /**
   * 失去/使用物品
   * @param name - 物品名称
   * @param description - 物品描述
   */
    minusItem(name:string,description:string): void {
        const key = `item-${name}*#*#*${description}`;
        const currentCount = this._items.get(key) || 0;
        this._items.set(key, currentCount - 1);
        if(this._items.get(key)==0){
            this._items.delete(key)
        }
    }

}