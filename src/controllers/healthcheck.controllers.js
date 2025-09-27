import {ApiResponse} from "../utils/api-response.js"

const healthCheck = (req, res)  => {
    console.log("logic to connect with db");

    res.status(200).json(
        new ApiResponse(200, {message: "server is running"})
    )
};


export {healthCheck};
