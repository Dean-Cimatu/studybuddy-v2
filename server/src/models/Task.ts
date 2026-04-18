import mongoose, { Document, Schema } from 'mongoose';
import type { Task } from '@studybuddy/shared';

export interface TaskDocument extends Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, Document {}

const taskSchema = new Schema<TaskDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: String },
    estimatedMinutes: { type: Number },
    priority: { type: String, enum: ['low', 'med', 'high'], default: 'med' },
    status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = (ret['_id'] as { toString(): string }).toString();
        ret['userId'] = (ret['userId'] as { toString(): string }).toString();
        delete ret['_id'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

taskSchema.index({ userId: 1, status: 1 });

export const TaskModel = mongoose.model<TaskDocument>('Task', taskSchema);
