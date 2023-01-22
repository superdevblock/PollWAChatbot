const router = require('express').Router();
const Path = require('../models/Path');

router.post('/path', (req, res) => {
  const { participant, surveyId } = req.body;
  const path = new Path(participant, surveyId);
  path.save()
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.patch('/path', (req, res) => {
  const { pathId, participant, surveyId } = req.body;
  Path.findByIdAndUpdate(pathId, { participant, survey: surveyId })
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/path/:id', (req, res) => {
  const { id } = req.params;
  Path.findById(id)
    .then((doc) => {
      if (doc) return res.status(200).json(doc.toJSON());
      return res.status(404).json({ message: 'Path not found' });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.delete('/path/:id', (req, res) => {
  const { id } = req.params;
  Path.findByIdAndDelete(id)
    .then((_doc) => res.status(200).json({ message: 'Deleted!' }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/paths/:surveyId', (req, res) => {
  const { surveyId } = req.params;
  Path.find({ survey: surveyId })
    .then((docs) => res.status(200).json(docs))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

module.exports = router;
