require("dotenv").config();
const express = require("express");
const cors = require("cors");

const interviewRoutes = require("./routes/interview");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/interview", interviewRoutes);

/* ✅ IMPORTANT FIX FOR RENDER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});