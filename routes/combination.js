const router = require('express').Router();
const Combination = require('../models/Combination');

router.post('/combination', (req, res) => {
  const {
    nodeId, answerId, pathId, answerText,
  } = req.body;
  const combination = new Combination(pathId, nodeId, answerId, answerText);
  combination.save()
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.patch('/combination', (req, res) => {
  const {
    combinationId, nodeId, answerId, pathId, answerText,
  } = req.body;
  Combination.findByIdAndUpdate(
    combinationId,
    {
      node: nodeId, answer: answerId, path: pathId, answerText,
    },
    { useFindAndModify: false, new: true },
  )
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/combination/:id', (req, res) => {
  const { id } = req.params;
  Combination.findById(id)
    .then((doc) => {
      if (doc) return res.status(200).json(doc.toJSON());
      return res.status(404).json({ message: 'Combination not found' });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.delete('/combination/:id', (req, res) => {
  const { id } = req.params;
  Combination.findByIdAndDelete(id)
    .then((_doc) => res.status(200).json({ message: 'Deleted!' }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/combinations/:pathId', (req, res) => {
  const { pathId } = req.params;
  Combination.find({ path: pathId })
    .then((docs) => res.status(200).json(docs))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

module.exports = router;
