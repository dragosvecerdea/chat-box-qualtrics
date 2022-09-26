const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 8080

const app = express()
  .use(express.static(path.join(__dirname, '/client/build')))


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/client/build', 'index.html'));
});
  

app.get('/api/history/:roomId', (req, res) => {
  res.send(req.params)
})


app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
