/* eslint-disable prettier/prettier */
import axios from 'axios'
import * as Jimp from 'jimp';
import { SharedState } from '../../stores/shared';

// 定义请求和响应的接口类型
interface Input {
  prompt: string
  negative_prompt: string
}

interface Parameters {
  watermark: boolean
  size: string
  n: number
  prompt_extend: boolean
}

interface RequestData {
  model: string
  input: Input
  parameters: Parameters
}

interface Output {
  task_id: string
  task_status: string
}

interface ApiResponse {
  request_id: string
  output: Output
}

/**
 * 将图片URL转换为Base64字符串
 * @param imageUrl 图片URL
 * @returns Base64字符串
 */
async function imageUrlToBase64(imageUrl: string, width: number, height: number): Promise<string> {
  try {
    const image = await Jimp.Jimp.read(imageUrl);
    image.resize({
      w:width,
      h:height
    });

    // 获取base64
    const base64 = await image.getBase64(Jimp.JimpMime.png);
    return base64;
  } catch (error) {
    console.error('图片处理失败:', error)
    return ''
  }
}

async function waitAsync(n: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, n * 1000))
}

/**
 * 文生图函数
 * @param apiKey 阿里云API Key
 * @param text 生成图片的提示词
 * @model 模型
 * @width 宽度
 * @height 高度
 * @returns Base64格式的图片字符串，失败时返回空字符串
 */
export async function textToImage(
  store: SharedState,
  text: string,
  width: number,
  height: number,
): Promise<string> {
  try {
    // 构建请求数据
    const requestData: RequestData = {
      model: store.img_generation_model,
      input: {
        prompt: text,
        negative_prompt: ''
      },
      parameters: {
        watermark: false,
        size: `1024*1024`,
        n: 1,
        prompt_extend: true
      }
    }

    // 发送API请求
    const response = await axios.post<ApiResponse>('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', requestData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${store.img_generation_apikey}`,
        'X-DashScope-Async': 'enable'
      },
      timeout: 60000 // 60秒超时
    })
    console.log(response.data.output)

    const task_id = response.data.output.task_id

    // 等到请求完之后拿图片
    let completed = false
    enum incomplete {
      'PENDING',
      'RUNNING'
    }
    const BeginTime = Date.now()
    const maxixmum_time = 60

    while (!completed) {
      const imgResponse = await axios.get(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${task_id}`,
        {
          headers: {
            Authorization: `Bearer ${store.img_generation_apikey}`
          }
        }
      )
      if (imgResponse.data.output.task_status in incomplete) {
        await waitAsync(1)
        if ((Date.now() - BeginTime) / 1000 >= maxixmum_time) {
          completed = true
          console.log('超时')
        }
      } else if (imgResponse.data.output.task_status === 'SUCCEEDED') {
        const res = imageUrlToBase64(imgResponse.data.output.results[0].url, width, height)
        return res
      } else {
        console.log('失败')
        return ''
      }
    }
    return ''
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API请求错误:', error.response?.data || error.message)
    } else {
      console.error('发生错误:', error)
    }
    return ''
  }
}


import img_profiles from './img_profiles'

export function get_image(index: number) {
  return (
    img_profiles.img_base64.get(`img_${index}_left`) ?? img_profiles.img_base64.get(`img_1_left`)
  )
}
