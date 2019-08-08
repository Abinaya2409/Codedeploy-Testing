"use strict";

const errorHandler = require("../helpers/errorHandler");
const currencyModel = require("../models/currency");
const membershipPlan = require("../models/membershipPlan");
const validator = require("validatorjs");
require("../helpers/customValidation");
const variables = require("../variables/index");

const rules = {
  from: "regex:/^[A-Z]*$/|size:3|is_supported_currency",
  to: "regex:/^[A-Z]*$/|size:3|is_supported_currency",
  amount: "required|numeric|is_more_than_zero"
};
exports.conversion = async ctx => {
  const contactId = ctx.req.headers.contactid;
  const requestData = {
    from: ctx.params.from.toUpperCase(),
    to: ctx.params.to.toUpperCase(),
    amount: ctx.params.amount
  };

  try {
    const validationResponse = new validator(requestData, rules);
    if (validationResponse.fails()) {
      throw {
        status: 400,
        errors: {
          invalidParams: validationResponse.errors.all()
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

    const memberMarkupRate = variables.planFXRates[planInfo.name];

    let spotRate = await currencyModel.getXeSpotRate(
      requestData.from,
      requestData.to
    );
    if (!spotRate) {
      spotRate = await currencyModel.getCurrencyCloudeSpotRate(
        requestData.from,
        requestData.to
      );
    }

    const baseToDestinationSpotRate = spotRate.baseToDestinationSpotRate;
    const destinationToBaseSpotRate = spotRate.destinationToBaseSpotRate;
    const baseToDestinationMemberRate =
      baseToDestinationSpotRate + baseToDestinationSpotRate * memberMarkupRate;

    const destinationToBaseMemberRate =
      destinationToBaseSpotRate + destinationToBaseSpotRate * memberMarkupRate;

    const destinationAmount = requestData.amount * baseToDestinationSpotRate;
    const responseData = {
      destinationAmount: parseFloat(destinationAmount),
      baseToDestinationSpotRate: parseFloat(baseToDestinationSpotRate),
      destinationToBaseSpotRate: parseFloat(destinationToBaseSpotRate),
      baseToDestinationMemberRate: parseFloat(baseToDestinationMemberRate),
      destinationToBaseMemberRate: parseFloat(destinationToBaseMemberRate),
      memberMarkupRate: parseFloat(memberMarkupRate)
    };

    ctx.response.ok(responseData, "Conversion rate fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};
