require('dotenv').config();

const Koa = require('koa');
const cors = require("koa2-cors");
const variables = require('./variables');
const logMiddleware = require("au-helpers").logger;
const logger = require("./logger");
const requestId = require("au-helpers").requestId;
const responseHandler = require("au-helpers").responseHandler;
const router = require('./routes');
const koaBody = require('koa-body');

const app = new Koa();

app.use(koaBody());
app.use(requestId());
app.use(logMiddleware({ logger }));
app.use(responseHandler());
app.use(cors({ origin: "*" }));
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
app.listen(variables.appPort, () => {
    logger.info(`API server listening on ${variables.host}:${variables.appPort}`);
});

// Expose app
module.exports = app;
