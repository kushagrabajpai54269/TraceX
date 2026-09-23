// ============================================================
// Investigation Mongoose Model — Phase 3
// ============================================================
import mongoose, { Document, Schema, Model } from 'mongoose';

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

// ── Document interface ────────────────────────────────────────

export interface IInvestigation extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  targetAddress: string;   // lowercase-normalised for comparison
  status: 'active' | 'done' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────

const investigationSchema = new Schema<IInvestigation>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [120, 'Title must be 120 characters or fewer'],
    },
    targetAddress: {
      type: String,
      required: [true, 'Target address is required'],
      validate: {
        validator: (v: string) => ETH_ADDRESS_RE.test(v),
        message: 'Must be a valid Ethereum address (0x + 40 hex characters)',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'done', 'archived'],
        message: 'Status must be one of: active, done, archived',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,           // adds createdAt & updatedAt automatically
    versionKey: false,          // remove __v field
  }
);

// Normalise address to lowercase before saving
investigationSchema.pre('save', function (next) {
  if (this.isModified('targetAddress')) {
    this.targetAddress = this.targetAddress.toLowerCase();
  }
  next();
});

investigationSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update = this.getUpdate() as Record<string, unknown>;
  if (update?.targetAddress && typeof update.targetAddress === 'string') {
    update.targetAddress = update.targetAddress.toLowerCase();
  }
  next();
});

// Indexes
investigationSchema.index({ status: 1 });
investigationSchema.index({ createdAt: -1 });

// ── Model ─────────────────────────────────────────────────────

export const Investigation: Model<IInvestigation> =
  mongoose.models.Investigation ||
  mongoose.model<IInvestigation>('Investigation', investigationSchema);
