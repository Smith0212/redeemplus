const { EventEmitter } = require("events");

module.exports = {
    events: {
        ADD_RESTAURANT: 'ADD_RESTAURANT',
        UPDATE_RESTAURANT: 'UPDATE_RESTAURANT'
    },
    EventEmitter: new EventEmitter()
}