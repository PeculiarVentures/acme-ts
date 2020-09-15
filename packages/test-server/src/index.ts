import express = require("express");
import { diLogger, ConsoleLogger } from "@peculiar/acme-core";
import { AcmeExpress } from "@peculiar/acme-express";
import { diCertificateEnrollmentService } from "@peculiar/acme-server";
import { container, Lifecycle } from "tsyringe";
import { CertificateEnrollmentService } from "./services";
import { DependencyInjection as diData} from "@peculiar/acme-data-dynamodb";

const app = express();

// before AcmeExpress because this logger need for logs in setup moment
container.register(diLogger, ConsoleLogger)

AcmeExpress.register(app, {baseAddress: "http://localhost:4000/acme", levelLogger: "info", debugMode: true});

container.register(diCertificateEnrollmentService, CertificateEnrollmentService, {lifecycle: Lifecycle.Singleton});
diData.register(container);

app.listen(4000, () => { console.log(`Server is running`); });