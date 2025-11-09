import Message from "./Message"

export class SharedState {
    constructor(
        public baseurl: string='',
        public apikey: string='',
        public modelName: string='',
        public temperature:number=0.5,
        public stream:boolean=false,
        public mini_model_baseurl: string='',
        public mini_model_apikey: string='',
        public mini_model: string='',
        public mini_model_temperature:number=0.5,
        public mini_model_stream:boolean=false,
        public async_dialogue: boolean=false,
        public img_generation: boolean=false,
        public img_generation_baseurl:string='',
        public img_generation_apikey:string='',
        public img_generation_model: string='',
        public MCP_Server:string='',
        public port:number=3000,
        public history:Message[] = [],
        public display_history:string[] = []
    ){}

    toJson(): string {
    return JSON.stringify({
      baseurl: this.baseurl,
      apikey: this.apikey,
      modelName: this.modelName,
      temperature: this.temperature,
      stream: this.stream,
      mini_model_baseurl: this.mini_model_baseurl,
      mini_model_apikey: this.mini_model_apikey,
      mini_model: this.mini_model,
      mini_model_temperature: this.mini_model_temperature,
      mini_model_stream: this.mini_model_stream,
      async_dialogue: this.async_dialogue,
      img_generation: this.img_generation,
      img_generation_baseurl: this.img_generation_baseurl,
      img_generation_apikey: this.img_generation_apikey,
      img_generation_model: this.img_generation_model,
      MCP_Server: this.MCP_Server,
      port: this.port,
      history: this.history.map(msg => JSON.parse(msg.toJson())),
      display_history: this.display_history
    });
    }
}