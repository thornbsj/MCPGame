import { readFileSync } from 'fs';
import { parse } from 'ini';
import { join } from 'path';

export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
}

export function loadConfig(): AppConfig {
  let configPath: string = join(__dirname, '..', 'config', 'config.ini');
  
  // if (typeof process.pkg !== 'undefined') {
  //   configPath = join(process.cwd(), 'config', 'config.ini');
  // } else {
  //   configPath = join(__dirname, '..', 'config', 'config.ini');
  // }
  
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const rawConfig = parse(configContent);
    
    return {
      server: {
        port: parseInt(rawConfig.server.port) || 3000,
        host: rawConfig.server.host || 'localhost'
      }
    };
  } catch (error) {
    console.warn('配置文件未找到或格式错误，使用默认配置');
    return {
      server: {
        port: 3000,
        host: 'localhost'
      }
    };
  }
}