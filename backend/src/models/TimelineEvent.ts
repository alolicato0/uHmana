import { Schema, model, type InferSchemaType } from 'mongoose';

const eventSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'HealthProfile', index: true },
    type: {
      type: String,
      enum: ['symptom', 'medication', 'visit', 'exam', 'vaccine', 'note', 'photo'],
      required: true,
    },
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true, index: true },
    mediaUrls: { type: [String], default: [] },
    extra: { type: Schema.Types.Mixed }, // sintomi/farmaci hanno campi specifici
  },
  { timestamps: true },
);

eventSchema.index({ userId: 1, date: -1 });

export type TimelineEventDoc = InferSchemaType<typeof eventSchema>;
export const TimelineEvent = model('TimelineEvent', eventSchema);
