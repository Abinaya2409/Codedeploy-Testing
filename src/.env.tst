# App
APP_PORT=8081
LOGGER_NAME=tst-fs-currency-service
LOG_LEVEL=info

# Currency
CURRENCY_ADAPTER_URL=ssm:///tst-fs/fs-currency-adapter/URL
CRM_ADAPTER_URL=ssm:///tst-fs/fs-crm-adapter/URL
FEE_SERVICE_URL=ssm:///tst-fs/fs-fee-service/URL
BC_CRYPTO_SERVICE=ssm:///tst-fs/vpc-endpoint/bc-crypto-service/URL
XE_CURRENCY_ADAPTER_URL=ssm:///tst-fs/fs-fx-xe-adapter/URL