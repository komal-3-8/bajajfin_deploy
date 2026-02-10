import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const EMAIL = process.env.OFFICIAL_EMAIL;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

/* ---------- Utilities ---------- */

function fibonacci(n) {
  const res = [];
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    res.push(a);
    [a, b] = [b, a + b];
  }
  return res;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

/* ---------- Routes ---------- */

app.get("/health", (req, res) => {
  res.json({
    is_success: true,
    official_email: EMAIL
  });
});

app.post("/bfhl", async (req, res) => {
  const body = req.body;

  if (!body || Object.keys(body).length !== 1) {
    return res.status(400).json({
      is_success: false,
      error: "Exactly one key required"
    });
  }

  const key = Object.keys(body)[0];
  const value = body[key];

  try {
    let data;

    switch (key) {

      case "fibonacci":
        if (!Number.isInteger(value) || value < 0)
          throw new Error("Invalid fibonacci input");
        data = fibonacci(value);
        break;

      case "prime":
        if (!Array.isArray(value))
          throw new Error("Invalid prime input");
        data = value.filter(isPrime);
        break;

      case "lcm":
        if (!Array.isArray(value))
          throw new Error("Invalid lcm input");
        data = value.reduce((a, b) => lcm(a, b));
        break;

      case "hcf":
        if (!Array.isArray(value))
          throw new Error("Invalid hcf input");
        data = value.reduce((a, b) => gcd(a, b));
        break;

      case "AI":
        if (typeof value !== "string")
          throw new Error("Invalid AI input");

        // --- Gemini call (v1beta, gemini-pro fallback) ---
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: value }]
                }
              ]
            })
          }
        );

        if (!resp.ok) {
          // Graceful fallback — DO NOT CRASH
          data = "Unavailable";
          break;
        }

        const json = await resp.json();
        data = json.candidates?.[0]?.content?.parts?.[0]?.text
          ?.trim()
          ?.split(/\s+/)[0] || "Unavailable";
        break;

      default:
        throw new Error("Invalid key");
    }

    res.json({
      is_success: true,
      official_email: EMAIL,
      data
    });

  } catch (err) {
    res.status(400).json({
      is_success: false,
      error: err.message
    });
  }
});

/* ---------- Server ---------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
