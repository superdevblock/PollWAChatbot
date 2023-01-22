const router = require('express').Router();

router.use(require('./combination'));
router.use(require('./path'));
router.use(require('./answer'));
router.use(require('./survey'));
router.use(require('./node'));
router.use(require('./user'));

module.exports = router;
