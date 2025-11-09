/* eslint-disable prettier/prettier */
export class BattleLog {
  constructor(
    public attacker_type: string,
    public defender_type: string,
    public attacker_index: number,
    public defender_index: number,
    public damage: number
  ) {}
}

export class BattleLog_meta {
  constructor(
    public type: string,
    public profile: string[] = [],
    public skill_name: string[] = [],
    public skill_dependent: string[] = [],
    public hp: number[] = [],
    public name: string[] = []
  ) {}
}

export interface battle_player_constructor {
  image: string
  hp: number
  name: string
  skill: string
  dependent: string
}
