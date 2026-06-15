import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const API_KEY = "LVJ1BBL5ZGUINH83";

app.get("/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    console.log("Fetching:", symbol);

    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    );

    const data = await response.json();
    console.log("API Response:", data);

    res.json(data["Global Quote"]);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});