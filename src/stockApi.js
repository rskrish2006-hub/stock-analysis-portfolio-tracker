export async function getStockData(symbol) {
  try {
    const response = await fetch(
      `http://localhost:5000/stock/${symbol}`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}