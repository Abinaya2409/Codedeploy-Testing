"use strict";

const errorHandler = require("../helpers/errorHandler");
const moneycorpExchangeModel = require("../models/moneycorpExchange");
const membershipPlan = require("../models/membershipPlan");
const validator = require("validatorjs");
require("../helpers/customValidation");
const variables = require("../variables");


const exchangeRules = {
  baseCurrency: "regex:/^[A-Z]*$/|size:3|is_supported_currency",
  destinationCurrency: "regex:/^[A-Z]*$/|size:3|is_supported_currency",
  amount: "required|numeric|is_more_than_zero"
};

const rateRules = {
  baseCurrency: "regex:/^[A-Z]*$/|size:3|is_supported_currency",
  destinationCurrency: "regex:/^[A-Z]*$/|size:3|is_supported_currency"
};

exports.moneycorpExchange = async ctx => {
  const contactId = ctx.req.headers.contactid;
  const requestData = {
    baseCurrency: ctx.params.baseCurrency.toUpperCase(),
    destinationCurrency: ctx.params.destinationCurrency.toUpperCase(),
    amount: ctx.params.amount
  };

  try {
    const validationResponse = new validator(requestData, exchangeRules);
    if (validationResponse.fails()) {
      throw {
        status: 400,
        errors: {
          invalidParams: validationResponse.errors.all()
        }
      };
    }

    const fxRate = await moneycorpExchangeModel.getFxRate(requestData);
    if (fxRate.baseRate === undefined) {
      throw {
        status: 400,
        errors: {
          invalidParams: {
            planId: "FX rate not found"
          }
        }
      };
    }

    const planInfo = await membershipPlan.getPlan(contactId);

    if (planInfo.name === undefined) {
      throw {
        status: 400,
        errors: {
          invalidParams: {
            planId: "plan not found"
          }
        }
      };
    }

    const planId = planInfo.id;
    const data = {
      code: "FX",
      amount: 1
    };
    const planFxFee = await membershipPlan.getPlanFxFee(planId, data);

    if (planFxFee.fee === undefined) {
      throw {
        status: 400,
        errors: {
          invalidParams: {
            planId: "FX Fee not found"
          }
        }
      };
    }

    const convertedRate = fxRate.baseRate - fxRate.baseRate * planFxFee.fee;
    const convertedAmount = (requestData.amount * convertedRate).toFixed(2);
    const responseData = {
      baseRate: parseFloat(fxRate.baseRate),
      convertedRate: parseFloat(convertedRate),
      convertedAmount: parseFloat(convertedAmount)
    };
    ctx.response.ok(responseData, "FX rate fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

exports.moneycorpRate = async ctx => {
  const contactId = ctx.req.headers.contactid;
  const requestData = {
    baseCurrency: ctx.params.baseCurrency.toUpperCase(),
    destinationCurrency: ctx.params.destinationCurrency.toUpperCase()
  };

  try {
    const validationResponse = new validator(requestData, rateRules);
    if (validationResponse.fails()) {
      throw {
        status: 400,
        errors: {
          invalidParams: validationResponse.errors.all()
        }
      };
    }

    const fxRate = await moneycorpExchangeModel.getFxRate(requestData);
    if (fxRate.baseRate === undefined) {
      throw {
        status: 400,
        errors: {
          invalidParams: {
            planId: "FX rate not found"
          }
        }
      };
    }

    const planInfo = await membershipPlan.getPlan(contactId);

    if (planInfo.name === undefined) {
      throw {
        status: 400,
        errors: {
          invalidParams: {
            planId: "plan not found"
          }
        }
      };
    }

    const planId = planInfo.id;
    const data = {
      code: "FX",
      amount: 1
    };
    const planFxFee = await membershipPlan.getPlanFxFee(planId, data);

    if (planFxFee.fee === undefined) {
      throw {
        status: 400,
        errors: {
          invalidParams: {
            planId: "FX Fee not found"
          }
        }
      };
    }

    const convertedRate = fxRate.baseRate - fxRate.baseRate * planFxFee.fee;

    const responseData = {
      rate: parseFloat(convertedRate)
      // baseCurrency: requestData.baseCurrency,
      // destinationCurrency: requestData.destinationCurrency
    };

    ctx.response.ok(responseData, "FX rate fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

exports.moneycorpRateWithoutFee = async ctx => {
  const requestData = {
    baseCurrency: ctx.params.baseCurrency.toUpperCase(),
    destinationCurrency: ctx.params.destinationCurrency.toUpperCase()
  };

  try {
    const validationResponse = new validator(requestData, rateRules);
    if (validationResponse.fails()) {
      throw {
        status: 400,
        errors: {
          invalidParams: validationResponse.errors.all()
        }
      };
    }

    const fxRate = await moneycorpExchangeModel.getFxRate(requestData);
    if (fxRate.baseRate === undefined) {
      throw {
        status: 400,
        errors: {
          invalidParams: {
            planId: "FX rate not found"
          }
        }
      };
    }

    const convertedRate = fxRate.baseRate;

    const responseData = {
      rate: parseFloat(convertedRate)
    };

    ctx.response.ok(responseData, "FX rate fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};
