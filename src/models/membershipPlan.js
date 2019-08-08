"use strict";

const axios = require("axios");
const variables = require("../variables/index");

const getPlan = async contactId => {
  return await axios
    .get(`${variables.fsCrmAdapter}/subscription-plans/${contactId}`)
    .then(response => {
      return response.data.data;
    })
    .catch(error => {
      if (error.response) {
        throw error.response;
      } else {
        throw {
          status: 503,
          title: "Fee service unavailable",
          errors: error
        };
      }
    });
};
const getPlanFxFee = async (planId, data) => {
  return await axios
    .post(`${variables.fsFeeService}/fee/${planId}`, data)
    .then(response => {
      return response.data.data;
    })
    .catch(error => {
      if (error.response) {
        throw error.response;
      } else {
        throw {
          status: 503,
          title: "CRM adapter unavailable",
          errors: error
        };
      }
    });
};

const getFee = async (planId, code, amount) => {
  const data = {
    planId,
    amount,
    code
  };
  const response = await axios.post(
    `${variables.fsFeeService}/fee/${planId}`,
    data
  );
  return response.data.data.fee;
};

const getAllFeesForAPlan = async planId => {
  const data = {
    planId
  };
  const response = await axios.post(
    `${variables.fsFeeService}/fees/${planId}`,
    data
  );
  return response.data.data;
};

module.exports = { getPlan, getPlanFxFee, getFee, getAllFeesForAPlan };
