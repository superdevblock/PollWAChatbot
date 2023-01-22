//  A set of Nodes, Paths and Participants
const mongoose = require('mongoose');

const { Model, Schema } = mongoose;

const schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  participants: [String],
  terminated: {
    type: Boolean,
    default: false,
  },
  ready: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
  optIn: {
    type: Boolean,
    default: false,
  },
  optinQuestion: {
    type: String,
    default: 'Do you want to participate?\nSend:',
  },
  optinYesText: {
    type: String,
    default: 'To Agree',
  },
  optinNoText: {
    type: String,
    default: 'To disagree',
  },
}, { timestamps: true });

class Survey extends Model {
  constructor(userId, title, description, participants = []) {
    super({
      user: userId, title, description, participants,
    });
  }
}

module.exports = mongoose.model(Survey, schema, 'surveys');
