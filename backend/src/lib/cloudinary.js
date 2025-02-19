import {v2 as cloudinary} from "cloudinary";

import {config} from 'dotenv';

config();

cloudinary.config({
    cloud_name: process.env.ClOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.ClOUDINARY_API_SECRET,

});

export default cloudinary;