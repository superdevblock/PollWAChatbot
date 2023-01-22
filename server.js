require('dotenv').config();

const cors = require('cors');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fileUpload = require('express-fileupload');
const connect = require('./db');
const { conductSurveyE } = require('./utility/utility');

const app = express();
const httpServer = http.Server(app);
const io = socketIO(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use((req, _res, next) => {
  req.io = io;
  next();
});
app.use(express.json());
app.use(cors());
app.use(fileUpload({
  limits: { fileSize: 1 * 1024 * 1024, files: 1 },
  abortOnLimit: true,
  parseNested: true,
  safeFileNames: true,
  useTempFiles: true,
  tempFileDir: './files/',
}));
app.use('/', require('./routes/routes'));

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('emulate', ({ clientId, surveyId }) => {
    conductSurveyE(socket, surveyId, clientId).then(null);
  });
});

connect(() => {
  const port = process.env.PORT || 8080;
  httpServer.listen(port, () => console.log(`Server listening on PORT ${port}..`));
},
() => {
  console.log('Database connection failed!');
});
