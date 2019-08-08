const validator = require('validatorjs');
const supportedCurrency = [
    "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM",
    "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD",
    "BTC", "BTN", "BWP", "BYR", "BZD", "CAD", "CDF", "CHF", "CLF", "CLP",
    "CNY", "COP", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP",
    "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GGP",
    "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG",
    "HUF", "IDR", "ILS", "IMP", "INR", "IQD", "ISK", "JEP", "JMD",
    "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KRW", "KWD", "KYD",
    "KZT", "LAK", "LKR", "LRD", "LSL", "LTL", "LVL", "MAD",
    "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRO", "MUR", "MVR", "MWK",
    "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR",
    "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "ZWL", "ZMW",
    "RON", "RSD", "RUB", "RWF", "SAR", "SCR", "SDG", "SEK", "SGD", "SHP",
    "SOS", "SRD", "STD", "SVC", "SYP", "THB", "TJS", "TMT", "TND", "TOP",
    "TTD", "TWD", "TZS", "UAH", "UGX", "UYU", "UZS", "VEF", "VND", "VUV",
    "XAF", "XAG", "XAU", "XCD", "XDR", "XPF", "YER", "ZAR", "ZMK", "SBD",
    "SLL", "SZL", "TRY", "USD", "WST", "XOF"
];
validator.register('is_supported_currency', (value, requirement, attribute) => {
    if (supportedCurrency.indexOf(value) === -1) {
        return false;
    }
    return true;
}, 'The :attribute currency is not supported.');

validator.register('is_more_than_zero', (value, requirement, attribute) => {
    if (value <= 0) {
        return false;
    }
    return true;
}, 'The :attribute must greater than zero(0).');