//server for collab
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

// Set up storage and upload configuration for multer
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
    // Send stored messages and files to the newly joined user
    if (roomsData[room]) {
      roomsData[room].messages.forEach(message => {
        socket.emit('message', message);
      });
      roomsData[room].files.forEach(fileName => {
        socket.emit('file', fileName);
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

  socket.on('file', (data) => {
    io.to(data.room).emit('file', data.fileName);
    // Store the file for the room
    if (!roomsData[data.room]) {
      roomsData[data.room] = { messages: [], files: [] };
    }
    roomsData[data.room].files.push(data.fileName);
  });

//   socket.on('disconnect', () => {
//     // Clear uploaded files when connection is closed
//     const roomNames = Object.keys(roomsData);
//     roomNames.forEach(roomName => {
//       roomsData[roomName].files.forEach(fileName => {
//         const filePath = path.join(__dirname, 'uploads', fileName);
//         if (fs.existsSync(filePath)) {
//           fs.unlinkSync(filePath);
//         }
//       });
//       delete roomsData[roomName];
//     });
//     console.log('a user disconnected');
//   });
// });

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
  io.to(req.body.room).emit('file', req.file.filename);
  res.send('File uploaded successfully.');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});

