//server for Live Connect
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));


const storage = multer.diskStorage({
  destination: './uploads',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Serve uploaded files as static content
app.use('/uploads', express.static('uploads'));

// Store messages and files per room
const roomsData = {};

io.on('connection', (socket) => {
  console.log('a user connected');

 
  socket.on('join', (room) => {
    socket.join(room);
    
  if (roomsData[room]) {
    roomsData[room].messages.forEach(message => {
      socket.emit('message', message);
    });
    roomsData[room].files.forEach(fileName => {
      io.to(socket.id).emit('file', fileName); // Emit only to the newly joined socket
    });
  }
});

  socket.on('message', (data) => {
    io.to(data.room).emit('message', data.message);
    // Store the message for the room
    if (!roomsData[data.room]) {
      roomsData[data.room] = { messages: [], files: [] };
    }
    roomsData[data.room].messages.push(data.message);
  });

  socket.on('fileList', (data) => {
    io.to(data.room).emit('file', data.fileName);
    io.to(data.room).emit('message', `File shared: ${data.fileName}`);
    // Store the file for the room
    if (!roomsData[data.room]) {
      roomsData[data.room] = { messages: [], files: [] };
    }
    roomsData[data.room].files.push(data.fileName);
  });


socket.on('disconnect', () => {
  // Clear uploaded files when connection is closed
  const roomNames = Object.keys(roomsData);
  roomNames.forEach(roomName => {
    roomsData[roomName].files.forEach(fileName => {
      const filePath = path.join(__dirname, 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`File ${fileName} deleted successfully.`);
      } else {
        console.log(`File ${fileName} not found.`);
      }
    });
    delete roomsData[roomName];
  });
  console.log('a user disconnected');
});
});
app.post('/upload', upload.single('file'), (req, res) => {
  const room = req.body.room;
  const fileName = req.file.filename;
  console.log(`File uploaded to room: ${room}, fileName: ${fileName}`);
  io.to(room).emit('file', fileName);
  res.send('File uploaded successfully.');

});
const redirectPage = 'welcome.html'; // Change this to the page you want to open
const redirectUrl = `http://localhost:3000/${redirectPage}`;
server.listen(3000, async() => {
  console.log('Server is running on port 3000');
  try {
    // Use dynamic import to import the 'open' package
    const open = (await import('open')).default;

    // Open the default web browser with the specified URL
    await open(redirectUrl);

    console.log(`Visit ${redirectUrl} in your web browser.`);
  } catch (error) {
    console.error('Error opening browser:', error);
  }
});

