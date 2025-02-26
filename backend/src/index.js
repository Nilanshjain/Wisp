
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cors from "cors";
import bodyParser from 'body-parser';
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/messageRoutes.js";




dotenv.config();

const app = express();


const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));  

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true}));



app.listen(PORT, () => {
    console.log("server is running on PORT:"+ PORT);
    connectDB();
});
