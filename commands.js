const { getBtcPrice, getCoinPrice } = require("./getPrice");
const { calculatePerformance, closeCall } = require("./function");
const { getNextSequenceNumber, Call } = require("./database");

function formatDateTime(dateTime) {
  const date = new Date(dateTime);
  const day = date.getDate();
  const month = date.getMonth() + 1; // Tháng bắt đầu từ 0 nên cần cộng thêm 1
  return `${day}/${month}`;
}

function startCommand(bot) {
  bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const response = `
          Xin chào! Đây là hướng dẫn sử dụng của bot:
          /all_ - Lấy tất cả các lệnh giao dịch
          /check + id - Kiểm tra hiệu suất của một lệnh giao dịch
          /p + coin - Lấy giá của một loại coin
      `;
      bot.sendMessage(chatId, response);
  });
}

function addCallCommand(bot) {
  bot.onText(/\/add (Long|Short) (\w+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Kiểm tra xem người dùng có quyền được thêm gọi giao dịch hay không
    if (userId != '1638898652') {
      bot.sendMessage(chatId, "Bạn không có quyền thực hiện lệnh này.");
      return;
    }

    const tradeType = match[1];
    const coin = match[2].toUpperCase();
    const callData = match[3].split(",");

    if (callData.length === 4) {
      const entryPrice = parseFloat(callData[0].trim());
      const stopLossPrice = parseFloat(callData[1].trim());
      const takeProfitPrice = parseFloat(callData[2].trim());
      const leverage = parseInt(callData[3].trim());

      if (
        !isNaN(entryPrice) &&
        !isNaN(stopLossPrice) &&
        !isNaN(takeProfitPrice) &&
        !isNaN(leverage)
      ) {
        if (
          (tradeType === "Long" &&
            stopLossPrice < entryPrice &&
            takeProfitPrice > entryPrice) ||
          (tradeType === "Short" &&
            stopLossPrice > entryPrice &&
            takeProfitPrice < entryPrice)
        ) {
          try {
            const newCall = new Call({
              entryPrice,
              stopLossPrice,
              takeProfitPrice,
              leverage,
              tradeType,
              coin, // Thêm loại coin vào đối tượng Call
              chatId,
              sequenceNumber: await getNextSequenceNumber(),
              openTime: new Date(),
            });

            await newCall.save();
            bot.sendMessage(
              chatId,
              `Gọi giao dịch mới có số thứ tự: ${newCall.sequenceNumber}, Loại: ${tradeType}, Coin: ${coin}, đã được thêm vào cơ sở dữ liệu.`
            );
          } catch (error) {
            bot.sendMessage(
              chatId,
              "Có lỗi xảy ra khi lưu gọi giao dịch vào cơ sở dữ liệu."
            );
            console.error(
              "Lỗi khi lưu gọi giao dịch vào cơ sở dữ liệu:",
              error
            );
          }
        } else {
          bot.sendMessage(
            chatId,
            `SL hoặc take profit không hợp lệ cho loại giao dịch ${tradeType}.`
          );
        }
      } else {
        bot.sendMessage(
          chatId,
          "Vui lòng nhập ET, SL, TP và Dép đúng định dạng."
        );
      }
    } else {
      bot.sendMessage(
        chatId,
        "Vui lòng nhập đủ thông tin cho gọi giao dịch (ET, SL, TP, Dép)."
      );
    }
  });
}

function checkPerformanceCommand(bot) {
    bot.onText(/\/check (\d+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const sequenceNumber = parseInt(match[1]);
  
      try {
        let call = await Call.findOne({ sequenceNumber });
        const coin = call.coin;
        const coinPrice = await getCoinPrice(coin)
  
        if (call) {
          const openTimeFormatted = formatDateTime(call.openTime);
          const closeTimeFormatted = call.closed ? formatDateTime(call.closeTime) : 'Chưa đóng';
          let callMessage = `${call.closed ? '🔴' : '🟢'}${call.coin}: ${coinPrice.toFixed(2)}$\n• STT: ${call.sequenceNumber}(${openTimeFormatted}) - ${call.tradeType} - ${call.closed ? "Đóng" : "Mở"}\n• ET: ${call.entryPrice} - Dép: ${call.leverage}`;
  
          if (call.closed) {
            callMessage += `\n•Closed Price: ${call.closePrice} (Close: ${closeTimeFormatted})\•nProfit: ${call.profitLoss.toFixed(2)}%`;
          } else {
            const stopLossProfit = await calculatePerformance(
              call,
              call.stopLossPrice
            );
            const currentPerformance = await calculatePerformance(
              call,
              coinPrice
            );
            callMessage += `\n• Profit: ${currentPerformance.toFixed(2)}%\n• TP: ${call.takeProfitPrice} - SL: ${call.stopLossPrice} - Nếu SL: ${stopLossProfit.toFixed(2)}%`;
          }
  
          bot.sendMessage(chatId, callMessage);
        } else {
          bot.sendMessage(
            chatId,
            `Không tìm thấy gọi giao dịch nào có số thứ tự ${sequenceNumber}.`
          );
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra Profit của gọi giao dịch:", error);
        bot.sendMessage(
          chatId,
          "Có lỗi xảy ra khi kiểm tra Profit của gọi giao dịch."
        );
      }
    });
  }
  
  

async function allCallsCommand(bot) {
    bot.onText(/\/all/, async (msg) => {
      const chatId = msg.chat.id;
  
      try {
        const btcPrice = await getBtcPrice(); // Lấy giá Bitcoin từ một nguồn dữ liệu phù hợp
        const ethPrice = await getCoinPrice('ETH');
        const allCalls = await Call.find();
        let totalProfit = 0;
  
        if (allCalls.length > 0) {
          let message = `BTC: ${btcPrice.toFixed(2)}$ | ETH: ${ethPrice.toFixed(2)}$\n\n*Thống kê:*\n\n`;
   
          for (const call of allCalls) {
            const coin = call.coin;
           const coinPrice = await getCoinPrice(coin)
            const openTimeFormatted = formatDateTime(call.openTime);
            const closeTimeFormatted = call.closed ? formatDateTime(call.closeTime) : 'Chưa đóng';
            let callMessage = `${call.closed ? '🔴' : '🟢'} *${call.coin}*\n• STT: ${call.sequenceNumber}(${openTimeFormatted}) - ${call.tradeType} - ${call.closed ? "Đóng" : "Mở"}\n• ET: ${call.entryPrice} - Dép: ${call.leverage}`;
  
            if (call.closed) {
              callMessage += ` - Closed Price: ${call.closePrice} (${closeTimeFormatted}) - Profit: ${call.profitLoss.toFixed(2)}%`;
              totalProfit += call.profitLoss;
            } else {
              const stopLossProfit = await calculatePerformance(
                call,
                call.stopLossPrice
              );
              const currentPerformance = await calculatePerformance(
                call,
                coinPrice
              );
              callMessage += ` - Profit: ${currentPerformance.toFixed(2)}%\n• TP: ${call.takeProfitPrice} - SL: ${call.stopLossPrice}(${stopLossProfit.toFixed(2)}%)`;
              totalProfit += currentPerformance;
            }
  
            message += callMessage + "\n\n";
          }
  
          message += `*📈Tổng lợi nhuận: ${totalProfit.toFixed(2)}%* \n\n Lệnh call đầy đủ trong “ALL IN CHANNEL”, cách vào MIỄN PHÍ như sau:
          \n1. Đăng ký bingx theo link sau: https://bingx.com/invite/TL07YZ\n2. KYC và Nạp 500$ vào tài khoản\n3. Liên hệ @susuu1509 để được add vào nhóm `;
          bot.sendMessage(chatId, message, {
            parse_mode: 'markdown',
            disable_web_page_preview: true
        });
        } else {
          bot.sendMessage(
            chatId,
            "Không có gọi giao dịch nào trong cơ sở dữ liệu."
          );
        }
      } catch (error) {
        console.error("Lỗi khi truy vấn gọi giao dịch:", error);
        bot.sendMessage(
          chatId,
          "Có lỗi xảy ra khi truy vấn dữ liệu từ cơ sở dữ liệu."
        );
      }
    });
  }
  

  function closeCallCommand(bot) {
    bot.onText(/\/close (\d+) (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      if (userId != '1638898652') {
        bot.sendMessage(chatId, "Bạn không có quyền thực hiện lệnh này.");
        return;
      }
  
      const sequenceNumber = parseInt(match[1]);
      const closePrice = parseFloat(match[2]);
  
      try {
        let call = await Call.findOne({ sequenceNumber });
  
        if (call) {
          if (call.closed) {
            bot.sendMessage(chatId, "Lệnh đã đóng từ trước.");
            return;
          }
            await closeCall(call, closePrice, bot, chatId);
        } else {
          bot.sendMessage(
            chatId,
            `Không tìm thấy gọi giao dịch nào có số thứ tự ${sequenceNumber}.`
          );
          console.log(`No call found for sequence number ${sequenceNumber}.`);
        }
      } catch (error) {
        console.error("Lỗi khi đóng gọi giao dịch:", error);
        bot.sendMessage(chatId, "Có lỗi xảy ra khi đóng gọi giao dịch.");
      }
    });
  }
  

function checkCoinPriceCommand(bot) {
    bot.onText(/\/p (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const coin = match[1].toUpperCase(); // Chuyển đổi thành chữ in hoa để đảm bảo đồng tiền được nhận dạng chính xác
        try {
            const coinPrice = await getCoinPrice(coin);
            bot.sendMessage(chatId, `${coin}: ${coinPrice}$`);
        } catch (error) {
            console.error(`Lỗi khi kiểm tra giá của ${coin}:`, error);
            bot.sendMessage(chatId, `Có lỗi xảy ra khi kiểm tra giá của ${coin}.`);
        }
    });
}

function deleteCallCommand(bot) {
    bot.onText(/\/del (\d+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      // Kiểm tra xem người dùng có quyền được xóa cuộc gọi hay không
      if (userId != '1638898652') {
        bot.sendMessage(chatId, "Bạn không có quyền thực hiện lệnh này.");
        return;
      }
      const sequenceNumber = parseInt(match[1]);
  
      try {
        const deletedCall = await Call.findOneAndDelete({ sequenceNumber });
        if (deletedCall) {
          bot.sendMessage(chatId, `Cuộc gọi có ID ${sequenceNumber} đã được xóa.`);
        } else {
          bot.sendMessage(chatId, `Không tìm thấy cuộc gọi có ID ${sequenceNumber}.`);
        }
      } catch (error) {
        console.error("Lỗi khi xóa cuộc gọi:", error);
        bot.sendMessage(chatId, "Có lỗi xảy ra khi xóa cuộc gọi.");
      }
    });
  }

module.exports = {
  addCallCommand,
  checkPerformanceCommand,
  allCallsCommand,
  closeCallCommand,
  checkCoinPriceCommand,
  deleteCallCommand,
  startCommand,
};
