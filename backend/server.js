//comment out below when uploading
require('dotenv').config()

const express = require('express');
const connectMongoDB = require("./database");
const cors = require('cors');

const app = express()

connectMongoDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:false}))

app.use("/api/polls", require("./routes/pollRoutes"))
app.use("/api/users", require("./routes/userRoutes"))

const port = process.env.PORT || 6000
app.listen(port, () => {console.log(`Server started on port ${port}`)})



  