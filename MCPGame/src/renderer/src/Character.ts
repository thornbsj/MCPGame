export class Skill {
  constructor(
    public name: string,
    public description: string,
    public dependent: string,
    public isBound: boolean = false
  ) {}
}

export interface ChangeSkillRequest {
  name: string
  skill_name: string
  skill_description: string
  skill_dependent: string
}

export interface CharacterData {
  name: string
  profile: string
  hp: number
  level: number
  exp: number
  expToNextLevel: number
  CON: number
  DEX: number
  INT: number
  skills: Skill[]
  CombatAttribute: Skill | null
  type: string
  can_be_recruited: boolean
  disabled: boolean
}
