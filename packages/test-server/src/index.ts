import express = require("express");
import { AcmeExpress } from "./test_index";
import { container, Lifecycle } from "tsyringe";
import { diLogger } from "@peculiar/acme-core";
import { ConsoleLogger } from "packages/core/src/logger/console_logger";
import { CertificateEnrollmentService } from "./services";
import { diCertificateEnrollmentService } from "@peculiar/acme-server";

const app = express();

// before AcmeExpress because this logger need for logs in setup moment
container.register(diLogger, ConsoleLogger)

AcmeExpress.register(app, {baseAddress: "http://localhost:4000/acme", levelLogger: "info", debugMode: true});

// after AcmeExpress because need first register base class
container.register(diCertificateEnrollmentService, CertificateEnrollmentService, {lifecycle: Lifecycle.Singleton});

app.listen(4000, () => { console.log(`Server is running`); });