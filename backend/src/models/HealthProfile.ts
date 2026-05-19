import { Schema, model, type InferSchemaType } from 'mongoose';

const profileSchema = new Schema(
  {
    userId: { type: String, required: true, index: true }, // Clerk user id
    name: { type: String, required: true },
    kind: { type: String, enum: ['human', 'pet'], required: true },
    birthDate: { type: Date },
    bloodGroup: String,
    species: String,
    breed: String,
    weightKg: Number,
    allergies: { type: [String], default: [] },
    conditions: { type: [String], default: [] },
    currentTherapies: { type: [String], default: [] },
    avatarUrl: String,
    notes: String,
  },
  { timestamps: true },
);

export type HealthProfileDoc = InferSchemaType<typeof profileSchema>;
export const HealthProfile = model('HealthProfile', profileSchema);
