const axios = require('axios');

async function getBtcPrice() {
    try {
        const response = await axios.get('https://open-api.bingx.com/openApi/swap/v1/ticker/price');
        const btcUsdtPair = response.data.data.find(pair => pair.symbol === 'BTC-USDT');
        if (btcUsdtPair) {
            return parseFloat(btcUsdtPair.price);
        } else {
            throw new Error('Không tìm thấy giá của cặp BTC-USDT.');
        }
    } catch (error) {
        console.error('Lỗi khi lấy giá Bitcoin:', error);
        throw new Error('Có lỗi xảy ra khi lấy giá Bitcoin.');
    }
}

async function getCoinPrice(coin) {
    const pairSymbol = `${coin}-USDT`; // Tạo mã cặp từ đồng tiền và USDT
    try {
        const response = await axios.get('https://open-api.bingx.com/openApi/swap/v1/ticker/price');
        const coinUsdtPair = response.data.data.find(pair => pair.symbol === pairSymbol);
        if (coinUsdtPair) {
            return parseFloat(coinUsdtPair.price);
        } else {
            throw new Error(`Không tìm thấy giá của cặp ${pairSymbol}.`);
        }
    } catch (error) {
        console.error(`Lỗi khi lấy giá của đồng ${coin}:`, error);
        throw new Error(`Có lỗi xảy ra khi lấy giá của đồng ${coin}.`);
    }
}


module.exports = { getBtcPrice, getCoinPrice };
