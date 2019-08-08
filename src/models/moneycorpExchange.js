"use strict";

const axios = require("axios");
const variables = require("../variables/index");

const moneycorpExchange = {
    getFxRate: async (requestData) => {
       
        const response = await axios.get(`${variables.fsCrmAdapter}/rate/${requestData.baseCurrency}/${requestData.destinationCurrency}`)
            .then((response) => {
                const responseData = response.data.data
                return responseData;
            })
            .catch(error => {
                throw {
                    status: error.response.status,
                    title: error.response.statusText,
                    errors: error.response.data
                }
            });

        return response;
    },

};

module.exports = moneycorpExchange;