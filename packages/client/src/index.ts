import { CertificateRequest } from '@peculiar/acme-core';

function main () {
  const req = new CertificateRequest();
  req.test();
}

main();