
export default class Message {
  role: 'user' | 'system' | 'assistant' = 'user';
  content: string = '';

  constructor(role?: 'user' | 'system' | 'assistant', content?: string) {
    if (role) this.role = role;
    if (content) this.content = content;
  }

  toJson(): string {
    return JSON.stringify({
      role: this.role,
      content: this.content
    });
  }
}