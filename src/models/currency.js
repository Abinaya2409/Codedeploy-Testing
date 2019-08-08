"use strict";

const axios = require("axios");
const variables = require("../variables/index");

const currency = {
  getCurrencyCloudeSpotRate: async (from, to) => {
    const response = await axios
      .get(`${variables.fsCurrencyAdapter}/conversion/${from}/${to}`)
      .then(response => {
        const responseData = {
          baseToDestinationSpotRate: response.data.data,
          destinationToBaseSpotRate: 1 / response.data.data
        };
        return responseData;
      })
      .catch(error => {
        throw {
          status: error.response.status,
          title: error.response.statusText,
          errors: error.response.data
        };
      });

    return response;
  },
  getXeSpotRate: async (from, to) => {
    const response = await axios
      .get(`${variables.fsXeCurrencyAdapter}/conversion/${from}/${to}`)
      .then(response => {
        const responseData = response.data.data;
        return responseData;
      })
      .catch(error => {
        return false;
      });

    return response;
  }
};

module.exports = currency;
