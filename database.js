const mongoose = require('mongoose');
const { Schema } = mongoose;

// Định nghĩa schema cho collection "calls"
const callSchema = new Schema({
    coin: { type: String, required: true }, 
    entryPrice: Number,
    stopLossPrice: Number,
    takeProfitPrice: Number,
    leverage: Number,
    tradeType: String,
    chatId: Number,
    sequenceNumber: Number,
    closed: { type: Boolean, default: false },
    closePrice: Number,
    profitLoss: Number,
    openTime: { type: Date, default: Date.now },
    closeTime: { type: Date, default: Date.now }
});

// Tạo model từ schema đã định nghĩa
const Call = mongoose.model('Call', callSchema);

// Kết nối đến MongoDB Atlas
async function connectToDatabase() {
    try {
        await mongoose.connect('xxxx', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Đã kết nối đến MongoDB Atlas');
    } catch (err) {
        console.error('Lỗi kết nối MongoDB Atlas:', err);
    }
}

// Hàm lấy số thứ tự tiếp theo
async function getNextSequenceNumber() {
    try {
        const count = await Call.countDocuments({});
        return count + 1;
    } catch (error) {
        console.error('Lỗi khi lấy số thứ tự tiếp theo:', error);
        throw new Error('Có lỗi xảy ra khi lấy số thứ tự tiếp theo.');
    }
}

module.exports = { connectToDatabase, getNextSequenceNumber, Call };
