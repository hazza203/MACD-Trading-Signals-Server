const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const cors = require('cors')
const intervals = require('./intervals')

const app = express()
app.use(bodyParser.json())
app.use(cors())

app.get('/', (req, res) => {res.send('We are working')})

let coins = []
getData()
setTimeout(() => {
	initMacd()
},5000)

setInterval(() => {
	coins.forEach((coin) => {
		fetch(`https://api.binance.com/api/v1/ticker/24hr?symbol=${coin.symbol}`)
		.then(response => response.json())
		.then(data => {
			coins.price = parseFloat(data.lastPrice)
			coins.change = parseFloat(data.priceChangePercent)
	})
	})
	
},5000 + (60000 * 5))

app.listen(3000, () => {
	console.log(`Server is running on port ${process.env.PORT}`)
})

function getData(){
		fetch('https://api.binance.com/api/v1/exchangeInfo')
		.then(response => response.json())
		.then(data => {
				for(var coin in data.symbols){
					coins.push({
						symbol: data.symbols[coin].symbol,
						quoteAsset: data.symbols[coin].quoteAsset,
						price: 0,
						change: 0,
						intervals: intervals
					})
				}
		})
		.then(() => {
			var coinNum = 0
			coins.forEach((coin) => {
				if(coinNum === 0){

					fetch(`https://api.binance.com/api/v1/klines?interval=5m&symbol=${coin.symbol}&limit=312`)
					.then(response => response.json())
					.then(data => {
						let counter=120
						let m5=[] , m15=[] , m30=[] , h1=[]
						for(var kline of data){
							let price = kline[4]
							shouldAdd(5, counter, m5, price)
							shouldAdd(15, counter, m15, price)
							shouldAdd(30, counter, m30, price)
							shouldAdd(60, counter, h1, price)
							counter += 5;
						}
						coins[coinNum].intervals.m5.priceStamps = m5
						coins[coinNum].intervals.m15.priceStamps = m15
						coins[coinNum].intervals.m30.priceStamps = m30
						coins[coinNum].intervals.h1.priceStamps = h1
					})
					fetch(`https://api.binance.com/api/v1/klines?interval=2h&symbol=${coin.symbol}&limit=156`)
					.then(response => response.json())
					.then(data => {
						let counter=12
						let h2=[] , h4=[] , h6=[] , h12=[]
						for(var kline of data){
							let price = kline[4]
							shouldAdd(2, counter, h2, price)
							shouldAdd(4, counter, h4, price)
							shouldAdd(6, counter, h6, price)
							shouldAdd(12, counter, h12, price)
							counter += 2
						}
						coins[coinNum].intervals.h2.priceStamps= h2
						coins[coinNum].intervals.h4.priceStamps = h4
						coins[coinNum].intervals.h6.priceStamps = h6
						coins[coinNum].intervals.h12.priceStamps = h12
					})
					fetch(`https://api.binance.com/api/v1/klines?interval=1d&symbol=${coin.symbol}&limit=182`)
					.then(response => response.json())
					.then(data => {
						let counter=7
						let d1=[] , d3=[] , w1=[]
						for(var kline of data){
							let price = kline[4]
							shouldAdd(1, counter, d1, price)
							shouldAdd(3, counter, d3, price)
							shouldAdd(7, counter, w1, price)
							counter += 2
						}
						coins[coinNum].intervals.d1.priceStamps = d1
						coins[coinNum].intervals.d3.priceStamps = d3
						coins[coinNum].intervals.w1.priceStamps = w1
					})
					coinNum++
				}		
			})		
			
		})
		.catch(err => console.log(err))
	}

	function shouldAdd(interval, counter, arr, price){
		if(counter % interval === 0){
			arr.push(price)
			if(arr.length > 26){
				arr.shift()
			}
		}
		return arr
	}

	function initMacd(){
		let coinNum = 0;
		for(var coin of coins){

			if(coinNum === 0){
				for(var interval in coin.intervals){
					let total26=0.0, total12=0.0
					for(let i = 0; i < 26; i++){
						if(i > 13){
							total12 += parseFloat(coin.intervals[interval].priceStamps[i])
						}
						total26 += parseFloat(coin.intervals[interval].priceStamps[i])
					}

					let ema12 = total12 / 12;
	        let ema26 = total26 / 26;
	        let macd = ema12 - ema26
	        coin.intervals[interval].ema12 = ema12
	        coin.intervals[interval].ema26 = ema26
	        coin.intervals[interval].macd.push(macd)
	        delete coin.intervals[interval].priceStamps
	        console.log(coin)
				}
				coinNum++
			}
		}
	}