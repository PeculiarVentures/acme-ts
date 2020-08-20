import express = require("express");
import { PORT } from './config/constants';
import "./dependency";
import { directoryRouter } from "./routes";

const app = express();

app.use(express.json());

app.use('/directory', directoryRouter);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});