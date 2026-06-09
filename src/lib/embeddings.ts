import OpenAI from "openai";
import { env } from "@/lib/env";
import { clamp } from "@/lib/utils";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashEmbedding(text: string, dimensions = env.EMBEDDING_DIMENSION) {
  const values = new Array<number>(dimensions).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s._/-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    values[0] = 1;
    return values;
  }

  for (const token of tokens) {
    const h = hashString(token);
    const index = h % dimensions;
    const sign = h % 2 === 0 ? 1 : -1;
    values[index] += sign * (1 + (h % 7) / 10);
  }

  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => clamp(value / norm, -1, 1));
}

export async function embedText(text: string) {
  if (openai) {
    const response = await openai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: text
    });
    return response.data[0]?.embedding ?? hashEmbedding(text);
  }
  return hashEmbedding(text);
}

export async function embedTexts(texts: string[]) {
  if (openai) {
    const response = await openai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: texts
    });
    return response.data.map((item) => item.embedding);
  }
  return texts.map((text) => hashEmbedding(text));
}

export function normalizeVector(values: number[]) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => value / norm);
}

