import express = require("express");
import { PORT } from './config/constants';
import "./dependency";
import { routers } from "./routes";

const app = express();

app.use(express.json({ type: "application/jose+json" }));

app.use('/acme', routers);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});