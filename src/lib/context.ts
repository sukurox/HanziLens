const CONTEXT_BOUNDARIES = new Set(["。", "！", "？", "!", "?", ".", "\n"]);

export function extractContextSentence(text: string, start: number, end: number) {
  if (!text || start < 0) {
    return undefined;
  }

  let left = start;
  while (left > 0 && !CONTEXT_BOUNDARIES.has(text[left - 1])) {
    left -= 1;
  }

  let right = end;
  while (right < text.length && !CONTEXT_BOUNDARIES.has(text[right])) {
    right += 1;
  }

  const sentence = text.slice(left, Math.min(text.length, right + 1)).trim();
  if (!sentence) {
    return undefined;
  }

  return sentence.length > 180 ? `${sentence.slice(0, 177)}...` : sentence;
}
