# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 1.1.0 (2020-09-23)


### Bug Fixes

* **all:** Debugging and fixing ([2e9cd8d](https://github.com/PeculiarVentures/acme-ts/commit/2e9cd8d1b16aa379a9a772ec4b7e4835da1c37b8))
* **all:** dependencies in package.json ([64d9d4b](https://github.com/PeculiarVentures/acme-ts/commit/64d9d4b220c1601d493d08fbd1517fe0c658962a))
* **all:** remove old links ([d51b3c1](https://github.com/PeculiarVentures/acme-ts/commit/d51b3c1914ada1accf67c662ee2d89c94d9d4b5b))
* **core:** fixed lint in helpers ([cd17812](https://github.com/PeculiarVentures/acme-ts/commit/cd17812ce5d49b167d422f6abf1be53759f834c9))
* **core:** Fixed status code fore errors ([97da26b](https://github.com/PeculiarVentures/acme-ts/commit/97da26b8b51b395831fa6946e3290f4546fa540f))
* **core:** level logger ([71b69e1](https://github.com/PeculiarVentures/acme-ts/commit/71b69e134a8446042548cf6a2522ea1e290a2307))
* **core, data:** small fix ([a5a2686](https://github.com/PeculiarVentures/acme-ts/commit/a5a2686d0093e7923a8775358732d3b013c8ea37))
* **crypto:** CSR wrong id for Extensions ([768016f](https://github.com/PeculiarVentures/acme-ts/commit/768016f6d59ddd19a6edaaf2cc1eba7da53d4b89))
* **crypto:** Set certificate version in X509CertificateGenerator ([b6e3d1c](https://github.com/PeculiarVentures/acme-ts/commit/b6e3d1c62908552d464de06d7aeff9c7d002f79a))
* **crypto:** Use IA5String for E and DC attributes ([261f90b](https://github.com/PeculiarVentures/acme-ts/commit/261f90b8ec5ba27e3cdb8454e6b371036ff2e3b0))
* **jwa:** Wrong algorithm name ([4a5f52c](https://github.com/PeculiarVentures/acme-ts/commit/4a5f52cee676976263714200b3c7405b688906df))
* **server:** fix cryptoProvider ([a26b911](https://github.com/PeculiarVentures/acme-ts/commit/a26b911babd8f6439043e5f93097be6917dcf610))
* **server:** validateContacts ([1f8caa8](https://github.com/PeculiarVentures/acme-ts/commit/1f8caa8dc36a3435995ce8a390c83e3c8e44def8))
* **test-server:** order launch ([c792b40](https://github.com/PeculiarVentures/acme-ts/commit/c792b407ccbc20e46a6f46dcca54876904f236d7))


### Features

* **client:** Added client ([76737a5](https://github.com/PeculiarVentures/acme-ts/commit/76737a5c2305659777452c238e73b202005da199))
* **core:** Add x509 cert ([8ff3952](https://github.com/PeculiarVentures/acme-ts/commit/8ff39527ad480c62947df49a77009887ac0cdd22))
* **core:** added attribute enum ([2e3a25c](https://github.com/PeculiarVentures/acme-ts/commit/2e3a25c160a529b82c8df546c794f9b4cb01aaf2))
* **core:** added enums ([9f57956](https://github.com/PeculiarVentures/acme-ts/commit/9f57956fdb4c0912ee65677d08077f7e61ec49bc))
* **core:** added enums ([c0cb817](https://github.com/PeculiarVentures/acme-ts/commit/c0cb817038add86bff77aa59c032365611fdcd4a))
* **core:** Added logger ([25a977c](https://github.com/PeculiarVentures/acme-ts/commit/25a977cea9d794dad7b073c4bc19f9cbac67097b))
* **core:** Added undefined for lvl log ([3e1d102](https://github.com/PeculiarVentures/acme-ts/commit/3e1d10259b96966176ed12eabc35e7fe58daa182))
* **core, server:** Added subproblems ([1ccfab7](https://github.com/PeculiarVentures/acme-ts/commit/1ccfab7dc2c71e3e4413264c5c881e0c122d62fe))
* **crypto:** Add Pkcs10CertificateRequestGenerator ([c51359a](https://github.com/PeculiarVentures/acme-ts/commit/c51359a814804e11381e2465bc2b2ddaadab5383))
* **crypto:** Add x509 chain builder ([0af80eb](https://github.com/PeculiarVentures/acme-ts/commit/0af80eb05c5d4141d050eb84c980394bed4a2f47))
* **crypto:** Add X509CertificateGenerator class ([79f4630](https://github.com/PeculiarVentures/acme-ts/commit/79f46300fa1492d7af59648f94aebceac0e8cfcf))
* **crypto:** add X509Certificates ([e761c19](https://github.com/PeculiarVentures/acme-ts/commit/e761c195de88db993e444bbb5edf1f0139784a09))
* **crypto:** Implemnt Name parser ([386e866](https://github.com/PeculiarVentures/acme-ts/commit/386e86662b77e8eb7fa069845a110ea3c6694c6d))
* **crypto:** Support attributes and extensions ([c05ddee](https://github.com/PeculiarVentures/acme-ts/commit/c05ddeea0d2a9b532bbddfbc8d6f51f8f27a60c1))
* **crypto:** Use DI for ASN<->Crypto conversions ([b1afcc8](https://github.com/PeculiarVentures/acme-ts/commit/b1afcc88960657a765ac0ce8f28a32d4e368b4b3))
* **data:** added models and repository for memory ([e64eb2b](https://github.com/PeculiarVentures/acme-ts/commit/e64eb2b68e822c21152a86a9575da4528e341955))
* **jws:** Add toString and parse methods ([0a0f8e9](https://github.com/PeculiarVentures/acme-ts/commit/0a0f8e9bfffc4978fb96ace1b164ebf3139a477c))
* **server:** Added csrValidate to challengeService ([b5284ee](https://github.com/PeculiarVentures/acme-ts/commit/b5284eedd15f2c12d87058d21889fc5916b7f560))
* **server:** extended challenge service ([68357a5](https://github.com/PeculiarVentures/acme-ts/commit/68357a5df510966ebe77df74d51ff1599063a897))
* **test-server:** Added controllers ([3b37f76](https://github.com/PeculiarVentures/acme-ts/commit/3b37f765f349cbbec16877d58182840f7bb2e5d9))
* DI for account services ([c944ee0](https://github.com/PeculiarVentures/acme-ts/commit/c944ee0236347486fa13b0a09f7769c47d1a04c0))
* **tests:** added tests for account ([8cfbebb](https://github.com/PeculiarVentures/acme-ts/commit/8cfbebb05e062b6af42e9a22478e698201d718b9))
* **web:** Add Request and Response ([05cfd24](https://github.com/PeculiarVentures/acme-ts/commit/05cfd2469b61cca229e4b3863e73b1f28c210b3d))
* Add crypto provider ([57c2754](https://github.com/PeculiarVentures/acme-ts/commit/57c275489bd62ca2c4d20abc4b7e47be6d07e66b))
* Add Pkcs10CertificateRequest ([e1a9d9b](https://github.com/PeculiarVentures/acme-ts/commit/e1a9d9bd0476ed6c448f4d2cfff6df2ca791e90b))
* **jose:** Add JWS and JWA ([02f6612](https://github.com/PeculiarVentures/acme-ts/commit/02f661243a806404bf8bca71aeff97a4b64ce002))
* **packages:** Create structure ([b445b37](https://github.com/PeculiarVentures/acme-ts/commit/b445b372df26e256d6302b4c73b4a0617c29f739))
* **tests:** added tests for pem_converter ([804bcfc](https://github.com/PeculiarVentures/acme-ts/commit/804bcfcf8170f79de72196e6400b6dc6de6475d6))
