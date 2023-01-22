// We're going to discuss with this BOT
const { Client } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const Path = require('../models/Path');
const EPath = require('../models/EPath');
const Combination = require('../models/Combination');
const Node = require('../models/Node');
const QuestionTypes = require('../models/QuestionTypes');
const Answer = require('../models/Answer');
const Survey = require('../models/Survey');
const User = require('../models/User');
const SessionStates = require('../models/SessionStates');
const OptinStates = require('../models/OptinStates');

const userIdx = '5fdce90b72b8b020b07ef768';

const runSurvey = async (survey) => {
  // Check if any survey is already running if running reject request
  // Check if survey is terminated; update survey to terminated and reject request
  const { session } = (await User.findById(userIdx));
  const client = new Client({
    puppeteer: { headless: true },
    session: JSON.parse(session),
    takeoverOnConflict: true,
    restartOnAuthFail: false,
  });
  client.on('qr', async (qr) => {
    // Save QrCode to database and emit qr-ready event on socket.io
    console.log('QR RECEIVED', qr);
    try {
      await client.destroy();
    } catch (_error) {
      //  C
    }
  });

  client.on('authenticated', (_session) => {
    console.log('AUTHENTICATED');
  });

  client.on('auth_failure', async (msg) => {
    // Fired if session restore was unsuccessfull
    // emit a 'unauthenticated' event
    console.error('AUTHENTICATION FAILURE', msg);
    try {
      await client.destroy();
    } catch (_error) {
      //  C
    }
  });

  client.on('ready', async () => {
    // Conduct survey for every participant

    // async check every 1 min if nto exist or terminated destroy
    const timer = setInterval(() => {
      Survey.findById(survey.id)
        .then(async (doc) => {
          if (!doc || doc.terminated || !doc.ready) {
            console.log('Survey Terminated or Deleted!');
            try {
              clearInterval(timer);
              await client.destroy();
            } catch (_error) {
              //  C
            }
          }
        })
        .catch((_err) => {
          // C
        });
    }, 60 * 1000);

    for (let i = 0; i < survey.participants.length; i += 1) {
      await conductSurvey(client, survey, survey.participants[i]);
    }
  });

  client.on('message', (message) => processMessages(message, client));

  client.on('disconnected', (reason) => {
    //  emit a 'disconnect' event on socket.io
    console.log('Client was logged out', reason);
  });

  console.log('starting survey');
  client.initialize();
};

const conductSurvey = async (client, survey, participant) => {
  // Get the participant path and continue from there
  try {
    let firstTime = false;
    let path = await Path.findOne({
      participant, survey: survey.id, terminated: false, optinState: { $ne: OptinStates.NO },
    });
    if (!path) {
      path = new Path(participant, survey.id);
      path = await path.save();
      firstTime = true;
    }
    const combination = firstTime
      ? [] : await Combination.findOne({ path: path.id }).sort({ createdAt: -1 }).exec();

    // Send Option message
    if (firstTime && survey.optIn && path.optinState === OptinStates.PENDING) {
      let question = survey.optinQuestion;
      question += `\n 1 - ${survey.optinYesText} \n 2 - ${survey.optinNoText}`;
      await client.sendMessage(formatParticipant(participant), question);
      return;
    }

    const nextNode = await getNextNode(
      firstTime || !combination, survey, combination,
    );

    if (nextNode) {
      await askQuestion(client, nextNode, participant);
      if (nextNode.questionType === QuestionTypes.MESSAGE) {
        //  We create the combination, save it and call conduct survey again
        const newCombination = new Combination(
          path.id, nextNode.id, null, null,
        );
        await newCombination.save();
        await conductSurvey(client, survey, participant);
      }
    } else {
      await Path.findByIdAndUpdate(path.id, { $set: { terminated: true } },
        { useFindAndModify: false });
      //  await client.sendMessage(formatParticipant(participant), survey.endMessage);
      //  await displayResult(path);
    }
  } catch (error) {
    console.log(error);
  }
};

const getNextNode = async (isFirst, survey, combination) => {
  if (isFirst) {
    try {
      const firstNode = await Node.findOne({ survey: survey.id }).sort({ createdAt: 1 });
      return firstNode;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  try {
    const currentNode = await Node.findById(combination.node);

    switch (currentNode.questionType) {
      case QuestionTypes.MESSAGE:
      case QuestionTypes.TEXTANWSER: {
        try {
          const nextNode = await Node.findById(currentNode.nextNode);
          return nextNode;
        } catch (error) {
          console.log(error);
          return false;
        }
      }

      case QuestionTypes.MULTIPLECHOICE: {
        try {
          const answer = await Answer.findById(combination.answer);
          const nextNode = await Node.findById(answer.nextNode);
          //  console.log(answer.text, currentNode.question, nextNode.question);
          return nextNode;
        } catch (error) {
          console.log(error);
          return false;
        }
      }

      default: {
        console.log('Invalid Question Type');
        return false;
      }
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

const askQuestion = async (client, node, participant) => {
  try {
    const formatedQuestion = await formatQuestion(node);
    await client.sendMessage(formatParticipant(participant), formatedQuestion);
  } catch (error) {
    console.log(error);
  }
};

const formatQuestion = async (node) => {
  let questionString = node.question;
  switch (node.questionType) {
    case QuestionTypes.MESSAGE:
    case QuestionTypes.TEXTANWSER: {
      return questionString.concat('\n');
    }
    case QuestionTypes.MULTIPLECHOICE: {
      const answers = await Answer.find({ node: node.id });
      for (let i = 0; i < answers.length; i += 1) {
        questionString += `\n${i + 1} - ${answers[i].text}`;
      }
      return questionString.concat('\n');
    }
    default:
      throw new Error('Invalid Question Type');
  }
};

const processMessages = async (message, client) => {
  try {
    if (!message.body || message.body === '') return;
    console.log('user sent a message');
    const chat = await message.getChat();
    if (chat.isGroup) return;

    const survey = await Survey.findOne({ terminated: false, ready: true });
    if (!survey) return;

    console.log('found survey');

    const path = await Path.findOne({
      survey: survey.id,
      participant: originalParticipant(message.from),
      terminated: false,
      optinState: { $ne: OptinStates.NO },
    });
    if (!path) return;

    console.log('found path');

    const combination = await Combination
      .findOne({ path: path.id }).sort({ createdAt: -1 }).exec();

    if (!combination && survey.optIn && path.optinState === OptinStates.PENDING) {
      console.log('pending path');
      const answer = parseInt(message.body, 10);
      console.log(answer);
      if (Number.isNaN(answer)) {
        await message.reply('Invalid Answer.');
        return;
      }
      if (answer === 1) {
        await Path.findByIdAndUpdate(path.id, { $set: { optinState: OptinStates.YES } },
          { useFindAndModify: false });
        await conductSurvey(client, survey, originalParticipant(message.from));
        return;
        //  await Path.findByIdAndUpdate(path.id, { $set: { optinState: OptinStates.YES } });
      } if (answer === 2) {
        await Path.findByIdAndUpdate(path.id, { $set: { optinState: OptinStates.NO } },
          { useFindAndModify: false });
        //  await message.reply('It\'s understood!');
        return;
      }
      await message.reply('Invalid Answer.');
      return;
    }

    const currentNode = await getNextNode(!combination, survey, combination);

    if (!currentNode) return;

    console.log('found current node');

    let userAnswer = message.body;

    if (currentNode.questionType === QuestionTypes.MULTIPLECHOICE) {
      userAnswer = parseInt(userAnswer, 10) - 1;
      if (Number.isNaN(userAnswer)) {
        await message.reply('Invalid Answer');
        return;
      }
      const answers = await Answer.find({ node: currentNode.id }).sort({ createdAt: 1 }).exec();
      if (userAnswer < 0 || userAnswer >= answers.length) {
        await message.reply('Invalid Answer.');
        return;
      }
      const newCombination = new Combination(
        path.id, currentNode.id, answers[userAnswer].id,
      );

      await newCombination.save();
      await conductSurvey(client, survey, originalParticipant(message.from));
    } else if (currentNode.questionType === QuestionTypes.TEXTANWSER) {
      const newCombination = new Combination(
        path.id, currentNode.id, null, userAnswer,
      );

      await newCombination.save();
      await conductSurvey(client, survey, originalParticipant(message.from));
    }
    // else if (currentNode.questionType === QuestionTypes.MESSAGE) {
    //   await conductSurvey(client, survey, originalParticipant(message.from));
    // }
  } catch (error) {
    console.log(error);
  }
};

// Emulation

const askQuestionE = async (socket, node, clientId) => {
  try {
    const formatedQuestion = await formatQuestion(node);
    socket.emit(`${clientId}.message`, formatedQuestion);
  } catch (error) {
    console.log(error);
  }
};

const getNextNodeE = async (isFirst, survey, epath) => {
  if (isFirst) {
    try {
      const firstNode = await Node.findOne({ survey: survey.id }).sort({ createdAt: 1 });
      return firstNode;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  try {
    const currentNode = await Node.findById(epath.currentNode);

    switch (currentNode.questionType) {
      case QuestionTypes.MESSAGE:
      case QuestionTypes.TEXTANWSER: {
        try {
          const nextNode = await Node.findById(currentNode.nextNode);
          return nextNode;
        } catch (error) {
          console.log(error);
          return false;
        }
      }

      case QuestionTypes.MULTIPLECHOICE: {
        try {
          const answer = await Answer.findById(epath.answer);
          const nextNode = await Node.findById(answer.nextNode);
          //  console.log(answer.text, currentNode.question, nextNode.question);
          return nextNode;
        } catch (error) {
          console.log(error);
          return false;
        }
      }

      default: {
        console.log('Invalid Question Type');
        return false;
      }
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

const conductSurveyE = async (socket, survey, clientId) => {
  // Get the participant path and continue from there
  try {
    if (typeof survey === 'string') {
      survey = await Survey.findById(survey);
    }

    let firstTime = false;
    let epath = await EPath.findOne({ clientId, survey: survey.id });
    if (!epath) {
      epath = new EPath(clientId, survey.id);
      epath = await epath.save();
      firstTime = true;
    }

    const nextNode = await getNextNodeE(
      firstTime || epath.currentNode === null, survey, epath,
    );

    if (nextNode) {
      await askQuestionE(socket, nextNode, clientId);
      if (firstTime) {
        socket.on(`${clientId}.message`, (data) => {
          console.log('message from client');
          processMessagesE(data, clientId, socket, survey.id);
        });
      }
      if (nextNode.questionType === QuestionTypes.MESSAGE) {
        //  We create the combination, save it and call conduct survey again
        await EPath.findByIdAndUpdate(epath.id, { $set: { currentNode: nextNode.id } },
          { useFindAndModify: false });

        await conductSurveyE(socket, survey, clientId);
      }
    } else {
      await EPath.findByIdAndDelete(epath.id);
    }
  } catch (error) {
    console.log(error);
  }
};

const processMessagesE = async (message, clientId, socket, surveyId) => {
  try {
    if (!message || message === '') return;

    const survey = await Survey.findById(surveyId);
    if (!survey) return;

    const epath = await EPath.findOne({
      survey: survey.id,
      clientId,
      terminated: false,
    });
    if (!epath) return;

    const currentNode = await getNextNodeE(
      epath.currentNode === null, survey, epath,
    );

    if (!currentNode) return;

    let userAnswer = message;

    if (currentNode.questionType === QuestionTypes.MULTIPLECHOICE) {
      userAnswer = parseInt(userAnswer, 10) - 1;
      if (Number.isNaN(userAnswer)) {
        socket.emit(`${clientId}.message`, 'Invalid Answer');
        return;
      }
      const answers = await Answer.find({ node: currentNode.id }).sort({ createdAt: 1 }).exec();
      if (userAnswer < 0 || userAnswer >= answers.length) {
        socket.emit(`${clientId}.message`, 'Invalid Answer');
        return;
      }

      await EPath.findByIdAndUpdate(epath.id,
        { $set: { currentNode: currentNode.id, answer: answers[userAnswer].id } },
        { useFindAndModify: false });

      await conductSurveyE(socket, survey, clientId);
    } else if (currentNode.questionType === QuestionTypes.TEXTANWSER) {
      await EPath.findByIdAndUpdate(epath.id,
        { $set: { currentNode: currentNode.id, answerText: userAnswer } },
        { useFindAndModify: false });

      await conductSurveyE(socket, survey, clientId);
    }
    // else if (currentNode.questionType === QuestionTypes.MESSAGE) {
    //   await conductSurvey(client, survey, originalParticipant(message.from));
    // }
  } catch (error) {
    console.log(error);
  }
};

// const displayResult = async (path) => {
//   try {
//     const combinations = await Combination.find({ path: path.id }).sort({ createdAt: 1 }).exec();
//     for (let i = 0; i < combinations.length; i += 1) {
//       const node = await Node.findById(combinations[i].node);
//       let answer;
//       if (node.questionType === QuestionTypes.MULTIPLECHOICE) {
//         answer = (await Answer.findById(combinations[i].answer)).text;
//       } else if (node.questionType === QuestionTypes.TEXTANWSER) {
//         answer = combinations[i].answerText;
//       }
//       console.log(`\n${node.question} : ${answer}`);
//     }
//   } catch (error) {
//     console.log(error);
//   }
// };

const login = async (qrcb, authcb, timeoutcb, userId = '5fdce90b72b8b020b07ef768') => {
  try {
    console.log('Login..');
    const user = await User.findById(userId);
    if ((user.session && user.session.length) || (!user)) {
      return;
    }
    console.log('user found!');
    const client = new Client({
      puppeteer: { headless: true },
      takeoverOnConflict: true,
      restartOnAuthFail: true,
    });
    let qrGenerated = false;
    client.on('qr', async (qr) => {
      QRCode.toDataURL(qr)
        .then(async (url) => {
          user.qrCode = url;
          await user.save();
          qrcb(url);
          // Emit Qr Event
        })
        .catch((err) => {
          console.error(err);
        });

      if (!qrGenerated) {
        qrGenerated = true;
        const timer = setTimeout(async () => {
          if (client) {
            try {
              user.qrCode = null;
              await user.save();
              timeoutcb();
              console.log('Client destroyed..');
              clearTimeout(timer);
            } catch (_error) {
              //  console.log(error);
            } finally {
              await client.destroy();
            }
          }
        }, 2 * 60 * 1000);
      }
    });

    client.on('authenticated', async (session) => {
      // Save session and emit a 'authenticated' event
      console.log('AUTHENTICATED');
      user.sessionState = SessionStates.CONNECTED;
      user.session = JSON.stringify(session);
      user.qrCode = null;
      try {
        await user.save();
        authcb();
      } catch (error) {
        console.log(error);
      }
    });
    client.on('ready', async () => {
      try {
        //  console.log(client.info);
        const profilePicUrl = await client.getProfilePicUrl(client.info.wid._serialized);
        await User.findByIdAndUpdate(userId, { $set: { profilePic: profilePicUrl } },
          { useFindAndModify: false });
        authcb(profilePicUrl);
        await client.destroy();
      } catch (error) {
        console.log(error);
      }
    });
    client.initialize();
  } catch (_error) {
    //  console.log(error);
    // Update user session to NOTCONNECTED
  }
};

// eslint-disable-next-line no-async-promise-executor
const healthcheck = async (userId = '5fdce90b72b8b020b07ef768') => new Promise(async (resolve, reject) => {
  try {
    console.log('Login..');
    const user = await User.findById(userId);
    if (user.session && user.session.length) {
      console.log('user found!');
      const client = new Client({
        puppeteer: { headless: true },
        takeoverOnConflict: true,
        session: JSON.parse(user.session),
      });

      client.on('auth_failure', (msg) => {
        console.log(msg);
        try {
          client.destroy();
        } catch (_error) {
          //  console.log(error);
        }
        reject();
      });

      const timer = setTimeout(async () => {
        if (client) {
          clearTimeout(timer);
          try {
            client.destroy();
          } catch (_error) {
            //  console.log(error);
          }
          reject();
        }
      }, 2 * 60 * 1000);

      client.on('authenticated', async (_session) => {
        if (client) {
          try {
            client.destroy();
          } catch (_error) {
            //  console.log(error);
          }
        }
        resolve(true);
      });

      client.initialize();
    } else reject();
  } catch (_error) {
    reject();
    //  console.log(error);
    // Update user session to NOTCONNECTED
  }
});

const formatParticipant = (participant) => participant.replace().replace(/ /g, '').replace(/(\+|\(|\)|\-)/g, '').concat('@c.us');
const originalParticipant = (participant) => '+'.concat(participant.split('@c.us')[0]);

module.exports.runSurvey = runSurvey;
module.exports.formatParticipant = formatParticipant;
module.exports.originalParticipant = originalParticipant;
module.exports.login = login;
module.exports.healthcheck = healthcheck;
module.exports.conductSurveyE = conductSurveyE;
