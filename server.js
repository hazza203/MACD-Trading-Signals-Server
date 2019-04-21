const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(bodyParser.json())
app.use(cors())

let coins = []

app.get('/', (req, res) => {res.send(coins)})
app.get('/btc', (req, res) => {
	btcCoins = []
	coins.forEach((coin) => {
		if(coin.quoteAsset === 'BTC'){
			btcCoins.push(coin)
		}
	})
	res.send(btcCoins)
})
app.get('/eth', (req, res) => {
	ethcoins = []
	coins.forEach((coin) => {
		if(coin.quoteAsset === 'ETH'){
			ethcoins.push(coin)
		}
	})
	res.send(ethcoins)
})
app.get('/usdt', (req, res) => {
	usdtCoins = []
	coins.forEach((coin) => {
		if(coin.quoteAsset === 'USDT'){
			usdtCoins.push(coin)
		}
	})
	res.send(usdtCoins)
})

app.listen(process.env.PORT||3000, () => {
	console.log(`Server is running on port ${(process.env.PORT || 3000)}`)
})

/*************************
					INIT
**************************/

getData()

/*************************
			Get new price
			every 5 mins
**************************/
let counter = 0
setTimeout(() => {
	setInterval(() => {
		counter += 5
		coins.forEach((coin) => {
			fetch(`https://api.binance.com/api/v1/ticker/24hr?symbol=${coin.symbol}`)
			.then(response => response.json())
			.then(data => {
				coin.price = parseFloat(data.lastPrice)
				coin.change = parseFloat(data.priceChangePercent)
				for(interval in coin.intervals){
					if(counter % coin.intervals[interval].modulo === 0){
						calculateMacd(coin, coin.price, interval)	
					}
				}
				

			})
			.catch(err => console.error(err))	
		})
		console.log('Prices obtained from Binance')
	},300000)
}, 300000)


/*************************
			DATA FUNCTIONS
**************************/

async function getData(){
	try {
		let response = await fetch('https://api.binance.com/api/v1/exchangeInfo')
		let data = await response.json()
		console.time('All coins initialized in')
		for(var coin in data.symbols){
			if(['BTC', 'ETH', 'USDT'].includes(data.symbols[coin].quoteAsset)){
					coins.push({
					symbol: data.symbols[coin].symbol,
					quoteAsset: data.symbols[coin].quoteAsset,
					price: 0,
					change: 0,
					intervals: {
						m5: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 5
						},
						m15: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 15
						},
						m30: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 30
						},
						h1: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 60
						},
						h2: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 120
						},
						h4: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 240
						},
						h6: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 360
						},
						h12: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 720
						},
						d1: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 1440
						},
						d3: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 4320
						},
						w1: {
							priceStamps: [],
							macd: [],
							signal: [],
							ema12: 0,
							ema26: 0,
							distance: 0,
							pctSignalChange: 0,
							vergence: false,
							vergeTime: 0,
							modulo: 10080
						}
					}
				})		
				await initPrice(coins[coins.length - 1])	
				console.log(`initialized ${data.symbols[coin].symbol}`)				
			}
		}
		console.timeEnd('All coins initialized in')
	} catch (err) {
		console.log(err)
	}
	
}

async function initPrice(coin){
	try{
		let response = await fetch(`https://api.binance.com/api/v1/klines?interval=5m&symbol=${coin.symbol}&limit=961`)
		let data = await response.json()
		let counter=60
		let m5=[] , m15=[] , m30=[] , h1=[]
		for(var kline of data){
			let price = kline[4]
			shouldAdd(coin, 'm5', 5, counter, m5, price)
			shouldAdd(coin, 'm15', 15, counter, m15, price)
			shouldAdd(coin, 'm30', 30, counter, m30, price)
			shouldAdd(coin, 'h1', 60, counter, h1, price)
			counter += 5;
		}

		let response1 = await fetch(`https://api.binance.com/api/v1/klines?interval=2h&symbol=${coin.symbol}&limit=997`)
		let data1 = await response1.json()
		counter=12
		let h2=[] , h4=[] , h6=[] , h12=[]
		for(var kline of data1){
			let price = kline[4]
			shouldAdd(coin, 'h2', 2, counter, h2, price)
			shouldAdd(coin, 'h4', 4, counter, h4, price)
			shouldAdd(coin, 'h6', 6, counter, h6, price)
			shouldAdd(coin, 'h12', 12, counter, h12, price)
			counter += 2
		}


		let response2 = await fetch(`https://api.binance.com/api/v1/klines?interval=1d&symbol=${coin.symbol}&limit=988`)
		let data2 = await response2.json()
		counter=7
		let d1=[] , d3=[] , w1=[]
		for(var kline of data2){
			let price = kline[4]
			shouldAdd(coin, 'd1', 1, counter, d1, price)
			shouldAdd(coin, 'd3', 3, counter, d3, price)
			shouldAdd(coin, 'w1', 7, counter, w1, price)
			counter += 1
		}
	} catch (err) {
		console.log(err)
	}
}

	function shouldAdd(coin, interval, modulo, counter, arr, price){
		if(counter % modulo === 0){
			arr.push(price)
			if(arr.length === 26){
				coin.intervals[interval].priceStamps = arr
				initMacd(coin, interval)
			} else if(arr.length > 26){
				calculateMacd(coin, price, interval)
			}
		}
	}

	function initMacd(coin, interval){
		let total26=0.0
		let total12=0.0

		if(typeof coin.intervals[interval].priceStamps === 'undefined'){
			console.log("Interval priceStamps is undefined: " + interval)
			console.log(coin)
			return
		}

		if(coin.intervals[interval].priceStamps.length < 26){
			console.log(`${coin.symbol} at interval: ${interval} is underlength`)
			console.log('Check if new addition')
			return
		}

		for(let i = 0; i < 26; i++){
			if(i > 13){
				total12 += parseFloat(coin.intervals[interval].priceStamps[i])
			}
			total26 += parseFloat(coin.intervals[interval].priceStamps[i])
		}

    let macd = (total12 / 12) - (total26 / 26)
    coin.intervals[interval].ema12 = total12 / 12
    coin.intervals[interval].ema26 = total26 / 26
    coin.intervals[interval].macd.push(macd)	      
   	delete coin.intervals[interval].priceStamps
			
	}

	function calculateMacd(coin, price, interval){
		if(coin.intervals[interval].macd === 0){
			initMacd(coin, interval)
			return
		}
		//As this is called every 5 mins, we only calculate the
		//MACD for the correct interval
		// e.g. 15 min candle gets added when the counter is 15
		//   			15 % 15 = 0
		// but not at the 20 min mark (20 % 15 == 5)
		

		let ema12 = coin.intervals[interval].ema12
		let ema26 = coin.intervals[interval].ema26
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
				let lastSignal = coin.intervals[interval].signal[coin.intervals[interval].signal.length - 1]
				let signal = (macd - lastSignal) * 0.2 + lastSignal
				coin.intervals[interval].signal.push(signal)

				//Checking for convergence / divergence 
				//calculating signals distance from macd
				if(coin.intervals[interval].distance > 0){
					if(signal <= macd){
						coin.intervals[interval].vergence = true
					}
				} else if(coin.intervals[interval].distance < 0){
					if(signal >= macd){
						coin.intervals[interval].vergence = true
					}
				}
				coin.intervals[interval].distance = signal - macd
				
				if(coin.intervals[interval].vergence === true){
					coin.intervals[interval].vergeTime++
					if(coin.intervals[interval].vergeTime >= 3){
						coin.intervals[interval].vergence = false
						coin.intervals[interval].vergeTime = 0
					}
				}

				coin.intervals[interval].pctSignalChange = (signal - lastSignal / lastSignal) * 100
			}
		}	
	}