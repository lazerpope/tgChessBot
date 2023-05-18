import { createRequire } from "module"
const require = createRequire(import.meta.url)
const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, immutable: true },
  name: { type: String, required: true, immutable: true, default: () => "Аноним" },
  qualitySet: { type: Number, required: true, default: () => 1, min: 0, max: 2 },
  pieceStyle: { type: Number, required: true, default: () => 4, min: 0, max: 4 },
  colorScheme: { type: Number, required: true, default: () => 0, min: 0, max: 3 },
  games: [String],
  currentGame: String,
  createdAt: { type: Date, required: true, default: () => Date.now(), immutable: true },
  currentPiece: { type: String, default: () => "" },
})
export const User = mongoose.model("User", userSchema)
