// import { container, Lifecycle } from "tsyringe";
// import { DependencyInjection as diServer, diCertificateEnrollmentService } from "@peculiar/acme-server";
// import { DependencyInjection as diData } from "@peculiar/acme-data-memory";
// import { Crypto } from "@peculiar/webcrypto";
// import { diControllers, Controllers } from "./controllers";
// import { PORT } from "./config/constants";
// import { CertificateEnrollmentService } from "./services";

// diServer.register(container, {
//   baseAddress: `http://localhost:${PORT}/acme/`,
//   cryptoProvider: new Crypto(),
//   hashAlgorithm: "SHA-1",
//   ordersPageSize: 2,
//   expireAuthorizationDays: 10,
//   downloadCertificateFormat: "PemCertificateChain",
//   debugMode: true,
//   levelLogger: "info",
// });

// diData.register(container);
// container
//   .register(diCertificateEnrollmentService, CertificateEnrollmentService, { lifecycle: Lifecycle.Singleton })
//   .register(diControllers, Controllers);
