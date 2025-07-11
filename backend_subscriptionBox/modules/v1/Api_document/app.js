const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
require('dotenv').config();

console.log('PORT:', process.env.PORT);
console.log('API_KEY:', process.env.API_KEY);
console.log('KEY:', process.env.KEY);
console.log('IV:', process.env.IV);


// Set EJS as the template engine
app.set('view engine', 'ejs');

// Serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Use the existing route file
const router = require('./route.js');
app.use('/', router);

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');
});

// Start server
const PORT = 26450;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));