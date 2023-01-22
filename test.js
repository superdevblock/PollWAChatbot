require('dotenv').config();
const connect = require('./db');
const { login } = require('./utility/utility');

connect(async () => {
  await login();
  //  process.exit(0);
},
() => {
  console.log('Database connection failed!');
  process.exit(0);
});
