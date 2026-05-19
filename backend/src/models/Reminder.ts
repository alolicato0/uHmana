import { Schema, model, type InferSchemaType } from 'mongoose';

const reminderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'HealthProfile' },
    category: {
      type: String,
      enum: ['medication', 'visit', 'vaccine', 'other'],
      default: 'medication',
    },
    title: { type: String, required: true },
    notes: String,
    schedule: {
      // pattern semplice: 'once' | 'daily' | 'weekly' | 'monthly'
      kind: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly'],
        default: 'once',
      },
      time: String,            // 'HH:mm'
      date: Date,              // per 'once'
      daysOfWeek: [Number],    // 0..6
    },
    enabled: { type: Boolean, default: true },
    expoPushToken: String,     // se vogliamo notificare via Expo Push
  },
  { timestamps: true },
);

export type ReminderDoc = InferSchemaType<typeof reminderSchema>;
export const Reminder = model('Reminder', reminderSchema);
