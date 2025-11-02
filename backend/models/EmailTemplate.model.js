import { Schema, model } from 'mongoose';
const emailTemplateSchema = new Schema(
  {
    templateName: {
      type: String,
      unique: true,
      required: true,
    },
    subject: String,
    body: String,
    variables: [String],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const EmailTemplate = model('EmailTemplate', emailTemplateSchema);