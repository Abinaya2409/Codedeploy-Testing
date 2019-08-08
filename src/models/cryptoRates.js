"use strict";

const axios = require("axios");
const variables = require("../variables");

const getRatePost = async (ticker, currency, quantity, contactId, action) => {
  const body = {
    ticker,
    currency,
    quantity,
    contactId,
    action
  };
  const result = await axios.post(`${variables.bcCryptoService}/rates`, body);

  return result.data.data;
};

module.exports = { getRatePost };
