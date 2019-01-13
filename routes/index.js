const express = require("express");
const router = express.Router();

// Do work here
router.get("/", (req, res) => {
  const shock = { name: "Shock", age: 1080, cool: false };
  // res.send('Hey! It works!');
  // res.json(shock);
  // res.send(req.query.name);
  // res.json(req.query);
  res.render('hello', {
    name: 'Shock',
    dog: 'up'
  });
});

router.get('/reverse/:name', (req, res) => {
  res.send(req.params.name);
});

module.exports = router;
