const router = require('express').Router();
const Answer = require('../models/Answer');
const Node = require('../models/Node');

router.post('/node', (req, res) => {
  const {
    name, question, questionType, surveyId, nextNodeId,
  } = req.body;
  const node = new Node(name, question, questionType, surveyId);
  if (nextNodeId) node.nextNode = nextNodeId;
  node.save()
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.patch('/node', (req, res) => {
  const {
    nodeId, name, question, questionType, nextNodeId,
  } = req.body;
  Node.findByIdAndUpdate(
    nodeId,
    {
      name, question, questionType, nextNode: nextNodeId,
    },
    { useFindAndModify: false, new: true },
  )
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/node/:id', (req, res) => {
  const { id } = req.params;
  Node.findById(id)
    .then((doc) => {
      if (doc) return res.status(200).json(doc.toJSON());
      return res.status(404).json({ message: 'Node not found' });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.delete('/node/:id', (req, res) => {
  const { id } = req.params;
  Node.findByIdAndDelete(id)
    .then((_doc) => {
      Answer.deleteMany({ node: id })
        .then((_res) => {
          res.status(200).json({ message: 'Deleted!' });
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ message: 'Action failed!' });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/nodes/:surveyId', (req, res) => {
  const { surveyId } = req.params;
  Node.find({ survey: surveyId })
    .then((docs) => res.status(200).json(docs))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

module.exports = router;
