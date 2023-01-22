const router = require('express').Router();
const Survey = require('../models/Survey');
const Node = require('../models/Node');
const { runSurvey } = require('../utility/utility');
const Path = require('../models/Path');
const QuestionTypes = require('../models/QuestionTypes');
const Answer = require('../models/Answer');
const Combination = require('../models/Combination');

const userId = '5fdce90b72b8b020b07ef768';

router.post('/survey', (req, res) => {
  const {
    title, description, participants,
  } = req.body;
  const survey = new Survey(userId, title, description, participants);

  survey.save()
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.patch('/survey', (req, res) => {
  const {
    surveyId, title, description, participants,
  } = req.body;

  Survey.findByIdAndUpdate(
    surveyId,
    {
      $set: {
        user: userId, title, description, participants,
      },
    },
    { new: true, useFindAndModify: false },
  )
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.post('/survey/participants', (req, res) => {
  const {
    surveyId, optIn, participants, optinQuestion, optinYesText, optinNoText,
  } = req.body;

  Survey.findByIdAndUpdate(
    surveyId,
    {
      $set: {
        optIn, participants, optinQuestion, optinYesText, optinNoText,
      },
    },
    { new: true, useFindAndModify: false },
  )
    .then((doc) => res.status(200).json(doc.toJSON()))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.post('/survey/start', (req, res) => {
  const { surveyId } = req.body;
  Survey.findOne({ ready: true, terminated: false })
    .then((doc) => {
      if (doc) {
        res.status(200).json({ success: false });
      } else {
        Survey.findByIdAndUpdate(
          surveyId,
          { $set: { ready: true } },
          { new: true, useFindAndModify: false },
        )
          .then((docr) => {
            runSurvey(docr).then(null);
            return res.status(200).json({ success: true, survey: docr.toJSON() });
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ message: 'Action failed!' });
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.post('/survey/stop', (req, res) => {
  const { surveyId } = req.body;
  Survey.findByIdAndUpdate(
    surveyId,
    { $set: { ready: false } },
    { new: true, useFindAndModify: false },
  )
    .then((docr) => res.status(200).json({ success: true, survey: docr.toJSON() }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.post('/survey/terminate', (req, res) => {
  const { surveyId } = req.body;
  Survey.findByIdAndUpdate(
    surveyId,
    { $set: { terminated: true } },
    { new: true, useFindAndModify: false },
  )
    .then((doc) => res.status(200).json({ success: true, survey: doc.toJSON() }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

// router.post('/survey/emulate', (req, res) => {
//   const { surveyId, clientId } = req.body;
//   try {
//     res.status(200).json({});
//     conductSurveyE(req.io, surveyId, clientId).then(null);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: 'Action failed!' });
//   }
// });

router.get('/survey/:id', (req, res) => {
  const { id } = req.params;
  Survey.findById(id)
    .then((doc) => {
      if (doc) return res.status(200).json(doc.toJSON());
      return res.status(404).json({ message: 'Survey not found' });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.delete('/survey/:id', (req, res) => {
  const { id } = req.params;
  Survey.findByIdAndDelete(id)
    .then((_doc) => {
      Node.deleteMany({ survey: id })
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

router.get('/surveys', (req, res) => {
  Survey.find({ user: userId })
    .then((docs) => res.status(200).json(docs))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Action failed!' });
    });
});

router.get('/survey/metrics/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [survey, paths] = await Promise.all([Survey.findById(id), Path.find({ survey: id })]);

    const nodes = await Node.find({ survey: id, questionType: QuestionTypes.MULTIPLECHOICE });
    const questionStats = [];

    for (let i = 0; i < nodes.length; i += 1) {
      const currentQuestion = nodes[i].question;
      const [answers, combinations] = await Promise.all([Answer.find({ node: nodes[i].id }),
        Combination.find({ node: nodes[i].id })]);

      const countPerAnswer = [];

      for (let j = 0; j < answers.length; j += 1) {
        countPerAnswer.push(
          combinations.filter((c) => c.answer.toString() === answers[j].id).length,
        );
      }

      questionStats.push({
        question: currentQuestion,
        answerTexts: answers.map((a) => a.text),
        countPerAnswer,
      });
    }

    const completed = paths.filter((p) => p.terminated === true).length;
    res.status(200).json({
      participants: survey.participants.length,
      contacted: paths.length,
      inprogress: paths.length - completed,
      completed,
      questionStats,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Action failed!' });
  }
});

module.exports = router;
