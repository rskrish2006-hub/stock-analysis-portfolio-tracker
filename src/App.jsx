import { useEffect, useState } from "react";

function App() {
  const [symbol, setSymbol] = useState("");
  const [stock, setStock] = useState(null);
  const [news, setNews] = useState([]);
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [portfolio, setPortfolio] = useState([]);

  const API_KEY = "LVJ1BBL5ZGUINH83";

  useEffect(() => {
    const savedPortfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
    setPortfolio(savedPortfolio);
  }, []);

  useEffect(() => {
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  const searchStock = async () => {
    if (!symbol) {
      alert("Enter stock symbol");
      return;
    }

    try {
      const quoteResponse = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
      );

      const quoteData = await quoteResponse.json();

      if (quoteData["Note"]) {
        alert("API limit reached. Wait 1 minute and try again.");
        return;
      }

      if (!quoteData["Global Quote"] || !quoteData["Global Quote"]["01. symbol"]) {
        alert("No stock data found. Try IBM, MSFT, AAPL.");
        return;
      }

      setStock(quoteData["Global Quote"]);

      const newsResponse = await fetch(
        `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&limit=5&apikey=${API_KEY}`
      );

      const newsData = await newsResponse.json();
      setNews(newsData.feed ? newsData.feed.slice(0, 5) : []);
    } catch (error) {
      alert("Something went wrong.");
    }
  };

  const getSignal = () => {
    if (!stock) return "";

    const price = Number(stock["05. price"]);
    const high = Number(stock["03. high"]);
    const low = Number(stock["04. low"]);

    return price - low < high - price
      ? "🟢 Near Low - Possible Buy Zone"
      : "🔴 Near High - Be Careful / Possible Sell Zone";
  };

  const getNewsSentiment = () => {
    if (!news.length) return { score: 50, label: "Neutral" };

    const positiveWords = ["growth", "profit", "gain", "bullish", "strong", "beat", "record", "surge", "positive", "upgrade", "success"];
    const negativeWords = ["loss", "drop", "bearish", "weak", "decline", "downgrade", "fall", "negative", "risk", "crash", "debt"];

    let score = 50;

    news.forEach((article) => {
      const text = (article.title + " " + (article.summary || "")).toLowerCase();

      positiveWords.forEach((word) => {
        if (text.includes(word)) score += 5;
      });

      negativeWords.forEach((word) => {
        if (text.includes(word)) score -= 5;
      });
    });

    score = Math.max(0, Math.min(100, score));

    let label = "Neutral";
    if (score >= 70) label = "🟢 Positive";
    else if (score <= 40) label = "🔴 Negative";

    return { score, label };
  };

  const getAiScore = () => {
    if (!stock) return null;

    const price = Number(stock["05. price"]);
    const high = Number(stock["03. high"]);
    const low = Number(stock["04. low"]);
    const changePercent = Number(stock["10. change percent"]?.replace("%", ""));

    let score = 5;
    let reasons = [];

    if (price - low < high - price) {
      score += 2;
      reasons.push("Price is closer to day low, possible value zone.");
    } else {
      score -= 1;
      reasons.push("Price is closer to day high, buying risk is higher.");
    }

    if (changePercent > 0) {
      score += 1.5;
      reasons.push("Stock is showing positive movement today.");
    } else {
      score -= 1;
      reasons.push("Stock is weak today.");
    }

    if (news.length > 0) {
      score += 1;
      reasons.push("Recent news is available for this company.");
    }

    score = Math.max(1, Math.min(10, score));

    let recommendation = "HOLD";
    if (score >= 7) recommendation = "BUY";
    if (score <= 4) recommendation = "SELL / AVOID";

    return {
      score: score.toFixed(1),
      recommendation,
      reasons,
    };
  };

  const addToPortfolio = () => {
    if (!stock || !quantity || !buyPrice) {
      alert("Stock, quantity, and buy price required");
      return;
    }

    const currentPrice = Number(stock["05. price"]);
    const qty = Number(quantity);
    const boughtAt = Number(buyPrice);

    const item = {
      id: Date.now(),
      symbol: stock["01. symbol"],
      quantity: qty,
      buyPrice: boughtAt,
      currentPrice,
      investment: qty * boughtAt,
      currentValue: qty * currentPrice,
      profitLoss: qty * currentPrice - qty * boughtAt,
    };

    setPortfolio([...portfolio, item]);
    setQuantity("");
    setBuyPrice("");
  };

  const removeStock = (id) => {
    setPortfolio(portfolio.filter((item) => item.id !== id));
  };

  const totalInvestment = portfolio.reduce((sum, item) => sum + item.investment, 0);
  const totalCurrentValue = portfolio.reduce((sum, item) => sum + item.currentValue, 0);
  const totalProfitLoss = totalCurrentValue - totalInvestment;

  const getPortfolioRisk = () => {
    if (portfolio.length === 0 || totalInvestment === 0) {
      return {
        score: 0,
        level: "No Portfolio",
        color: "#ffffff",
        concentration: 0,
      };
    }

    const biggestHolding = Math.max(...portfolio.map((item) => item.investment));
    const concentration = (biggestHolding / totalInvestment) * 100;

    let score = 3;
    let level = "🟢 Low Risk";
    let color = "#22c55e";

    if (concentration > 70) {
      score = 9;
      level = "🔴 High Risk";
      color = "#ef4444";
    } else if (concentration > 50) {
      score = 7;
      level = "🟡 Medium Risk";
      color = "#facc15";
    } else if (concentration > 30) {
      score = 5;
      level = "🟡 Medium Risk";
      color = "#facc15";
    }

    return {
      score,
      level,
      color,
      concentration: concentration.toFixed(1),
    };
  };

  const ai = getAiScore();
  const sentiment = getNewsSentiment();
  const risk = getPortfolioRisk();

  return (
    <div style={pageStyle}>
      <h1>📈 Stock Predictor + AI Portfolio Analyzer</h1>

      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        placeholder="Enter stock symbol e.g. IBM"
        style={inputStyle}
      />

      <button onClick={searchStock} style={buttonStyle}>
        Search
      </button>

      {stock && stock["01. symbol"] && (
        <div style={cardStyle}>
          <h2>{stock["01. symbol"]}</h2>
          <p>Current Price: ${stock["05. price"]}</p>
          <p>Day High: ${stock["03. high"]}</p>
          <p>Day Low: ${stock["04. low"]}</p>
          <p>Change %: {stock["10. change percent"]}</p>
          <h3>{getSignal()}</h3>

          {ai && (
            <div style={aiBoxStyle}>
              <h2>🤖 AI Stock Score: {ai.score}/10</h2>
              <h3>Recommendation: {ai.recommendation}</h3>

              <hr />

              <h3>📰 News Sentiment Score: {sentiment.score}%</h3>
              <h3>Market Sentiment: {sentiment.label}</h3>

              {ai.reasons.map((reason, index) => (
                <p key={index}>• {reason}</p>
              ))}
            </div>
          )}

          <h3>Add to Portfolio</h3>

          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            type="number"
            style={inputStyle}
          />

          <input
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="Buy Price"
            type="number"
            style={inputStyle}
          />

          <button onClick={addToPortfolio} style={buttonStyle}>
            Add Stock
          </button>
        </div>
      )}

      {portfolio.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h2>💼 My Portfolio</h2>

          <div style={cardStyle}>
            <p>Total Investment: ${totalInvestment.toFixed(2)}</p>
            <p>Total Current Value: ${totalCurrentValue.toFixed(2)}</p>

            <h3 style={{ color: totalProfitLoss >= 0 ? "#22c55e" : "#ef4444" }}>
              Total P/L: ${totalProfitLoss.toFixed(2)}
            </h3>

            <div style={riskBoxStyle}>
              <h3 style={{ color: risk.color }}>
                🚨 Portfolio Risk Score: {risk.score}/10
              </h3>

              <h3 style={{ color: risk.color }}>{risk.level}</h3>

              <p>Largest Holding Concentration: {risk.concentration}%</p>
            </div>
          </div>

          {portfolio.map((item) => (
            <div key={item.id} style={cardStyle}>
              <h3>{item.symbol}</h3>
              <p>Quantity: {item.quantity}</p>
              <p>Buy Price: ${item.buyPrice}</p>
              <p>Current Price: ${item.currentPrice}</p>
              <p>Investment: ${item.investment.toFixed(2)}</p>
              <p>Current Value: ${item.currentValue.toFixed(2)}</p>

              <h3 style={{ color: item.profitLoss >= 0 ? "#22c55e" : "#ef4444" }}>
                P/L: ${item.profitLoss.toFixed(2)}
              </h3>

              <button onClick={() => removeStock(item.id)} style={removeButtonStyle}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {news.length > 0 && (
        <div style={{ marginTop: "30px", maxWidth: "800px" }}>
          <h2>📰 Latest News</h2>

          {news.map((item, index) => (
            <div key={index} style={cardStyle}>
              <h3>{item.title}</h3>
              <p>
                {item.summary
                  ? item.summary.slice(0, 220) + "..."
                  : "No summary available"}
              </p>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#38bdf8" }}
              >
                Read More
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0f172a",
  color: "white",
  padding: "40px",
  fontFamily: "Arial",
};

const inputStyle = {
  padding: "12px",
  width: "220px",
  borderRadius: "8px",
  border: "none",
  margin: "8px",
};

const buttonStyle = {
  padding: "12px 20px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  margin: "8px",
};

const removeButtonStyle = {
  ...buttonStyle,
  background: "#ef4444",
  color: "white",
};

const cardStyle = {
  marginTop: "20px",
  background: "#1e293b",
  padding: "22px",
  borderRadius: "14px",
  maxWidth: "650px",
};

const aiBoxStyle = {
  marginTop: "20px",
  background: "#020617",
  padding: "18px",
  borderRadius: "12px",
  border: "1px solid #38bdf8",
};

const riskBoxStyle = {
  marginTop: "20px",
  background: "#020617",
  padding: "15px",
  borderRadius: "10px",
  border: "1px solid #facc15",
};

export default App;