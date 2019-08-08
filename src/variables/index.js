const loggerName = process.env.LOGGER_NAME;
const env = process.env.APP_ENV || "local";
const appPort = process.env.APP_PORT;
const logLevel = process.env.LOG_LEVEL;
const host = process.env.HOST || "localhost";
const fsCurrencyAdapter = process.env.CURRENCY_ADAPTER_URL;
const fsCrmAdapter = process.env.CRM_ADAPTER_URL;
const fsFeeService = process.env.FEE_SERVICE_URL;
const bcCryptoService = process.env.BC_CRYPTO_SERVICE;
const fsXeCurrencyAdapter = process.env.XE_CURRENCY_ADAPTER_URL;

const planFXRates = {
  "Rising Star": 0.03,
  "A Lister": 0.025,
  "All Star": 0.02,
  "Hall of Fame": 0.015,
  BCP: 0.006
};

const tickers = [
  "ETH_USD",
  "BTC_USD",
  "BCH_USD",
  "ETH_EUR",
  "BTC_EUR",
  "BCH_EUR",
  "ETH_GBP",
  "BTC_GBP",
  "BCH_GBP",
  "TETH_EUR",
  "TBTC_EUR",
  "TBCH_EUR",
  "TETH_GBP",
  "TBTC_GBP",
  "TBCH_GBP",
  "TETH_USD",
  "TBTC_USD",
  "TBCH_USD"
];
const fiatCurrencies = ["USD", "EUR", "GBP"];
const cryptoCurrencies = ["ETH", "BTC", "BCH", "TETH", "TBTC", "TBCH"];
const cryptoFeeCodes = {
  cryptoDepositTransactionFee: "TXN",
  cryptoFXFee: "FX",
  externalCryptoDepositFXFee: "BCN"
};

const variables = {
  appPort,
  env,
  loggerName,
  logLevel,
  host,
  fsCurrencyAdapter,
  planFXRates,
  fsCrmAdapter,
  fsFeeService,
  tickers,
  fiatCurrencies,
  cryptoCurrencies,
  bcCryptoService,
  cryptoFeeCodes,
  fsXeCurrencyAdapter
};

module.exports = variables;
