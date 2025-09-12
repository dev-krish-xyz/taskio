import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/dbconnect.js";

const PORT = process.env.PORT || 8000;
dotenv.config({
    path: "./.env"  // path
})

connectDB()
.then(()=> {
    app.listen(PORT, ()=> {
        console.log("Server is running on port", PORT);
    })
})
.catch(() =>{
    console.log("Mongodb connection error", error);
    process.exit(1);
})

