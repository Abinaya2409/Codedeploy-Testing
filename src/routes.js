const Router = require("koa-router");

const currency = require("./controllers/currency");
const moneycorpExchangeController = require("./controllers/moneycorpExchange");
const healthController = require("./controllers/health");
const cumberlandController = require("./controllers/cryptoRates");

const routers = new Router();

routers
  .get("/converts/:from/:to/:amount", currency.conversion)
  .get("/health", healthController.health)
  .get(
    "/moneycorp-exchange/:baseCurrency/:destinationCurrency/:amount",
    moneycorpExchangeController.moneycorpExchange
  )
  .get(
    "/moneycorp-rate/:baseCurrency/:destinationCurrency",
    moneycorpExchangeController.moneycorpRate
  )
  .get(
    "/moneycorp-rate-no-fee/:baseCurrency/:destinationCurrency",
    moneycorpExchangeController.moneycorpRateWithoutFee
  )
  .post(
    "/public/crypto/deposit/rate",
    cumberlandController.depositCryptoPaymentRateWithFee
  )
  .post(
    "/internal/crypto/deposit/rate",
    cumberlandController.depositCryptoPaymentRateWithFeeInternal
  )
  .post(
    "/public/crypto/membership/rate",
    cumberlandController.membershipCryptoPaymentRateNoFee
  )
  .post(
    "/internal/crypto/membership/rate",
    cumberlandController.membershipCryptoPaymentRateNoFeeInternal
  )
  .post(
    "/public/crypto/trade/rate",
    cumberlandController.cryptoTradeRate
  );

module.exports = routers;
