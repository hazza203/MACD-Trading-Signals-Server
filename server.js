/********************************************

				Created by Harry Parkinson
				harry.m.parkinson@gmail.com

*********************************************/

const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(bodyParser.json())
app.use(cors())

//The almighty hodl bag
let coins = []

//Get all coin pairs
app.get('/', (req, res) => {res.json(coins)})

//Get all BTC coin pairs
app.get('/btc', (req, res) => {
	btcCoins = []
	coins.forEach((coin) => {
		if(coin.quoteAsset === 'BTC'){
			btcCoins.push(coin)
		}
	})
	res.json(btcCoins)
})

//Get all ETH coin pairs
app.get('/eth', (req, res) => {
	ethcoins = []
	coins.forEach((coin) => {
		if(coin.quoteAsset === 'ETH'){
			ethcoins.push(coin)
		}
	})
	res.json(ethcoins)
})

//Get all USDT coin pairs
app.get('/usdt', (req, res) => {
	usdtCoins = []
	coins.forEach((coin) => {
		if(coin.quoteAsset === 'USDT'){
			usdtCoins.push(coin)
		}
	})
	res.json(usdtCoins)
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

//This variable is used with modulus to check if the price update needs to be added to the kline
let counter = 0
setTimeout(() => {
	setInterval(() => {
		counter += 5
		coins.forEach((coin, i) => {
			fetch(`https://api.binance.com/api/v1/ticker/24hr?symbol=${coin.symbol}`)
			.then(response => response.json())
			.then(data => {
				if(data.weightedAvgPrice === '0'){
					coins.splice(i, 1)
				} else {
					coin.price = parseFloat(data.lastPrice)
					coin.change = parseFloat(data.priceChangePercent)
					for(period in coin.periods){
						//Check if time period needs updating 
						if(counter % coin.periods[period].modulo === 0){
							calculateMacd(coin, coin.price, period)	
						}
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
		//Time this, it is a very costly procedure
		console.time('All coins initialized in')
		for(var coin in data.symbols){
			//Only get BTC, ETH, USDT pairs
			if(['BTC', 'ETH', 'USDT'].includes(data.symbols[coin].quoteAsset)){
					coins.push({
					symbol: data.symbols[coin].symbol,
					quoteAsset: data.symbols[coin].quoteAsset,
					price: 0,
					change: 0,
					//Very big nested object
					periods: {
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
			}
		}
		console.timeEnd('All coins initialized in')
		console.log(`Coins added: ${coins.length}`)
	} catch (err) {
		console.log(err)
	}
	
}

/****************************************************************************************************************

Here we needed to split the fetches into three different parts as there is a limit of a size 1000 array returned
As we need to have enough data for the 5m and the weekly candles we couldn't fit this into 1 request.
Process is: fetch -> loop through price history -> add each price if needed (every 5 min gets added, every 3rd
5 min gets added to the 15m ect ect) and calc macd -> next fetch

*****************************************************************************************************************/
async function initPrice(coin){
	try{
		let response = await fetch(`https://api.binance.com/api/v1/klines?interval=5m&symbol=${coin.symbol}&limit=961`)
		let data = await response.json()
		//Counter is used with modulus to assert price should be added to each candle
		// e.g ---- 30 mod 60 is 30 ---- 5 mod 30 is 0 ---- 30 mod 30 is 0
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

	/*
		Uses modulus to assert if price should be added
		Inits Macd if length == 26
		Calcs Macd from then on
	*/
	function shouldAdd(coin, period, modulo, counter, arr, price){
		if(counter % modulo === 0){
			arr.push(price)
			if(arr.length === 26){
				coin.periods[period].priceStamps = arr
				initMacd(coin, period)
			} else if(arr.length > 26){
				calculateMacd(coin, price, period)
			}
		}
	}

	/*
		Initializes the MACD (moving average convergence divergence).

		The first MACD is a 12SMA - 26SMA (Smooth moving average), so we 
		need 26 prices to begin. We add this to the EMA (expotential)
		as from here on out we will use EMA calculation, (just need the)
		SMA to start.
	*/
	function initMacd(coin, period){
		let total26=0.0
		let total12=0.0

		//Assert prices exist and we have 26 for this period

		if(typeof coin.periods[period].priceStamps === 'undefined'){
			console.log("period priceStamps is undefined: " + period)
			console.log(coin)
			return
		}

		if(coin.periods[period].priceStamps.length < 26){
			console.log(`${coin.symbol} at period: ${period} is underlength`)
			console.log('Check if new addition')
			return
		}

		//Create 26 period and 12 period totals
		for(let i = 0; i < 26; i++){
			if(i > 13){
				total12 += parseFloat(coin.periods[period].priceStamps[i])
			}
			total26 += parseFloat(coin.periods[period].priceStamps[i])
		}

		//Macd is SMA 12 - SMA 26
		//Store SMA's and MACD
    let macd = (total12 / 12) - (total26 / 26)
    coin.periods[period].ema12 = total12 / 12
    coin.periods[period].ema26 = total26 / 26
    coin.periods[period].macd.push(macd)	  
    //Not needed anymore, delete for javascript garbage collection    
   	delete coin.periods[period].priceStamps
			
	}

	/*

	Main MACD calculation which calculates a 9 period EMA called the signal line
	This is the line we use to detect if the MACD line has crossed over the signal 

	*/

	function calculateMacd(coin, price, period){
		//If MACD isn't initialized yet, we initialize it 
		//(still may not have enough data but that is handled in the init function)
		if(coin.periods[period].macd === 0){
			initMacd(coin, period)
			return
		}
		//As this is called every 5 mins, we only calculate the
		//MACD for the correct period
		// e.g. 15 min candle gets added when the counter is 15
		//   			15 % 15 = 0
		// but not at the 20 min mark (20 % 15 == 5)
		

		let ema12 = coin.periods[period].ema12
		let ema26 = coin.periods[period].ema26
		//Calculate new ema's
		ema12 = (price - ema12) * 0.1538 + ema12
    ema26 = (price - ema26) * 0.07407 + ema26
    //Calculate new macd
    let macd = ema12 - ema26
    
    //Set ema's and add macd
    coin.periods[period].ema12 = ema12
    coin.periods[period].ema26 = ema26
    coin.periods[period].macd.push(macd)

    // Need at least 9 macd's to make a signal
    if(coin.periods[period].macd.length > 9){

    	//Keep array length at 9
    	coin.periods[period].macd.shift()
			let macdArr = coin.periods[period].macd

			//If no signal created, first signal is a simple moving average
			if(coin.periods[period].signal.length === 0){

				let signal = 0
				macdArr.forEach((macd) => {
					signal += macd
				})
				signal = signal / 9
				coin.periods[period].signal.push(signal)

				//Otherwise continue with the ema calculation
			}	else {

				//Keeping signal array at length 9
				//This is not needed for calculation, only keeping for reference
				if(coin.periods[period].signal.length > 9){
					coin.periods[period].signal.shift()
				}

				//Get signal, calculate and push
				let lastSignal = coin.periods[period].signal[coin.periods[period].signal.length - 1]
				let signal = (macd - lastSignal) * 0.2 + lastSignal
				coin.periods[period].signal.push(signal)

				//Checking for convergence / divergence 
				if(coin.periods[period].distance > 0){
					if(signal <= macd){
						coin.periods[period].vergence = true
					}
				} else if(coin.periods[period].distance < 0){
					if(signal >= macd){
						coin.periods[period].vergence = true
					}
				}

				//calculating signals distance from macd
				let distance = ((macd - signal)/ signal) * 100
				if(macd < 0 && signal < 0){
					distance = distance * -1
				}
				
				coin.periods[period].distance = distance
				//Only flag vergance for 3 periods then reset it
				if(coin.periods[period].vergence === true){
					coin.periods[period].vergeTime++
					if(coin.periods[period].vergeTime > 3){
						coin.periods[period].vergence = false
						coin.periods[period].vergeTime = 0
					}
				}

				//Calculate how much the signal has changed since the last signal
				let lastMacd = coin.periods[period].macd[coin.periods[period].macd.length - 2]
				let pctSignalChange = ((macd - lastMacd) / lastMacd) * 100
				if(lastMacd < 0 && macd < 0){
					pctSignalChange = pctSignalChange * -1
				}
				coin.periods[period].pctSignalChange = pctSignalChange
			}
		}	
	}