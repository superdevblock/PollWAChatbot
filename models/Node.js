//  Question, Answers, Successors
const mongoose = require('mongoose');

const { Model, Schema } = mongoose;

const schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  questionType: {
    type: Number,
    required: true,
    enum: [0, 1, 2],
  },
  survey: {
    type: Schema.Types.ObjectId,
    ref: 'surveys',
  },
  nextNode: {
    type: Schema.Types.ObjectId,
    ref: 'nodes',
  },
}, { timestamps: true });

class Node extends Model {
  constructor(name, question, questionType, surveyId, nextNodeId = null) {
    super({
      name, question, questionType, survey: surveyId, nextNode: nextNodeId,
    });
  }
}

module.exports = mongoose.model(Node, schema, 'nodes');
