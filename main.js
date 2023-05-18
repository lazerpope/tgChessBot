import { createRequire } from "module"
const require = createRequire(import.meta.url)
const TGBot = require("node-telegram-bot-api")
const mongoose = require("mongoose")

import { createImage } from "./src/chessTableImageBuilder.js"
import { generateGameId } from "./src/gameIdGenerator.js"
import { User } from "./src/schemas/User.js"
import { Game } from "./src/schemas/Game.js"

const token = "1334779815:AAHs1NGfQB9vjiZJ-meo9J3fjlFWZYKFCfg" //test bot token
const databaseUrl = "mongodb://localhost:27017/tgChess"
const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

let qualitySet = ["Эко ≈ 40кб", "Стандарт ≈ 100кб", "Ультра ≈ 200кб"]
let pieceStyle = ["Альфа", "Кбернетт", "Чек", "Лейпциг", "Мерида"]
let colorScheme = ["Брус", "Изумруд", "Бирюза", "Грей"]

const bot = new TGBot(token, {
  polling: true,
})
console.log("Main server INITIATED!")

mongoose.connect(
  databaseUrl,
  () => {
    console.log("DB Connected")
  },
  (e) => {
    console.error(e)
  }
)

let sendMessageList = []

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  let user = await getUser(chatId, msg.from.first_name)
  if (msg.text != "/start") {
    console.log("пользователь зашел через диплинк")
    joinGame(user, msg.text.slice(7, 12))
    return
  }
  console.log(`start from ${chatId} date ${getDateTime()}.`)
  //if (chatId != owner_id) return
  sendMessage(
    chatId,
    "Я - бот, с помощью которого можно сыграть с другим человеком в шахматы прямо в Телеграмм!\n\nНажми *Создать новую игру* и отправь код игры второму игроку.\n\nУже есть код игры? Нажми *Ввести код игры* и партия начнется. ",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Создать новую игру", callback_data: "startNewGame" }],
          [{ text: "Ввести код игры", callback_data: "joinGame" }],
          [{ text: "Мои игры", callback_data: "myGames" }],
          [{ text: "Часто задаваемые вопросы", callback_data: "help" }],
          [
            {
              text: "Сменить персональные настройки игры",
              callback_data: "changeSettings",
            },
          ],
        ],
      },
    }
  )
})

bot.onText(/\/menu/, async (msg) => {
  sendMainMenu(msg.chat.id, msg.from.first_name)
})

async function sendMainMenu(chatId, first_name) {
  await getUser(chatId, first_name)
  console.log(`menu from ${chatId} date ${getDateTime()}`)
  sendMessage(
    chatId,
    "Главное меню\n\nНажми *Создать новую игру* и отправь код игры второму игроку.\n\nУже есть код игры? Нажми *Ввести код игры* и партия начнется. ",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Создать новую игру", callback_data: "startNewGame" }],
          [{ text: "Ввести код игры", callback_data: "joinGame" }],
          [{ text: "Мои игры", callback_data: "myGames" }],
          [{ text: "Часто задаваемые вопросы", callback_data: "help" }],
          [
            {
              text: "Сменить персональные настройки игры",
              callback_data: "changeSettings",
            },
          ],
        ],
      },
    }
  )
}

bot.onText(/\/help/, async (msg) => {
  sendHelp(msg.chat.id)
})

async function sendHelp(chatId) {
  console.log(`menu from ${chatId} date ${getDateTime()}`)
  sendMessage(chatId, "Тут будет помощь.\nКогда-нибудь... ", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "Главное меню", callback_data: "mainMenu" }]],
    },
  })
}

bot.onText(/\/join/, async (msg) => {
  console.log(`joinGame from ${msg.chat.id} date ${getDateTime()}`)
  let user = await getUser(chatId)
  joinGame(user, msg.text.slice(5, 10))
})
async function joinGame(user, gameId) {
  console.log(`joinGame from ${user.id} date ${getDateTime()}`)
  let game = await Game.findOne({ gameId: gameId })

  //игра не найдена
  if (game == null) {
    sendMessage(
      chatId,
      `Игры с кодом ${gameId.toUpperCase()} не найдено. Возможно создатель удалил ее или проверьте правильность введенного кода.`
    )
    return
  }

 
  //присоединение к своей же партии
  user.games.forEach((element) => {
    if (element === gameId) {
      sendMessage(chatId, `Вы пытались присоединиться к своей собственной партии ${gameId.toUpperCase()}.\nЗачем?`)
      return
    }
  })
  
  //в данной игре уже присутствуют оба игрока
  
    if (game.guest != null && game.guest != undefined) {
      sendMessage(chatId, `В партии ${gameId.toUpperCase()} уже присутствуют оба игрока. Проверьте правильность введенного кода.`)
      return
    }
  
  
  let owner = await getUser(game.owner)
  //вы уже присоединились к партии как второй игрок
  owner.games.forEach((element) => {
    if (element === gameId) {
      sendMessage(chatId, `Вы уже присоединены к партии ${gameId.toUpperCase()} как второй игрок.`)
      return
    }
  })

  game.guest = user.id
  game.guestName = user.name
  await game.save()

  user.games.push(gameId)
  await user.save()

  await createImage(user.id, game.fen, user.colorScheme, true, user.qualitySet, user.pieceStyle)
  sendPhoto(user.id, `./images/ready/${user.id}.png`, {
    caption: `Партия началась!\nВы играете за *черных*. Ход белых(${game.ownerName})`,
    parse_mode: "Markdown",
  })

  await createImage(owner.id, startFen, owner.colorScheme, false, owner.qualitySet, owner.pieceStyle)
  sendPhoto(owner.id, `./images/ready/${owner.id}.png`, {
    caption: `Партия началась!\nВы играете за *Белых*. Ваш ход.`,
    parse_mode: "Markdown",
  })
}

function setJoinGameState(chatId) {
  sendMessage(chatId, "Введите команду /join + код игры\nПример /join abc45")
}

async function startNewGame(user) {
  console.log(`startNewGame from ${user.id} date ${getDateTime()}`)
  if (user.games.length > 4) {
    sendMessage(
      user.id,
      "На данный момент существует ограничение в 5 игр в которых вы можете участвовать одновременно.\nВы можете удалить еще не начатую игру или сдаться в одной из игр, в меню *Мои игры* чтобы освободить место.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Мои игры", callback_data: "myGames" }],
            [{ text: "Главное меню", callback_data: "mainMenu" }],
          ],
        },
      }
    )
    return
  }
  await sendMessage(
    user.id,
    "Партия создана\nОтправьте следующее сообщение второму игроку. Игра начнется автоматически как только второй игрок присоединится."
  )
  let gameId = generateGameId()
  await Game.create({ owner: user.id, gameId: gameId, ownerName: user.name ? user.name : "Аноним" })
  user.games.push(gameId)
  await user.save()

  sendMessage(
    user.id,
    `Откройте ссылку\nhttps://t.me/lazerpope_test_bot?start=${gameId}\nИли зайдите в меню и введите код игры вручную: ${gameId.toUpperCase()}`
  )
}

async function myGames(user) {
  console.log(`myGames from ${user.id} date ${getDateTime()}`)
  if (user.games.length === 0) {
    sendMessage(user.id, "Вы еще не начали ни одной игры.\n\nНачните новую игру или присоединитесь к текущей.", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Создать новую игру", callback_data: "startNewGame" }],
          [{ text: "Ввести код игры", callback_data: "joinGame" }],
          [{ text: "Главное меню", callback_data: "mainMenu" }],
        ],
      },
    })
    return
  }

  let games = await Game.find({ $or: [{ owner: user.id }, { guest: user.id }] })
  let inlineKeyboard = []
  games.forEach((game) => {
    game.guest
      ? inlineKeyboard.push([
          {
            text: `Партия ${game.owner === user.id ? "Вы" : game.ownerName} против ${
              game.guest === user.id ? "Вас" : game.ownerName
            }. Код ${game.gameId.toUpperCase()}`,
            callback_data: `showGameOptions ${game.gameId}`,
          },
        ])
      : inlineKeyboard.push([
          {
            text: `Партия ${game.gameId.toUpperCase()} ожидает второго игрока.`,
            callback_data: `showGameOptions ${game.gameId}`,
          },
        ])
  })
  inlineKeyboard.push([{ text: "Главное меню", callback_data: "mainMenu" }])

  sendMessage(
    user.id,
    `В данный момент вы участвуете в ${user.games.length} партиях.\nНажмите на кнопку с партией чтобы увидеть больше функций.`,
    {
      parse_mode: "Markdown",
      reply_markup: { inlineKeyboard, inline_keyboard: inlineKeyboard },
    }
  )
}

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id
  console.log(`query ${query.data}  from ${chatId} date ${getDateTime()}`)
  let user = await getUser(chatId, query.message.from.first_name)

  if (query.data === "changeSettings") {
    changeSettings(user)
    return
  }
  if (query.data === "startNewGame") {
    startNewGame(user)
    return
  }
  if (query.data === "joinGame") {
    setJoinGameState(chatId)
    return
  }
  if (query.data === "myGames") {
    myGames(user)
    return
  }
  if (query.data === "mainMenu") {
    sendMainMenu(chatId, query.message.from.first_name)
    return
  }
  if (query.data === "help") {
    sendHelp(chatId)
    return
  }
  if (query.data === "changeQualitySet") {
    changeQualitySet(user)
    return
  }
  if (query.data.includes("applyChangeQualitySet")) {
    applyChangeQualitySet(user, Number(query.data[query.data.length - 1]))
    return
  }
  if (query.data === "changePieceStyle") {
    changePieceStyle(user)
    return
  }
  if (query.data.includes("applyChangePieceStyle")) {
    applyChangePieceStyle(user, Number(query.data[query.data.length - 1]))
    return
  }
  if (query.data === "changeColorScheme") {
    changeColorScheme(user)
    return
  }
  if (query.data.includes("applyChangeColorScheme")) {
    applyChangeColorScheme(user, Number(query.data[query.data.length - 1]))
    return
  }
})

async function changeSettings(user) {
  await createImage(user.id, startFen, user.colorScheme, false, user.qualitySet, user.pieceStyle)
  sendPhoto(user.id, `./images/ready/${user.id}.png`, {
    caption: "Во время игры ваша доска будет выглядеть так",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Качество картинки", callback_data: "changeQualitySet" }],
        [{ text: "Стиль фигур", callback_data: "changePieceStyle" }],
        [{ text: "Цветовая схема", callback_data: "changeColorScheme" }],
        [{ text: "Главное меню", callback_data: "mainMenu" }],
      ],
    },
  })
}

async function changeQualitySet(user) {
  await createImage(user.id, startFen, user.colorScheme, false, user.qualitySet, user.pieceStyle)
  sendPhoto(user.id, `./images/ready/${user.id}.png`, {
    caption: `Текущее качество:\n${qualitySet[user.qualitySet]}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: qualitySet[2], callback_data: "applyChangeQualitySet 2" }],
        [{ text: qualitySet[1], callback_data: "applyChangeQualitySet 1" }],
        [{ text: qualitySet[0], callback_data: "applyChangeQualitySet 0" }],
        [{ text: "Вернуться в настройки", callback_data: "changeSettings" }],
        [{ text: "Главное меню", callback_data: "mainMenu" }],
      ],
    },
  })
}
async function applyChangeQualitySet(user, setTo) {
  user.qualitySet = setTo
  await user.save()
  changeQualitySet(user)
}
async function changePieceStyle(user) {
  await createImage(user.id, startFen, user.colorScheme, false, user.qualitySet, user.pieceStyle)
  sendPhoto(user.id, `./images/ready/${user.id}.png`, {
    caption: `Текущий стиль фигур:\n${pieceStyle[user.pieceStyle]}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: pieceStyle[0], callback_data: "applyChangePieceStyle 0" }],
        [{ text: pieceStyle[1], callback_data: "applyChangePieceStyle 1" }],
        [{ text: pieceStyle[2], callback_data: "applyChangePieceStyle 2" }],
        [{ text: pieceStyle[3], callback_data: "applyChangePieceStyle 3" }],
        [{ text: pieceStyle[4], callback_data: "applyChangePieceStyle 4" }],
        [{ text: "Вернуться в настройки", callback_data: "changeSettings" }],
        [{ text: "Главное меню", callback_data: "mainMenu" }],
      ],
    },
  })
}

async function applyChangePieceStyle(user, setTo) {
  user.pieceStyle = setTo
  await user.save()
  changePieceStyle(user)
}

async function changeColorScheme(user) {
  await createImage(user.id, startFen, user.colorScheme, false, user.qualitySet, user.pieceStyle)
  sendPhoto(user.id, `./images/ready/${user.id}.png`, {
    caption: `Текущая цветовая схема:\n${colorScheme[user.colorScheme]}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: colorScheme[0], callback_data: "applyChangeColorScheme 0" }],
        [{ text: colorScheme[1], callback_data: "applyChangeColorScheme 1" }],
        [{ text: colorScheme[2], callback_data: "applyChangeColorScheme 2" }],
        [{ text: colorScheme[3], callback_data: "applyChangeColorScheme 3" }],
        [{ text: "Вернуться в настройки", callback_data: "changeSettings" }],
        [{ text: "Главное меню", callback_data: "mainMenu" }],
      ],
    },
  })
}
async function applyChangeColorScheme(user, setTo) {
  user.colorScheme = setTo
  await user.save()
  changeColorScheme(user)
}

async function getUser(chatId, firstName) {
  let user = await User.findOne({ id: chatId })
  if (user === null) {
    return await User.create({ id: chatId, name: firstName })
  }
  return user
}

function sendMessage(chatId, message, reply) {
  sendMessageList.push({ messageType: "message", chatId, message, reply })
}

function sendPhoto(chatId, photo, reply) {
  sendMessageList.push({ messageType: "picture", chatId, photo, reply })
}

setInterval(function () {
  if (sendMessageList.length > 0) {
    switch (sendMessageList[0].messageType) {
      case "picture":
        sendPhotoToClient(sendMessageList.shift())
        break

      case "message":
        sendMessageToClient(sendMessageList.shift())
        break

      default:
        break
    }
  }
}, 200)

function sendMessageToClient(msg) {
  bot.sendMessage(msg.chatId, msg.message, msg.reply)
  console.log(`message sent to ${msg.chatId} date ${getDateTime()}`)
}
function sendPhotoToClient(msg) {
  bot.sendPhoto(msg.chatId, msg.photo, msg.reply)
  console.log(`photo sent to ${msg.chatId} date ${getDateTime()}`)
}

function getDateTime() {
  return new Date().toString().slice(4, 24)
}
