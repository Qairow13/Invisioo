import { askAI } from "@/lib/ai";

export async function askLocalLLM(prompt: string) {
  return askAI(prompt);
}
