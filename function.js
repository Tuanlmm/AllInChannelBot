const Call = require('./database').Call;

// Hàm tính toán hiệu suất của gọi giao dịch
async function calculatePerformance(call, price) {
    // Define calculate performance logic here
    if (!call.closed) {
        const entryValue = call.entryPrice;
        const currentValue = price;
        let profitLossPercentage;

        if (call.tradeType === 'Long') {
            profitLossPercentage = ((currentValue - entryValue) / entryValue) * 100 * call.leverage;
        } else if (call.tradeType === 'Short') {
            profitLossPercentage = ((entryValue - currentValue) / entryValue) * 100 * call.leverage;
        } else {
            throw new Error('Loại giao dịch không hợp lệ.');
        }

        return profitLossPercentage;
    } else {
        return call.profitLoss; // Trả về lợi nhuận/lỗ đã tính trước đó
    }
}

async function closeCall(call, closePrice, bot, chatId) {
    try {
        const profitLoss = await calculatePerformance(call, closePrice);
        const currentTime = new Date();
        // Thực hiện cập nhật thông tin lệnh
        await Call.findOneAndUpdate({ _id: call._id }, {
            closed: true,
            closePrice: closePrice,
            profitLoss: profitLoss,
            closeTime: currentTime
        });
        // Gửi thông báo cho người dùng
        bot.sendMessage(chatId, `Giao dịch có ID ${call.sequenceNumber} đã đóng.\nProfit: ${profitLoss.toFixed(2)}%`);
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin lệnh đã đóng:', error);
        throw new Error('Có lỗi xảy ra khi cập nhật thông tin lệnh đã đóng vào cơ sở dữ liệu.');
    }
}

module.exports = { calculatePerformance, closeCall };
