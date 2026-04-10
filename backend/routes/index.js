const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/students', require('./students'));
router.use('/alumni', require('./alumni'));
router.use('/match', require('./match'));
router.use('/mentorship', require('./mentorship'));
router.use('/referral', require('./referral'));
router.use('/chat', require('./chat'));
router.use('/chatbot', require('./chatbot'));
router.use('/admin', require('./admin'));

module.exports = router;
