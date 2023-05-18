import { createRequire } from "module"
const require = createRequire(import.meta.url)
const mongoose = require("mongoose")
const startfen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, immutable: true, lowercase: true },
  owner: { type: Number, required: true, immutable: true },
  ownerName: { type: String, required: true, immutable: true },
  guest: { type: Number },
  guestName: { type: String },
  createdAt: { type: Date, required: true, default: () => Date.now(), immutable: true },
  lastMoveDate: { type: Date },
  fen: { type: String, required: true, default: () => startfen },
  turnWhites: { type: Boolean, required: true, default: () => true },
})
gameSchema.pre("save", function (next) {
  this.lastMoveDate = Date.now()
  next()
})
export const Game = mongoose.model("Game", gameSchema)
