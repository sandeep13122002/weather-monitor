import mongoose from 'mongoose';

const weatherSchema = new mongoose.Schema({
    date: String,
    avgTemp: Number,
    maxTemp: Number,
    minTemp: Number,
    dominantCondition: String
});

const Weather = mongoose.model('Weather', weatherSchema);
export default Weather;