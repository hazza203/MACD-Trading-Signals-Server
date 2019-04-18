const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const app = express()

app.use(bodyParser.json())
app.use(cors())
mongoose.connect(process.env.DATABASE_URL, {useNewUrlParser: true})
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to db'))

app.get('/', (req, res) => {res.send('We are working')})
/*
setInterval(() => {
	fetch('https://api.binance.com/api/v1/ticker/24hr?symbol=NEOBTC')
	.then(response => response.json())
	.then(data => {
		console.log(data)
	})
},10000)*/