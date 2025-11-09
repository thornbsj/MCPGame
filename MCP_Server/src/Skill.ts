export class Skill{
    constructor(
        public name: string,//名称
        public description:string, //给玩家看的描述
        public dependent: string //依赖于玩家的哪项指标
    ){}

    toJSON() {
        return {
            name:this.name,
            description:this.description,
            dependent:this.dependent
        }
    }

    equals(other: Skill): boolean {
    return this.name === other.name &&
           this.description === other.description &&
           this.dependent === other.dependent;
    }
}