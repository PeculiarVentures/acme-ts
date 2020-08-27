import express = require("express");
import { PORT } from './config/constants';
import "./dependency";
import { AcmeExpress } from "./test_index";

const app = express();

AcmeExpress.register(app)

app.listen(PORT, () => {
  console.log(`Server is running`);
});