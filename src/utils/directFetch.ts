import { Agent, fetch as undiciFetch } from "undici";

export const directAgent = new Agent();

export function directFetch(input: any, init?: Record<string, any>): Promise<any> {
  return undiciFetch(input, { ...init, dispatcher: directAgent });
}
