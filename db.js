const mongoose = require('mongoose');

const connectDB = (successcb, errorcb) => {
  mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      successcb();
    })
    .catch((e) => {
      errorcb(e);
    });
};

module.exports = connectDB;
