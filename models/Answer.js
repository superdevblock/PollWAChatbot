//  Text, Reference to next node
const mongoose = require('mongoose');

const { Model, Schema } = mongoose;

const schema = new Schema({
  text: {
    type: String,
    required: true,
  },
  node: {
    type: Schema.Types.ObjectId,
    ref: 'nodes',
  },
  nextNode: {
    type: Schema.Types.ObjectId,
    ref: 'nodes',
  },
}, { timestamps: true });

class Answer extends Model {
  constructor(text, nodeId, nextNodeId = null) {
    super({ text, node: nodeId, nextNode: nextNodeId });
  }
}

module.exports = mongoose.model(Answer, schema, 'answers');
