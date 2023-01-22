const router = require('express').Router();
const Answer = require('../models/Answer');

router.post('/answer', (req, res) => {
  const { text, nodeId, nextNodeId } = req.body;
  const answer = new Answer(text, nodeId, nextNodeId);
  answer.save()
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.patch('/answer', (req, res) => {
  const {
    answerId, text, nodeId, nextNodeId,
  } = req.body;
  Answer.findByIdAndUpdate(
    answerId,
    { text, node: nodeId, nextNode: nextNodeId },
    { useFindAndModify: false, new: true },
  )
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/answer/:id', (req, res) => {
  const { id } = req.params;
  Answer.findById(id)
    .then((doc) => {
      if (doc) return res.status(200).json(doc.toJSON());
      return res.status(404).json({ message: 'Answer not found' });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.delete('/answer/:id', (req, res) => {
  const { id } = req.params;
  Answer.findByIdAndDelete(id)
    .then((_doc) => res.status(200).json({ message: 'Deleted!' }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/answers/:nodeId', (req, res) => {
  const { nodeId } = req.params;
  Answer.find({ node: nodeId })
    .then((docs) => res.status(200).json(docs))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

module.exports = router;
