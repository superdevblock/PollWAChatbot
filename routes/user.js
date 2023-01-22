const router = require('express').Router();
const fs = require('fs');
const User = require('../models/User');
const SessionStates = require('../models/SessionStates');
const { login, healthcheck } = require('../utility/utility');

const userId = '5fdce90b72b8b020b07ef768';

router.get('/session', async (_req, res) => {
  try {
    const { qrCode, sessionState, profilePic } = (await User.findById(userId));
    res.status(200).json({
      qrCode, sessionState, profilePic,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An unexpected error occured!' });
  }
});

router.post('/logout', async (_req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set:
        {
          session: null, qrCode: null, sessionState: SessionStates.NOTCONNECTED, profilePic: null,
        },
      },
      { useFindAndModify: false, new: true },
    );
    if (user) res.status(200).json({});
    else res.status(400).json({ message: 'Action failed!' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An unexpected error occured!' });
  }
});

router.post('/login', async (req, res) => {
  try {
    res.status(200).json({});
    await login((qrcode) => req.io.emit('qrcode', qrcode), (profilePic) => req.io.emit('authenticated', profilePic), () => req.io.emit('timeout'));
  } catch (_error) {
    //  console.log(error);
    res.status(500).json({ message: 'An unexpected error occured!' });
  }
});

router.post('/healthcheck', async (_req, res) => {
  try {
    //  res.status(200).json({});
    const result = await healthcheck();
    if (result) {
      res.status(200).json({});
    } else res.status(500).json({ message: 'An unexpected error occured!' });
  } catch (_error) {
    //  console.log(error);
    res.status(500).json({ message: 'An unexpected error occured!' });
  }
});

// eslint-disable-next-line consistent-return
router.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  const { participants } = req.files;

  console.log(participants.mimetype);

  if (!['text/plain', 'text/csv', 'application/vnd.ms-excel'].includes(participants.mimetype)) {
    return res.status(400).send('Unsupported file type');
  }

  switch (participants.mimetype) {
    case 'application/vnd.ms-excel':
    case 'text/csv':
    case 'text/plain': {
      const { tempFilePath } = participants;
      fs.readFile(tempFilePath, 'utf8', (_err, data) => {
        console.log(data);
        data = data.trim().split('\n').filter((l) => l.trim() !== '').map((l) => l.trim().replace(/ /g, '').replace(/("|\(|\)|\-,)/g, ''));
        data = Array.from(new Set(data));
        return res.status(200).json(data);
      });
      break;
    }
    default:
      return res.status(400).send('Unsupported file type');
  }
});

module.exports = router;
