import express = require("express");
import { PORT } from './config/constants';
import "./dependency";
import { AcmeExpress } from "./test_index";
import { container } from "tsyringe";
import { diLogger } from "@peculiar/acme-core";
import { ConsoleLogger } from "packages/core/src/logger/console_logger";
import { CertificateEnrollmentService } from "./services";
import { diCertificateEnrollmentService } from "@peculiar/acme-server";

const app = express();

container
  .register(diLogger, ConsoleLogger)
  .registerSingleton(diCertificateEnrollmentService, CertificateEnrollmentService);

AcmeExpress.register(app);

app.listen(PORT, () => {
  console.log(`Server is running`);
});