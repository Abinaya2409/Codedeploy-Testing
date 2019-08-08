"use strict";

exports.health = ctx => {
    const data = {
        status: "ok"
    };

    ctx.response.ok(data, "ok");
};
