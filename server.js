import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import cron from 'node-cron';
import dotenv from "dotenv";
import Weather from './models/Weather.js';
import path from 'path';
import nodemailer from 'nodemailer';
import { checkAlerts, transporter } from './utility/checkAlerts.js';
const app = express();
// const PORT = 3000;
// const API_KEY = 'd4e570ef9230c405be68b9c6463734ba';
const CITIES = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];
dotenv.config();

mongoose.connect('mongodb+srv://sandeep:sandeep123@cluster0.8ygzm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

    app.set('view engine', 'ejs');
app.use(express.static(path.join(process.cwd(), 'public')));

const fetchWeatherData = async (city) => {
    const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city},IN&appid=${process.env.API_KEY}`);
   
    return response.data;
};

const kelvinToCelsius = (tempK) => tempK - 273.15;

let dailySummaries = {};

const updateDailySummary = (city, mainWeather, tempC, timestamp) => {
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    if (!dailySummaries[date]) {
        dailySummaries[date] = { temps: [], conditions: [] };
    }
    dailySummaries[date].temps.push(tempC);
    dailySummaries[date].conditions.push(mainWeather);
};

const calculateDailyAggregates = async () => {
    const aggregates = {};
    for (const [date, data] of Object.entries(dailySummaries)) {
        const avgTemp = (data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(2);
        const maxTemp = Math.max(...data.temps);
        const minTemp = Math.min(...data.temps);
        const dominantCondition = data.conditions.reduce((a, b) =>
            (data.conditions.filter(v => v === a).length > data.conditions.filter(v => v === b).length ? a : b)
        );

        aggregates[date] = { avgTemp, maxTemp, minTemp, dominantCondition };

        // Save to database
        await Weather.findOneAndUpdate(
            { date: date },
            aggregates[date],
            { upsert: true, new: true },
        );
    }
    return aggregates;
};

cron.schedule('*/1 * * * *', async () => {
    for (const city of CITIES) {
        try {
            const data = await fetchWeatherData(city);
            const mainWeather = data.weather[0].main;
            const tempC = kelvinToCelsius(data.main.temp);
            const timestamp = data.dt;
            checkAlerts(tempC);
            updateDailySummary(city, mainWeather, tempC, timestamp);
            console.log(data)
        } catch (error) {
            console.error(`Error fetching data for ${city}: ${error.message}`);
        }

    }
    
    await calculateDailyAggregates();
    console.log("running");
});

app.get('/', async (req, res) => {
    const aggregates = await Weather.find();
    res.render('index', { aggregates });
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
