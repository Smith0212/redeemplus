const { events, EventEmitter } = require("./emitter");
const cryptoLib = require('cryptlib');
const { ENCRYPTION_BYPASS } = require('../config/constants.js');
const shaKey = cryptoLib.getHashSha256(process.env.KEY, 32);

function encrypt(data){
    if (!ENCRYPTION_BYPASS) {
        return cryptoLib.encrypt(JSON.stringify(data), shaKey, process.env.IV);
    } else {
        return data;
    }
}

module.exports = {
    restaurantSocket: (io) => {
        return io.of('/restaurant').on('connection', function (socket) {
            // let admin_id = socket.handshake.query.admin_id;
            // console.log(admin_id + " is connected");

            EventEmitter.on(events.UPDATE_RESTAURANT, data => socket.emit(events.UPDATE_RESTAURANT, encrypt(data)));

            EventEmitter.on(events.ADD_RESTAURANT, data => socket.emit(events.ADD_RESTAURANT, encrypt(data)));

            // socket.on('disconnect', () => console.log(admin_id + " is disconnected"));
        });
    }
}