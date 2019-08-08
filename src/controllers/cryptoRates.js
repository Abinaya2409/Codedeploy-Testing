"use strict";

const { errorResponseHandler } = require("au-helpers");

const moneycorpExchangeModel = require("../models/moneycorpExchange");
const membershipPlan = require("../models/membershipPlan");
const cumberlandModel = require("../models/cryptoRates");
const validator = require("validatorjs");
require("../helpers/customValidation");
const variables = require("../variables");

validator.register(
  "decimal",
  value => {
    let val = String(value);
    return val.match(/^\d+(\.\d{1,})?$/);
  },
  "The :attribute is not a positive decimal number."
);

const validate = (data, rules, messages) => {
  const validation = new validator(data, rules, messages);

  if (validation.fails()) {
    throw {
      status: 400,
      message: "Invalid Parameter(s)",
      data: validation.errors.all()
    };
  }

  return validation.passes();
};

async function getRate(
  cryptoFXFeePct,
  externalCryptoDepositFXFeePct,
  txFeePct,
  ticker,
  currency,
  amount,
  contactId,
  action,
  applyCryptoRounding,
  applyFiatRounding
) {
  let fxRateResponse;

  // Check if ticker has USD, cause Cumberland works only with USD
  let newTicker;
  let newCurrency = "USD";
  const subFiatCurrency = ticker.split("_")[1];
  const subCryptoCurrency = ticker.split("_")[0];

  if (subFiatCurrency !== "USD") {
    const baseCurrency = "USD";
    newTicker = `${subCryptoCurrency}_USD`;
    fxRateResponse = await moneycorpExchangeModel.getFxRate({
      baseCurrency,
      destinationCurrency: subFiatCurrency
    });
  }

  const cryptoSelected = variables.cryptoCurrencies.includes(currency);

  newCurrency = cryptoSelected ? currency : newCurrency;

  const fiatRate =
    fxRateResponse && fxRateResponse.baseRate ? fxRateResponse.baseRate : 1;

  const rateResponse = await cumberlandModel.getRatePost(
    newTicker || ticker,
    newCurrency,
    cryptoSelected ? amount : amount / fiatRate,
    contactId,
    action
  );

  const usdToCryptoExchangeRate = rateResponse.exchangeRate;

  rateResponse.exchangeRate = applyCryptoRounding(
    rateResponse.exchangeRate * fiatRate
  );

  rateResponse.reverseRate = applyCryptoRounding(
    rateResponse.reverseRate / fiatRate
  );

  let rateFee;
  let reverseRateFee;
  let usdToCryptoFee;
  let txnFeeFiat;
  let usdToCryptoRateAdjustedRate;
  let adjustedRate;
  let adjustedReverseRate;
  let adjustedAmount;
  let txnFeeCrypto;
  let externalCryptoDepositFXFee;
  let cryptoFXFee;
  let reverseCryptoFXFee;
  let reverseExternalCryptoDepositFee;

  cryptoFXFee = cryptoFXFeePct * rateResponse.exchangeRate;

  externalCryptoDepositFXFee =
    externalCryptoDepositFXFeePct * rateResponse.exchangeRate;

  rateFee = applyCryptoRounding(cryptoFXFee + externalCryptoDepositFXFee);

  reverseCryptoFXFee = cryptoFXFeePct * rateResponse.reverseRate;

  reverseExternalCryptoDepositFee =
    externalCryptoDepositFXFeePct * rateResponse.reverseRate;

  reverseRateFee = applyCryptoRounding(
    reverseCryptoFXFee + reverseExternalCryptoDepositFee
  );

  usdToCryptoFee = applyFiatRounding(
    cryptoFXFeePct * usdToCryptoExchangeRate +
      externalCryptoDepositFXFeePct * usdToCryptoExchangeRate
  );

  usdToCryptoRateAdjustedRate = applyFiatRounding(
    usdToCryptoExchangeRate - usdToCryptoFee
  );
  if (action === "SELL") {
    adjustedRate = applyFiatRounding(rateResponse.exchangeRate - rateFee);

    adjustedReverseRate = applyCryptoRounding(
      rateResponse.reverseRate + reverseRateFee
    );
  } else {
    adjustedRate = applyFiatRounding(rateResponse.exchangeRate + rateFee);

    adjustedReverseRate = applyCryptoRounding(
      rateResponse.reverseRate - reverseRateFee
    );
  }
  if (cryptoSelected) {
    adjustedAmount = applyCryptoRounding(amount * adjustedRate);

    txnFeeFiat = applyFiatRounding(amount * txFeePct * adjustedRate);

    txnFeeCrypto = applyCryptoRounding(amount * txFeePct);
  } else {
    adjustedAmount = applyCryptoRounding((amount * 1) / adjustedRate);

    txnFeeFiat = applyFiatRounding(amount / (1 - txFeePct) - amount);

    txnFeeCrypto = applyCryptoRounding((txnFeeFiat * 1) / adjustedRate);
  }

  const currentTime = rateResponse.currentTime;
  const expirationTime = rateResponse.expirationTime;

  return {
    subFiatCurrency,
    subCryptoCurrency,
    adjustedRate,
    adjustedReverseRate,
    adjustedAmount,
    txnFeeFiat,
    txnFeeCrypto,
    currentTime,
    expirationTime,
    details: {
      quoteId: rateResponse.id,
      fiatRate,
      usdToCryptoExchangeRate,
      usdToCryptoRateAdjustedRate,
      fxFeePct: cryptoFXFeePct,
      fxFeeUSD: applyFiatRounding(rateResponse.amount * cryptoFXFeePct),
      externalFXFeePct: externalCryptoDepositFXFeePct,
      externalFXFeeUSD: applyFiatRounding(
        rateResponse.amount * externalCryptoDepositFXFeePct
      ),
      txFeePct,
      txFeeUSD: applyFiatRounding(rateResponse.amount * txFeePct)
    }
  };
}

const getFees = async (
  planId,
  feeCodes = [
    variables.cryptoFeeCodes.cryptoFXFee,
    variables.cryptoFeeCodes.externalCryptoDepositFXFee,
    variables.cryptoFeeCodes.cryptoDepositTransactionFee
  ]
) => {
  const fees = await membershipPlan.getAllFeesForAPlan(planId);
  const feesArray = [];
  if (fees.length !== 0) {
    for (let i = 0; i < fees.length; i++) {
      if (feeCodes.includes(fees[i].transactionGroup.code)) {
        const feeData = fees[i];
        let fee, type, minFee;
        switch (feeData.type.value) {
          case "Percentage":
            fee = feeData.amount;
            type = "Percentage";
            minFee = feeData.minAmount;

            break;
          case "Flat":
            fee = feeData.amount;
            type = "Flat";
            break;
        }
        feesArray.push({
          fee,
          minFee,
          type,
          code: fees[i].transactionGroup.code
        });
      }
    }
  }
  return feesArray;
};

function getFeesForCryptoDeposit(allFees) {
  let cryptoFXFeePct = allFees.filter(
    fee =>
      fee.code === variables.cryptoFeeCodes.cryptoFXFee &&
      fee.type === "Percentage" &&
      fee.minFee === 0
  );

  cryptoFXFeePct = cryptoFXFeePct.length > 0 ? cryptoFXFeePct[0].fee : 0;

  let externalCryptoDepositFXFeePct = allFees.filter(
    fee =>
      fee.code === variables.cryptoFeeCodes.externalCryptoDepositFXFee &&
      fee.type === "Percentage" &&
      fee.minFee === 0
  );

  externalCryptoDepositFXFeePct =
    externalCryptoDepositFXFeePct.length > 0
      ? externalCryptoDepositFXFeePct[0].fee
      : 0;

  let txFeePct = allFees.filter(
    fee =>
      fee.code === variables.cryptoFeeCodes.cryptoDepositTransactionFee &&
      fee.type === "Percentage" &&
      fee.minFee === 0
  );

  txFeePct = txFeePct.length > 0 ? txFeePct[0].fee : 0;

  return {
    cryptoFXFeePct,
    externalCryptoDepositFXFeePct,
    txFeePct
  };
}

exports.depositCryptoPaymentRateWithFee = async ctx => {
  const { amount, currency, ticker } = ctx.request.body;
  const contactId = ctx.request.body.contactId || ctx.req.headers.contactid;

  const rules = {
    contactId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    amount: "required|decimal",
    currency: [
      "required",
      { in: variables.cryptoCurrencies.concat(variables.fiatCurrencies) },
      { in: [ticker.split("_")[0], ticker.split("_")[1]] }
    ],
    ticker: ["required", { in: variables.tickers }]
  };

  try {
    validate(
      {
        contactId,
        amount,
        currency,
        ticker
      },
      rules
    );

    const decimalSpaces = 1e8;
    const applyCryptoRounding = value =>
      Math.round(value * decimalSpaces) / decimalSpaces;
    const applyFiatRounding = value => Math.round(value * 100) / 100;

    const plan = await membershipPlan.getPlan(contactId);

    const allFees = await getFees(plan.id);

    const fees = getFeesForCryptoDeposit(allFees);

    const rateResponse = await getRate(
      fees.cryptoFXFeePct,
      fees.externalCryptoDepositFXFeePct,
      fees.txFeePct,
      ticker,
      currency,
      amount,
      contactId,
      "SELL",
      applyCryptoRounding,
      applyFiatRounding
    );

    if (variables.cryptoCurrencies.includes(currency)) {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: applyCryptoRounding(
            amount - rateResponse.txnFeeCrypto
          ),
          paymentFee: rateResponse.txnFeeCrypto,
          paymentTotal: amount,
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: applyFiatRounding(
            rateResponse.adjustedAmount - rateResponse.txnFeeFiat
          ),
          paymentFiatFee: rateResponse.txnFeeFiat,
          paymentFiatTotal: rateResponse.adjustedAmount,
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString()
        },
        "Crypto payment rates received"
      );
    } else {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: rateResponse.adjustedAmount,
          paymentFee: rateResponse.txnFeeCrypto,
          paymentTotal: applyCryptoRounding(
            rateResponse.adjustedAmount + rateResponse.txnFeeCrypto
          ),
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: amount,
          paymentFiatFee: rateResponse.txnFeeFiat,
          paymentFiatTotal: applyFiatRounding(amount + rateResponse.txnFeeFiat),
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString()
        },
        "Crypto payment rates received"
      );
    }
  } catch (error) {
    errorResponseHandler(ctx, error);
  }
};

exports.depositCryptoPaymentRateWithFeeInternal = async ctx => {
  const { amount, currency, ticker } = ctx.request.body;
  const contactId = ctx.request.body.contactId || ctx.req.headers.contactid;

  const rules = {
    contactId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    amount: "required|decimal",
    currency: [
      "required",
      { in: variables.cryptoCurrencies.concat(variables.fiatCurrencies) },
      { in: [ticker.split("_")[0], ticker.split("_")[1]] }
    ],
    ticker: ["required", { in: variables.tickers }]
  };

  try {
    validate(
      {
        contactId,
        amount,
        currency,
        ticker
      },
      rules
    );

    const decimalSpaces = Math.pow(10, 8);
    const applyCryptoRounding = value =>
      Math.round(value * decimalSpaces) / decimalSpaces;
    const applyFiatRounding = value => Math.round(value * 100) / 100;

    const plan = await membershipPlan.getPlan(contactId);

    const allFees = await getFees(plan.id);

    const fees = getFeesForCryptoDeposit(allFees);

    const rateResponse = await getRate(
      fees.cryptoFXFeePct,
      fees.externalCryptoDepositFXFeePct,
      fees.txFeePct,
      ticker,
      currency,
      amount,
      contactId,
      "SELL",
      applyCryptoRounding,
      applyFiatRounding
    );

    if (variables.cryptoCurrencies.includes(currency)) {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: applyCryptoRounding(
            amount - rateResponse.txnFeeCrypto
          ),
          paymentFee: rateResponse.txnFeeCrypto,
          paymentTotal: amount,
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: applyFiatRounding(
            rateResponse.adjustedAmount - rateResponse.txnFeeFiat
          ),
          paymentFiatFee: rateResponse.txnFeeFiat,
          paymentFiatTotal: rateResponse.adjustedAmount,
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString(),
          details: rateResponse.details
        },
        "Crypto payment rates received"
      );
    } else {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: rateResponse.adjustedAmount,
          paymentFee: rateResponse.txnFeeCrypto,
          paymentTotal: applyCryptoRounding(
            rateResponse.adjustedAmount + rateResponse.txnFeeCrypto
          ),
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: amount,
          paymentFiatFee: rateResponse.txnFeeFiat,
          paymentFiatTotal: applyFiatRounding(amount + rateResponse.txnFeeFiat),
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString(),
          details: rateResponse.details
        },
        "Crypto payment rates received"
      );
    }
  } catch (err) {
    errorResponseHandler(ctx, err);
  }
};

exports.membershipCryptoPaymentRateNoFee = async ctx => {
  const { amount, currency, ticker } = ctx.request.body;
  const contactId = ctx.request.body.contactId || ctx.req.headers.contactid;

  const rules = {
    contactId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    amount: "required|decimal",
    currency: [
      "required",
      { in: variables.cryptoCurrencies.concat(variables.fiatCurrencies) },
      { in: [ticker.split("_")[0], ticker.split("_")[1]] }
    ],
    ticker: ["required", { in: variables.tickers }]
  };

  try {
    validate(
      {
        contactId,
        amount,
        currency,
        ticker
      },
      rules
    );

    const decimalSpaces = Math.pow(10, 8);
    const applyCryptoRounding = value =>
      Math.round(value * decimalSpaces) / decimalSpaces;
    const applyFiatRounding = value => Math.round(value * 100) / 100;

    const rateResponse = await getRate(
      0,
      0,
      0,
      ticker,
      currency,
      amount,
      contactId,
      "SELL",
      applyCryptoRounding,
      applyFiatRounding
    );

    if (variables.cryptoCurrencies.includes(currency)) {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: applyCryptoRounding(amount),
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: applyFiatRounding(rateResponse.adjustedAmount),
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString()
        },
        "Crypto payment rates received"
      );
    } else {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: rateResponse.adjustedAmount,
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: amount,
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString()
        },
        "Crypto payment rates received"
      );
    }
  } catch (error) {
    errorResponseHandler(ctx, error);
  }
};

exports.membershipCryptoPaymentRateNoFeeInternal = async ctx => {
  const { amount, currency, ticker } = ctx.request.body;
  const contactId = ctx.request.body.contactId || ctx.req.headers.contactid;

  const rules = {
    contactId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    amount: "required|decimal",
    currency: [
      "required",
      { in: variables.cryptoCurrencies.concat(variables.fiatCurrencies) },
      { in: [ticker.split("_")[0], ticker.split("_")[1]] }
    ],
    ticker: ["required", { in: variables.tickers }]
  };

  try {
    validate(
      {
        contactId,
        amount,
        currency,
        ticker
      },
      rules
    );

    const decimalSpaces = Math.pow(10, 8);
    const applyCryptoRounding = value =>
      Math.round(value * decimalSpaces) / decimalSpaces;
    const applyFiatRounding = value => Math.round(value * 100) / 100;

    const rateResponse = await getRate(
      0,
      0,
      0,
      ticker,
      currency,
      amount,
      contactId,
      "SELL",
      applyCryptoRounding,
      applyFiatRounding
    );

    if (variables.cryptoCurrencies.includes(currency)) {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: applyCryptoRounding(amount),
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: applyFiatRounding(rateResponse.adjustedAmount),
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString(),
          details: rateResponse.details
        },
        "Crypto payment rates received"
      );
    } else {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: rateResponse.adjustedAmount,
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: amount,
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString(),
          details: rateResponse.details
        },
        "Crypto payment rates received"
      );
    }
  } catch (error) {
    errorResponseHandler(ctx, error);
  }
};

exports.cryptoTradeRate = async ctx => {
  const { amount, currency, ticker, action } = ctx.request.body;
  const contactId = ctx.request.body.contactId || ctx.req.headers.contactid;

  const rules = {
    contactId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    amount: "required|decimal",
    currency: [
      "required",
      { in: variables.cryptoCurrencies.concat(variables.fiatCurrencies) },
      { in: [ticker.split("_")[0], ticker.split("_")[1]] }
    ],
    ticker: ["required", { in: variables.tickers }],
    action: ["required", { in: ["BUY", "SELL"] }]
  };

  try {
    validate(
      {
        contactId,
        amount,
        currency,
        ticker,
        action
      },
      rules
    );

    const decimalSpaces = 1e8;
    const applyCryptoRounding = value =>
      Math.round(value * decimalSpaces) / decimalSpaces;
    const applyFiatRounding = value => Math.round(value * 100) / 100;

    const plan = await membershipPlan.getPlan(contactId);

    const allFees = await getFees(plan.id);

    const fees = getFeesForCryptoDeposit(allFees);

    const rateResponse = await getRate(
      fees.cryptoFXFeePct,
      fees.externalCryptoDepositFXFeePct,
      fees.txFeePct,
      ticker,
      currency,
      amount,
      contactId,
      action,
      applyCryptoRounding,
      applyFiatRounding
    );

    if (variables.cryptoCurrencies.includes(currency)) {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: applyCryptoRounding(
            amount - rateResponse.txnFeeCrypto
          ),
          paymentFee: rateResponse.txnFeeCrypto,
          paymentTotal: amount,
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: applyFiatRounding(
            rateResponse.adjustedAmount - rateResponse.txnFeeFiat
          ),
          paymentFiatFee: rateResponse.txnFeeFiat,
          paymentFiatTotal: rateResponse.adjustedAmount,
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString()
        },
        "Crypto payment rates received"
      );
    } else {
      ctx.response.ok(
        {
          paymentRate: rateResponse.adjustedReverseRate,
          paymentAmount: rateResponse.adjustedAmount,
          paymentFee: rateResponse.txnFeeCrypto,
          paymentTotal: applyCryptoRounding(
            rateResponse.adjustedAmount + rateResponse.txnFeeCrypto
          ),
          paymentCurrency: rateResponse.subCryptoCurrency,
          paymentFiatRate: rateResponse.adjustedRate,
          paymentFiatAmount: amount,
          paymentFiatFee: rateResponse.txnFeeFiat,
          paymentFiatTotal: applyFiatRounding(amount + rateResponse.txnFeeFiat),
          paymentFiatCurrency: rateResponse.subFiatCurrency,
          rateCreated: new Date(rateResponse.currentTime).toISOString(),
          rateExpires: new Date(rateResponse.expirationTime).toISOString()
        },
        "Crypto payment rates received"
      );
    }
  } catch (error) {
    errorResponseHandler(ctx, error);
  }
};
