import { Schema, model, type InferSchemaType } from 'mongoose';

const attachmentSchema = new Schema(
  {
    mimeType: String,
    url: String, // se l'abbiamo persistito (es. su un bucket)
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    text: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const sessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: String,
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export type ChatSessionDoc = InferSchemaType<typeof sessionSchema>;
export const ChatSession = model('ChatSession', sessionSchema);
