export interface WorldViewJson {
  name: string;
  baseLayer: string;
  dynamicLayer: string;
  relationships: [string, {
    attitude: "hostile" | "neutral" | "friendly" | "allied";
    lastEvent: string;
    tensionLevel: number;
  }][];
}
export class WorldView {
  readonly name: string;

  // 分层存储结构
  private baseLayer: string;      // 基础设定（不可变）
  private dynamicLayer: string;   // 动态事件（可追加）
  private relationships: Map<string, { // 势力关系网络
    attitude: "hostile" | "neutral" | "friendly" | "allied";
    lastEvent: string;
    tensionLevel: number;  // 0-100 紧张度
  }>;

  constructor(
    name: string,
    baseLayer: string,
    dynamicLayer:string="",
    relationships:Map<any,any>=new Map()
  ) {
    this.name = name;
    this.baseLayer = baseLayer;
    this.dynamicLayer = dynamicLayer;
    this.relationships = relationships;
  }

  // ===== 核心方法：转换为LLM提示词 =====
  toPromptString(options?: { 
    includeRelationships?: boolean; 
    maxDynamicEvents?: number 
  }): string {
    const opts = {
      includeRelationships: true,
      maxDynamicEvents: 5,
      ...options
    };
    
    // 构建基础提示模板
    let prompt = `## [世界: ${this.name}]\n` +
                 `### 基础设定\n${this.baseLayer}\n` +
                 `### 动态事件\n${this.getRecentDynamicEvents(opts.maxDynamicEvents)}`;
    
    // 添加关系网络
    if (opts.includeRelationships && this.relationships.size > 0) {
      prompt += `\n### 势力关系\n`;
      
      this.relationships.forEach((rel, factions) => {
        const tensionIcon = rel.tensionLevel > 75 ? "🔥" : 
                           rel.tensionLevel > 50 ? "⚠️" : "⚖️";
        
        prompt += `- ${factions}: [${rel.attitude.toUpperCase()}] ${tensionIcon} ` +
                  `(最近事件: ${rel.lastEvent})\n`;
      });
    }

    // “痛苦共鸣”
    if(this.name!="奇点侦测站"){
      prompt += `** 玩家特殊能力：“痛苦共鸣” *:
      玩家可以主动消耗自己的5点“自我值”感知到他人心中难以察觉的痛苦。
      也能消耗自身20点“自我值”，让其他各个NPC之间都能够感知到相互之间内心的痛苦。（最终会在buildPrompt函数调用中体现）
      当自我值为0时，不再可用这个特殊能力。\n`
    }
    
    return prompt;
  }

  // 获取最近动态事件（防止过长）
  private getRecentDynamicEvents(maxEvents: number): string {
    const events = this.dynamicLayer.split('\n').filter(e => e.trim() !== '');
    const recent = events.slice(-maxEvents);
    return recent.length > 0 ? recent.join('\n') : "暂无新动态";
  }

  // ===== 更新方法 =====
  addDynamicEvent(event: string): void {
    this.dynamicLayer += `${event}\n`;
  }

  updateRelationship(
    factionA: string,
    factionB: string,
    attitude: "hostile" | "neutral" | "friendly" | "allied",
    eventDescription: string,
    tensionChange: number = 0
  ): void {
    const key = this.normalizeRelationshipKey(factionA, factionB);
    
    const current = this.relationships.get(key) || {
      attitude: "neutral",
      lastEvent: "",
      tensionLevel: 50
    };
    
    // 更新关系状态
    this.relationships.set(key, {
      attitude,
      lastEvent: eventDescription,
      tensionLevel: Math.max(0, Math.min(100, current.tensionLevel + tensionChange))
    });
  }

  // 关系键标准化 (按字母排序)
  private normalizeRelationshipKey(factionA: string, factionB: string): string {
    return [factionA, factionB].sort().join(' ↔ ');
  }

  toJson():WorldViewJson {
    // 将Map转换为关系数组
    const relationships: [string, {
      attitude: "hostile" | "neutral" | "friendly" | "allied";
      lastEvent: string;
      tensionLevel: number;
    }][] = [];
    
    this.relationships.forEach((value, key) => {
      relationships.push([key, value]);
    });

    return {
      name: this.name,
      baseLayer: this.baseLayer,
      dynamicLayer: this.dynamicLayer,
      relationships
    };
  }

  static fromJson(json: WorldViewJson): WorldView {
    // 重建关系Map
    const relationships = new Map<string, any>();
    
    json.relationships.forEach(([key, value]) => {
      relationships.set(key, value);
    });

    return new WorldView(
      json.name,
      json.baseLayer,
      json.dynamicLayer,
      relationships
    );
  }
}