export * from "./extensions";
export * from "./asn_data";
export * from "./attribute";
export * from "./extension";
export * from "./pkcs10_cert_req";
export * from "./provider";
export * from "./public_key";
export * from "./name";
export * from "./types";
export * from "./x509_cert";

import * as asnX509 from "@peculiar/asn1-x509";
import * as extensions from "./extensions";

extensions.ExtensionFactory.register(asnX509.id_ce_basicConstraints, extensions.BasicConstraintsExtension);
extensions.ExtensionFactory.register(asnX509.id_ce_extKeyUsage, extensions.ExtendedKeyUsageExtension);
extensions.ExtensionFactory.register(asnX509.id_ce_keyUsage, extensions.KeyUsagesExtension);
extensions.ExtensionFactory.register(asnX509.id_ce_subjectKeyIdentifier, extensions.SubjectKeyIdentifierExtension);
