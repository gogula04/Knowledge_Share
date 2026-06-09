type ChunkOptions = {
  maxLength?: number;
  overlap?: number;
};

function splitParagraphs(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function chunkText(text: string, options: ChunkOptions = {}) {
  const maxLength = options.maxLength ?? 900;
  const overlap = options.overlap ?? 140;
  const paragraphs = splitParagraphs(text);
  const chunks: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    if ((buffer + "\n\n" + paragraph).trim().length <= maxLength) {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (buffer) {
      chunks.push(buffer.trim());
      buffer = "";
    }

    if (paragraph.length <= maxLength) {
      buffer = paragraph;
      continue;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let current = "";
    for (const sentence of sentences) {
      if ((current + " " + sentence).trim().length <= maxLength) {
        current = current ? `${current} ${sentence}` : sentence;
        continue;
      }
      if (current) {
        chunks.push(current.trim());
      }
      current = sentence;
    }
    if (current) {
      buffer = current;
    }
  }

  if (buffer) {
    chunks.push(buffer.trim());
  }

  if (overlap > 0 && chunks.length > 1) {
    const overlapped: string[] = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const previous = overlapped[index - 1];
      if (previous) {
        const tail = previous.slice(Math.max(0, previous.length - overlap));
        overlapped.push(`${tail}\n${chunk}`);
      } else {
        overlapped.push(chunk);
      }
    }
    return overlapped;
  }

  return chunks.length ? chunks : [text];
}

export function estimateFreshnessDays(lastIndexedAt: Date | string | null | undefined) {
  if (!lastIndexedAt) return Number.POSITIVE_INFINITY;
  const reference = typeof lastIndexedAt === "string" ? new Date(lastIndexedAt) : lastIndexedAt;
  const diff = Date.now() - reference.getTime();
  return diff / (1000 * 60 * 60 * 24);
}

