import nodemailer from 'nodemailer';
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER_MAIL,
        pass: process.env.PASS
    }
});

export const checkAlerts = (tempC) => {
    const alertThreshold = 20; // Example threshold
    if (tempC > alertThreshold) {
        const mailOptions = {
            from: process.env.USER_MAIL,
            to:  process.env.TO_USER,
            subject: 'Weather Alert',
            text: `Alert! Temperature exceeds ${tempC}°C.`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
};