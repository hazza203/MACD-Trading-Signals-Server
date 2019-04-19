const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const cors = require('cors')
const intervals = require('./intervals')

const app = express()
app.use(bodyParser.json())
app.use(cors())

let coins = []

app.get('/', (req, res) => {res.send(coins)})

getData()
setTimeout(() => {
	initMacd()
},5000)

setInterval(() => {
	coins.forEach((coin) => {
		fetch(`https://api.binance.com/api/v1/ticker/24hr?symbol=${coin.symbol}`)
		.then(response => response.json())
		.then(data => {
			coin.price = parseFloat(data.lastPrice)
			coin.change = parseFloat(data.priceChangePercent)
			calculateMacd(coin, coin.price)
		})
	})	
},30000)

app.listen(process.env.PORT||3000, () => {
	console.log(`Server is running on port ${(process.env.PORT || 3000)}`)
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
					coin.intervals.m5.priceStamps = m5
					coin.intervals.m15.priceStamps = m15
					coin.intervals.m30.priceStamps = m30
					coin.intervals.h1.priceStamps = h1

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
					coin.intervals.h2.priceStamps= h2
					coin.intervals.h4.priceStamps = h4
					coin.intervals.h6.priceStamps = h6
					coin.intervals.h12.priceStamps = h12

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
						counter += 1
					}
					coin.intervals.d1.priceStamps = d1
					coin.intervals.d3.priceStamps = d3
					coin.intervals.w1.priceStamps = w1

				})
			}
				coinNum++

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
	        
				}
				coinNum++
			}
		}
	}

	function calculateMacd(coin, price){
		for(var interval in coin.intervals){
			if(coin.symbol === "ETHBTC"){
				let ema12 = coin.intervals[interval].ema12
				let ema26 = coin.intervals[interval].ema26
				console.log(`${price} --- `)
				//Calculate new ema's
				ema12 = (price - ema12) * 0.1538 + ema12
	      ema26 = (price - ema26) * 0.07407 + ema26
	      //Calculate new macd
	      let macd = ema12 - ema26
	      
	      //Set ema's and add macd
	      coin.intervals[interval].ema12 = ema12
	      coin.intervals[interval].ema26 = ema26
	      coin.intervals[interval].macd.push(macd)

	      // Need at least 9 macd's to make a signal
	      if(coin.intervals[interval].macd.length > 9){

	      	//Keep array length at 9
	      	coin.intervals[interval].macd.shift()
					let macdArr = coin.intervals[interval].macd

					//If no signal created, first signal is a simple moving average
					if(coin.intervals[interval].signal.length === 0){

						let signal = 0
						macdArr.forEach((macd) => {
							signal += macd
						})
						signal = signal / 9
						coin.intervals[interval].signal.push(signal)

						//Otherwise continue with the ema calculation
					}	else {

						//Keeping signal array at length 9
						//This is not needed for calculation, only keeping for reference
						if(coin.intervals[interval].signal.length > 9){
							coin.intervals[interval].signal.shift()
						}

						//Get signal, calculate and push
						let signal = coin.intervals[interval].signal[coin.intervals[interval].signal.length - 1]
						signal = (macd - signal) * 0.2 + signal
						coin.intervals[interval].signal.push(signal)
						console.log(`Interval: ${interval} Signal: ${signal} --- MACD: ${macd}`)
						console.log(`EMA12: ${ema12} --- EMA26: ${ema26}`)
						console.log("\n")
					}
	      }
			}
		}		
	}