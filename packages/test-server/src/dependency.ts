import { container } from "tsyringe";
import { DependencyInjection as diServer} from "@peculiar/acme-server";
import { DependencyInjection as diData } from "@peculiar/acme-data-memory";
import { Crypto } from "@peculiar/webcrypto";
import { diControllers, Controllers } from "./controllers";
import { PORT } from "./config/constants";

diServer.register(container, {
  baseAddress: `http://localhost:${PORT}/`,
  cryptoProvider: new Crypto(),
  hashAlgorithm: "SHA-1",
  ordersPageSize: 2,
  expireAuthorizationDays: 10,
  downloadCertificateFormat: "PemCertificateChain",
  debugMode: true,
});

diData.register(container)

container.register(diControllers, Controllers);