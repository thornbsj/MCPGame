import { enemy } from "./enemy";
import { NPC } from "./NPCs";
import { Player } from "./Player";
import { Skill } from "./Skill";


export class BattleLog{
    constructor(
        public attacker_type:string,
        public defender_type:string,
        public attacker_index:number,
        public defender_index:number,
        public damage:number
    ){}
}

class BattleLog_meta{
    constructor(
        private type:string,
        private profile:string[]=[],
        private skill_name:string[]=[],
        private skill_dependent:string[]=[],
        private hp:number[]=[],
        private name:string[] = []
    ){}

    public add_Meta_Data(character:NPC|Player|enemy){
        this.profile.push(character.profile);
        if(character.CombatAttribute === null){
            this.skill_name.push("本能")
            this.skill_dependent.push("Nothing")
        }else{
            this.skill_name.push(character.CombatAttribute.name)
            this.skill_dependent.push(character.CombatAttribute.dependent)
        }
        this.hp.push(character.hp)
        this.name.push(character.name)
    }
}

export class Battle{
    constructor(
        public player: Player,
        public enemys: enemy[],
        public player_npc_seq:Map<NPC|Player|enemy,number> = new Map<NPC|Player|enemy,number>(),
        public enemy_seq:Map<NPC|Player|enemy,number> = new Map<NPC|Player|enemy,number>(),
        public logs:Array<BattleLog|BattleLog_meta>=[] //战斗日志：攻击方 -> 防守方 -> 造成了多少伤害
    ) {}

    private calculateAdvantage(attacker: Skill|null, defender: Skill|null): number {
        //没有技能
        if(attacker === null || attacker === undefined){
            return 0.9;
        }
        if(defender === null || defender === undefined){
            return 1;
        }
        //badass技能
        if(attacker.dependent === 'badass'){
            return 1;
        }
        if(defender.dependent === 'badass'){
            return 0.9;
        }
        //没有技能（技能设定有误的情况）
        if(attacker.dependent === null || attacker.dependent === undefined){
            return 0.9;
        }
        if(defender.dependent === null || defender.dependent === undefined){
            return 1;
        }
        //体质->感知->智力->体质 剪刀石头布
        if (
            (attacker.dependent === 'CON' && defender.dependent === 'DEX') ||
            (attacker.dependent === 'DEX' && defender.dependent === 'INT') ||
            (attacker.dependent === 'INT' && defender.dependent === 'CON')
        ) {
            return 1;
        } else if (attacker.dependent === defender.dependent) {
            return 0.9; // 平局
        } else {
            return 0.8; // 被克
        }
    }

    private calculateBlock(
        attacker:Player|NPC|enemy,
        defender:Player|NPC|enemy
    ){
        const BaseRate=0.1;
        return Math.min(0.7,Math.max(BaseRate+(defender.getAtttributes("DEX")-attacker.getAtttributes("DEX"))*0.05,0));
    }

    private calculateDouble(
        attacker:Player|NPC|enemy,
        defender:Player|NPC|enemy
    ){
        return Math.min(0.5,Math.max(0.05*(attacker.getAtttributes("DEX")-defender.getAtttributes("DEX")),0));
    }

    private OneTurnDamage(
        attacker:Player|NPC|enemy,
        defender:Player|NPC|enemy
    ): void {
        //格挡
        if(Math.random()<=this.calculateBlock(attacker,defender))return;

        // 基础伤害计算
        const advantage = this.calculateAdvantage(attacker.CombatAttribute, defender.CombatAttribute);
        let base_damage = 0;
        if(attacker.CombatAttribute===null || attacker.CombatAttribute===undefined || 
            attacker.CombatAttribute.dependent===null || attacker.CombatAttribute.dependent===undefined){
            base_damage = Math.floor((attacker.getAtttributes("CON")+attacker.getAtttributes("DEX")+attacker.getAtttributes("INT"))/3);
        }else{
            base_damage = attacker.getAtttributes(attacker.CombatAttribute.dependent);
        }

        let damage = base_damage*advantage;
        
        // 随机波动 (5%)
        const randomFactor = 1 + (Math.random()-0.5);
        damage *= randomFactor;
        
        // 防御减伤
        let defend_attribute = "CON";
        if(attacker.CombatAttribute?.dependent==="INT"){
            defend_attribute="INT";
        }
        const defenseReduction = defender.getAtttributes(defend_attribute) * 0.2;
        damage = Math.round(Math.max(1, damage - defenseReduction));
        defender.hp = Math.max(defender.hp-damage,0);

        // log
        let log = null;
        if(attacker instanceof enemy){
            log = new BattleLog(attacker.CombatAttribute?.dependent ?? "","player",this.enemy_seq.get(attacker)??0,this.player_npc_seq.get(defender)??0,damage);
        }else{
            log = new BattleLog(attacker.CombatAttribute?.dependent ?? "","enemy",this.player_npc_seq.get(attacker)??0,this.enemy_seq.get(defender)??0,damage);
        }
        this.logs.push(log);
    }
    
    private getOneDefender(defender_arr:Array<Player|NPC|enemy>){
        const potential_index:Array<number>=[];
        for(let i=0;i<defender_arr.length;i++){
            if(defender_arr[i].hp>0){
                potential_index.push(i);
            }
        }
        if(potential_index.length === 0) {
            return null;
        }
        return potential_index[Math.floor(Math.random()*potential_index.length)]
    }

    battle(){
        // 根据DEX设置先后顺序
        const DEX_dict = new Array();
        let player_npc = new Array();
        const OurSide_Meta = new BattleLog_meta("ourside")
        const Enemy_Meta = new BattleLog_meta("enemy")
        DEX_dict.push(this.player);
        player_npc.push(this.player);
        for (const npc of this.player.partyMembers.values()) {
            if(npc.hp>0){
                DEX_dict.push(npc);
                player_npc.push(npc);
            }
        }
        for(const one_enemy of this.enemys){
            DEX_dict.push(one_enemy);
        }
        let ourside_seq = 0;
        let enemyside_seq = 0;
        DEX_dict.sort((a, b) => b.DEX - a.DEX);
        for(let i=0;i<DEX_dict.length;i++){
            if(DEX_dict[i] instanceof enemy){
                this.enemy_seq.set(DEX_dict[i],enemyside_seq);
                Enemy_Meta.add_Meta_Data(DEX_dict[i])
                enemyside_seq++;
            }else{
                this.player_npc_seq.set(DEX_dict[i],ourside_seq);
                OurSide_Meta.add_Meta_Data(DEX_dict[i])
                ourside_seq++;
            }
        }

        this.logs.push(OurSide_Meta)
        this.logs.push(Enemy_Meta)
        let attacker = null;
        let defender = null;
        let dice = 0;
        while(this.enemys.reduce((sum, item) => sum + item.hp, 0)>0 && this.player.hp>0)
        {    
            for(const one of DEX_dict){
                if(one.hp<=0){
                    continue;
                }
                attacker = one;
                let defenderIndex: number | null;
                if(attacker instanceof enemy) {
                    defenderIndex = this.getOneDefender(player_npc);
                } else {
                    defenderIndex = this.getOneDefender(this.enemys);
                }
                if(defenderIndex === null) {
                    continue;
                }
                defender = this.enemys[defenderIndex];
                if(attacker instanceof enemy){
                    defender = player_npc[defenderIndex];
                }
                this.OneTurnDamage(attacker,defender);
                dice=Math.random();
                if(dice<=this.calculateDouble(attacker,defender) && defender.hp>0){this.OneTurnDamage(attacker,defender);}
            }
        }
    }
}