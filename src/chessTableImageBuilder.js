import { createRequire } from "module"
const require = createRequire(import.meta.url)
let ChessImageGenerator = require("chess-image-generator")
let fs = require("node:fs")
import { Chess } from "chess.js"

const testFen = "r2qk2r/p1p5/bpnbp2p/1N1p1p2/P2P1p1N/2PQ2P1/1P2PPBP/R4RK1 b kq - 1 13"
const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

let qualitySetList = [360, 720, 1080]
let pieceStyleList  = ["alpha", "cburnett", "cheq", "leipzig", "merida"]
let colorsLight = ["#F0D9B5", "#FFFFFF", "#FFFFFF", "#C8C8C8"]
let colorsDark = ["#B58863", "#135883", "#008080", "#4B4B4B"]

function getColorSchemeLight(n) {
  try {
    return colorsLight[n]
  } catch (error) {
    console.log("Png Generation Failure")
    return colorsLight[0]
  }
}
function getColorSchemeDark(n) {
  try {
    return colorsDark[n]
  } catch (error) {
    console.log("Png Generation Failure")
    return colorsDark[0]
  }
}
function getPieceStyle(n) {
  try {
    return pieceStyleList[n]
  } catch (error) {
    console.log("Png Generation Failure")
    return pieceStyleList[0]
  }
}

//createImage(i, testFen, i, false, 4, 0)

export async function createImage(gameId, fen, colorScheme, flipped, qualitySet, pieceStyle) {
  //console.log("Png Generation Started")
  try {
    let imageGenerator = new ChessImageGenerator({
      size: qualitySetList[qualitySet],
      light: getColorSchemeLight(colorScheme),
      dark: getColorSchemeDark(colorScheme),
      style: getPieceStyle(pieceStyle),
    })

    flipped ? imageGenerator.loadArray(flipBoard(fen)) : imageGenerator.loadFEN(fen)
    await imageGenerator.generatePNG(`images/ready/${gameId}.png`)

    console.log("Png Generation Sucsess")
  } catch (error) {
    console.log("Png Generation Failure")
    return error
  }
}

function flipBoard(fen) {
  let chess = new Chess(fen)
  let oldBoard = chess.board()
  let newBoard = []
  for (let i = 7; i >= 0; i--) {
    let newLine = []
    for (let j = 7; j >= 0; j--) {
      if (oldBoard[i][j] === null) {
        newLine.push("")
        continue
      }
      oldBoard[i][j].color === "b" ? newLine.push(oldBoard[i][j].type) : newLine.push(oldBoard[i][j].type.toUpperCase())
    }
    newBoard.push(newLine)
  }
  return newBoard
}
