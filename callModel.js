const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    tradeType: String,
    entryPrice: Number,
    stopLossPrice: Number,
    takeProfitPrice: Number,
    leverage: Number,
    chatId: Number,
    closed: Boolean,
    closePrice: Number
});

const Call = mongoose.model('Call', callSchema);

module.exports = Call;
