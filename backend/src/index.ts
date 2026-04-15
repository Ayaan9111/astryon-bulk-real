import express from "express";

const app = express();

const port = Number(process.env.PORT || 3000);

app.get("/", (req, res) => {
  res.send("Astryón backend running 🚀");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});