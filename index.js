const TelegramBot = require('node-telegram-bot-api');
const { connectToDatabase } = require('./database');
const { Call, addCallCommand, checkPerformanceCommand, allCallsCommand, closeCallCommand, checkCoinPriceCommand, deleteCallCommand, startCommand } = require('./commands');

const token = "xxxx";

const bot = new TelegramBot(token, { polling: true });

connectToDatabase();

addCallCommand(bot);
checkPerformanceCommand(bot);
allCallsCommand(bot);
closeCallCommand(bot);
checkCoinPriceCommand(bot);
deleteCallCommand(bot);
startCommand(bot);

console.log('Bot đang chạy...');
