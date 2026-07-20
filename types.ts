export interface Attachment {
  name: string;
  mimeType: string;
  base64: string;
  size: number;
}

export interface Message {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  mode?: OperationMode;
}

export type OperationMode = "default" | "vent" | "brainstorm" | "roast" | "focus" | "diagnostics";

export interface FriendLore {
  hobbies: string;
  insideJokes: string;
  goals: string;
  customLore: string;
}
