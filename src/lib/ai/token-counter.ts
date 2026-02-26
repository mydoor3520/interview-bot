import { encodingForModel } from 'js-tiktoken';
import { AIMessage } from './types';

// 지연 초기화: 첫 사용 시에만 토크나이저 로드 (콜드스타트 블로킹 방지)
let enc: ReturnType<typeof encodingForModel> | null = null;
let initAttempted = false;

function getEncoder(): ReturnType<typeof encodingForModel> | null {
  if (enc) return enc;
  if (initAttempted) return null;

  initAttempted = true;
  try {
    enc = encodingForModel('gpt-4'); // cl100k_base — Claude 전용 토크나이저 비공개이므로 근사치
  } catch (err) {
    console.error('[TokenCounter] Failed to load tiktoken encoder:', err);
  }
  return enc;
}

export function countTokens(text: string): number {
  const encoder = getEncoder();
  if (!encoder) return Math.ceil(text.length / 4); // fallback: 영문 기준 ~4자/토큰
  try {
    return encoder.encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export function countMessagesTokens(messages: AIMessage[]): number {
  // OpenAI 메시지 포맷 기준: 메시지당 ~4 토큰 오버헤드 + content
  return messages.reduce((sum, msg) => {
    let contentTokens: number;
    if (typeof msg.content === 'string') {
      contentTokens = countTokens(msg.content);
    } else {
      contentTokens = msg.content.reduce((blockSum, block) => {
        if (block.type === 'text') return blockSum + countTokens(block.text);
        if (block.type === 'image_url') return blockSum + 1000; // 이미지당 ~1000 토큰 추정
        return blockSum;
      }, 0);
    }
    return sum + contentTokens + 4;
  }, 3);
}
